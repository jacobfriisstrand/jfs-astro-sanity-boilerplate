#!/usr/bin/env node

import { execSync, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { confirm, input, select } from "@inquirer/prompts";

const ENV_PATH = join(process.cwd(), ".env");

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanityCliAvailable(): boolean {
  try {
    execSync("npx sanity --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function ghCliAvailable(): boolean {
  try {
    execSync("gh --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isLoggedIn(): boolean {
  try {
    const result = spawnSync("npx", ["sanity", "debug", "--secrets"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return result.stdout.includes("User:");
  } catch {
    return false;
  }
}

function writeEnvFile(vars: Record<string, string>) {
  const lines = [
    "# Sanity CMS Configuration",
    `PUBLIC_SANITY_PROJECT_ID=${vars.projectId}`,
    `PUBLIC_SANITY_DATASET=${vars.dataset}`,
    `SANITY_API_READ_TOKEN=${vars.readToken}`,
    "PUBLIC_SANITY_VISUAL_EDITING_ENABLED=false",
    `PUBLIC_SANITY_STUDIO_ROUTE=${vars.studioRoute}`,
    "",
    "# Mux Video (credentials entered via Sanity Studio plugin UI)",
    "# These are optional — only needed if using the Mux Node SDK directly",
    `# MUX_TOKEN_ID=${vars.muxTokenId || "your-mux-token-id"}`,
    `# MUX_TOKEN_SECRET=${vars.muxTokenSecret || "your-mux-token-secret"}`,
  ];

  // Uncomment Mux lines if values provided
  if (vars.muxTokenId && vars.muxTokenSecret) {
    lines[8] = `MUX_TOKEN_ID=${vars.muxTokenId}`;
    lines[9] = `MUX_TOKEN_SECRET=${vars.muxTokenSecret}`;
  }

  writeFileSync(ENV_PATH, `${lines.join("\n")}\n`);
}

// ── Sanity CLI Setup ─────────────────────────────────────────────────────────

interface SanityOrganization {
  id: string;
  name: string;
}

// ESC is built via String.fromCharCode so the literal contains no control
// characters (biome's noControlCharactersInRegex).
const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "gu");

// `sanity organizations create` prints `ID: <id>` on success (no --json flag).
const ORG_ID_RE = /ID:\s*(?<id>\S+)/u;

// `sanity organizations list` has no --json flag, so parse the table output.
function listSanityOrganizations(): {
  error?: string;
  orgs: SanityOrganization[];
} {
  const result = spawnSync("npx", ["sanity", "organizations", "list"], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    return { error: (result.stderr || result.stdout).trim(), orgs: [] };
  }
  const orgs: SanityOrganization[] = [];
  for (const line of result.stdout.split("\n")) {
    if (!line.startsWith("│")) {
      continue;
    }
    const clean = line.replace(ANSI_RE, "");
    const [, id, name] = clean.split("│").map((c) => c.trim());
    if (!id || id === "ID") {
      continue;
    }
    orgs.push({ id, name: name || id });
  }
  return { orgs };
}

const CREATE_ORG_CHOICE = "__create-new-organization__";

function promptForOrganizationName(): Promise<string> {
  return input({
    message: "Organization name:",
    validate: (v) => (v.trim() ? true : "Organization name is required"),
  });
}

function createSanityOrganization(name: string): string {
  console.log(`\nCreating organization "${name}"...`);
  const result = spawnSync(
    "npx",
    ["sanity", "organizations", "create", "--name", name],
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
  );
  if (result.status !== 0) {
    console.error(
      `Failed to create organization: ${result.stderr.trim() || result.stdout.trim()}`
    );
    console.error(
      "Create one at https://www.sanity.io/manage, then re-run setup."
    );
    process.exit(1);
  }
  const id = ORG_ID_RE.exec(result.stdout)?.groups?.id;
  if (!id) {
    console.error(
      "Could not parse organization ID from:",
      result.stdout.trim()
    );
    process.exit(1);
  }
  console.log(`✓ Created organization: ${name} (${id})`);
  return id;
}

async function pickSanityOrganization(): Promise<string> {
  const { error, orgs } = listSanityOrganizations();

  if (error) {
    console.error(`Could not list Sanity organizations: ${error}`);
    console.error(
      "Create an organization at https://www.sanity.io/manage, then re-run setup."
    );
    process.exit(1);
  }

  if (orgs.length === 0) {
    const create = await confirm({
      default: true,
      message: "No organizations found. Create one via the CLI?",
    });
    if (!create) {
      console.error(
        "Create an organization at https://www.sanity.io/manage, then re-run setup."
      );
      process.exit(1);
    }
    return createSanityOrganization(await promptForOrganizationName());
  }

  if (orgs.length === 1) {
    return orgs[0].id;
  }

  const choice = await select({
    choices: [
      ...orgs.map((o) => ({ name: `${o.name} (${o.id})`, value: o.id })),
      {
        name: "Create a new organization via the CLI...",
        value: CREATE_ORG_CHOICE,
      },
    ],
    message: "Which organization should the project be created in?",
  });

  if (choice === CREATE_ORG_CHOICE) {
    return createSanityOrganization(await promptForOrganizationName());
  }

  return choice;
}

// The CLI's --json flag implies unattended mode; it refuses to auto-pick
// between organizations and prints the real error as JSON on stdout (the
// spinner only goes to stderr).
function parseCliErrorJson(stdout: string): string | undefined {
  try {
    const parsed = JSON.parse(stdout.trim()) as {
      error?: { message?: string };
    };
    const message = parsed.error?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  } catch {
    // Not JSON output
  }
  return undefined;
}

function runCreateProject(projectName: string, organizationId?: string) {
  const args = ["sanity", "projects", "create", projectName, "--json"];
  if (organizationId) {
    args.push("--organization", organizationId);
  }
  return spawnSync("npx", args, {
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "pipe"],
  });
}

interface SanityCredentials {
  dataset: string;
  projectId: string;
  readToken: string;
}

function createDatasets(projectId: string) {
  const datasets = ["production", "development"];
  for (const dataset of datasets) {
    console.log(`Creating dataset "${dataset}"...`);
    const result = spawnSync(
      "npx",
      [
        "sanity",
        "datasets",
        "create",
        dataset,
        "--visibility",
        "public",
        "-p",
        projectId,
      ],
      { encoding: "utf-8", stdio: "inherit" }
    );

    if (result.status === 0) {
      console.log(`✓ Created dataset: ${dataset}`);
    } else {
      console.error(
        `Failed to create dataset "${dataset}". You may need to create it manually.`
      );
    }
  }
}

async function setupWithSanityCli(): Promise<SanityCredentials> {
  // Ensure logged in
  if (!isLoggedIn()) {
    console.log("\nYou need to log in to Sanity first.\n");
    spawnSync("npx", ["sanity", "login"], { stdio: "inherit" });
  }

  const projectName = await input({
    message: "Sanity project name:",
    validate: (v) => (v.trim() ? true : "Project name is required"),
  });

  // Create project with JSON output
  console.log("\nCreating Sanity project...");
  let createResult = runCreateProject(projectName);

  if (createResult.status !== 0) {
    const errorMessage = parseCliErrorJson(createResult.stdout);

    if (
      errorMessage?.includes("Multiple organizations are available") ||
      errorMessage?.includes("No organizations are available")
    ) {
      // Unattended mode refuses to auto-pick between organizations and errors
      // out with none; let the user pick or create one via the CLI and retry.
      const organizationId = await pickSanityOrganization();
      console.log(`\nRetrying with organization ${organizationId}...`);
      createResult = runCreateProject(projectName, organizationId);
    }
  }

  if (createResult.status !== 0) {
    const errorMessage = parseCliErrorJson(createResult.stdout);
    console.error(
      "Failed to create project:",
      errorMessage || createResult.stderr.trim()
    );
    process.exit(1);
  }

  let projectId = "";
  try {
    const parsed = JSON.parse(createResult.stdout.trim());
    projectId = parsed.id || parsed.projectId;
    console.log(`✓ Created project: ${projectId}`);
  } catch {
    console.error(
      "Failed to parse project creation output:",
      createResult.stdout
    );
    process.exit(1);
  }

  // Create both datasets
  console.log("");
  createDatasets(projectId);

  // The .env uses "development" by default
  const dataset = "development";

  // Create API read token
  const readToken = await createReadToken(projectId);

  // Add CORS origin for localhost
  console.log("\nAdding CORS origin for localhost...");
  spawnSync(
    "npx",
    [
      "sanity",
      "cors",
      "add",
      "http://localhost:4321",
      "--credentials",
      "-p",
      projectId,
    ],
    { encoding: "utf-8", stdio: "inherit" }
  );
  console.log("✓ Added CORS origin: http://localhost:4321");

  return { dataset, projectId, readToken };
}

function createReadToken(projectId: string): Promise<string> {
  console.log("\nCreating API read token...");
  const tokenResult = spawnSync(
    "npx",
    [
      "sanity",
      "tokens",
      "add",
      "Visual Editing Read Token",
      "--role",
      "viewer",
      "--project-id",
      projectId,
      "--json",
    ],
    { encoding: "utf-8", stdio: ["inherit", "pipe", "pipe"] }
  );

  if (tokenResult.status === 0) {
    try {
      const tokenParsed = JSON.parse(tokenResult.stdout.trim());
      const token = tokenParsed.key || tokenParsed.token || "";
      if (token) {
        console.log("✓ Created API read token");
        return token;
      }
    } catch {
      // Token might be printed without JSON
    }
  }

  console.log(
    "\nCould not automatically create token. Please enter it manually."
  );
  console.log(
    "You can create one at: https://www.sanity.io/manage → Project → API → Tokens\n"
  );
  return input({
    message: "Sanity API read token:",
    validate: (v) => (v.trim() ? true : "Token is required"),
  });
}

async function setupManually(
  hasSanityCli: boolean
): Promise<SanityCredentials> {
  if (hasSanityCli) {
    console.log(
      "\nManual setup selected. You can find these values at https://www.sanity.io/manage\n"
    );
  } else {
    console.log("\nSanity CLI not found. Proceeding with manual setup.");
    console.log("Find your project details at https://www.sanity.io/manage\n");
  }

  const projectId = await input({
    message: "Sanity project ID:",
    validate: (v) => (v.trim() ? true : "Project ID is required"),
  });

  const readToken = await input({
    message: "Sanity API read token:",
    validate: (v) => (v.trim() ? true : "Token is required"),
  });

  return { dataset: "development", projectId, readToken };
}

function setGhSecret(name: string, value: string) {
  const result = spawnSync("gh", ["secret", "set", name, "--body", value], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    console.error(`  ✗ Failed to set ${name}: ${result.stderr.trim()}`);
    return false;
  }
  console.log(`  ✓ ${name}`);
  return true;
}

async function setupGhSecrets(vars: {
  projectId: string;
  dataset: string;
  readToken: string;
}) {
  if (!ghCliAvailable()) {
    return;
  }

  const setupSecrets = await confirm({
    default: true,
    message: "Set GitHub Actions secrets via the gh CLI?",
  });

  if (!setupSecrets) {
    return;
  }

  console.log("\nSetting GitHub secrets...");
  setGhSecret("PUBLIC_SANITY_PROJECT_ID", vars.projectId);
  setGhSecret("PUBLIC_SANITY_DATASET", vars.dataset);
  setGhSecret("SANITY_API_READ_TOKEN", vars.readToken);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🚀 Project Setup\n");

  // Check for existing .env
  if (existsSync(ENV_PATH)) {
    const overwrite = await confirm({
      default: false,
      message: ".env file already exists. Overwrite it?",
    });
    if (!overwrite) {
      console.log("Setup cancelled.");
      process.exit(0);
    }
  }

  // ── Sanity Credentials ──────────────────────────────────────────────────

  const hasSanityCli = sanityCliAvailable();
  let useSanityCli = false;

  if (hasSanityCli) {
    useSanityCli = await confirm({
      default: true,
      message: "Create a new Sanity project via the CLI?",
    });
  }

  const { projectId, dataset, readToken } = useSanityCli
    ? await setupWithSanityCli()
    : await setupManually(hasSanityCli);

  // ── Studio Route ─────────────────────────────────────────────────────────

  const studioRoute = await input({
    default: "/studio",
    message: "Studio route (path where Sanity Studio is served):",
    validate: (v) => {
      if (!v.trim()) {
        return "Studio route is required";
      }
      if (!v.startsWith("/")) {
        return "Studio route must start with /";
      }
      if (v.includes(" ")) {
        return "Studio route must not contain spaces";
      }
      return true;
    },
  });

  // ── Mux (optional) ──────────────────────────────────────────────────────

  const setupMux = await confirm({
    default: false,
    message: "Configure Mux video credentials?",
  });

  let muxTokenId = "";
  let muxTokenSecret = "";

  if (setupMux) {
    console.log(
      "\nGet your Mux credentials at https://dashboard.mux.com/settings/access-tokens\n"
    );
    muxTokenId = await input({
      message: "Mux Token ID:",
      validate: (v) => (v.trim() ? true : "Mux Token ID is required"),
    });
    muxTokenSecret = await input({
      message: "Mux Token Secret:",
      validate: (v) => (v.trim() ? true : "Mux Token Secret is required"),
    });
  }

  // ── Write .env ───────────────────────────────────────────────────────────

  writeEnvFile({
    dataset,
    muxTokenId,
    muxTokenSecret,
    projectId,
    readToken,
    studioRoute,
  });

  console.log("\n✓ .env file written");

  // ── GitHub Secrets ───────────────────────────────────────────────────────

  await setupGhSecrets({ dataset, projectId, readToken });

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log("\n───────────────────────────────────────");
  console.log("  Project setup complete");
  console.log("───────────────────────────────────────");
  console.log(`  Project ID:    ${projectId}`);
  console.log(`  Dataset:       ${dataset}`);
  console.log(`  Studio route:  ${studioRoute}`);
  console.log(`  Mux:           ${setupMux ? "configured" : "skipped"}`);
  console.log("───────────────────────────────────────");
  console.log("\n  Run 'npm run dev' to start developing.\n");
}

try {
  await main();
} catch (error) {
  if (
    error instanceof Error &&
    error.message.includes("User force closed the prompt")
  ) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }
  console.error("Error:", error);
  process.exit(1);
}
