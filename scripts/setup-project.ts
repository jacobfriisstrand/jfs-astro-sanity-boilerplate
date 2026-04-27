#!/usr/bin/env node

import { execSync, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { confirm, input } from "@inquirer/prompts";

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

type SanityCredentials = {
  projectId: string;
  dataset: string;
  readToken: string;
};

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

    if (result.status !== 0) {
      console.error(
        `Failed to create dataset "${dataset}". You may need to create it manually.`
      );
    } else {
      console.log(`✓ Created dataset: ${dataset}`);
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
  const createResult = spawnSync(
    "npx",
    ["sanity", "projects", "create", projectName, "--json"],
    { encoding: "utf-8", stdio: ["inherit", "pipe", "pipe"] }
  );

  if (createResult.status !== 0) {
    console.error("Failed to create project:", createResult.stderr);
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

  return { projectId, dataset, readToken };
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

  return { projectId, dataset: "development", readToken };
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
    message: "Set GitHub Actions secrets via the gh CLI?",
    default: true,
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
      message: ".env file already exists. Overwrite it?",
      default: false,
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
      message: "Create a new Sanity project via the CLI?",
      default: true,
    });
  }

  const { projectId, dataset, readToken } = useSanityCli
    ? await setupWithSanityCli()
    : await setupManually(hasSanityCli);

  // ── Studio Route ─────────────────────────────────────────────────────────

  const studioRoute = await input({
    message: "Studio route (path where Sanity Studio is served):",
    default: "/studio",
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
    message: "Configure Mux video credentials?",
    default: false,
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
    projectId,
    dataset,
    readToken,
    studioRoute,
    muxTokenId,
    muxTokenSecret,
  });

  console.log("\n✓ .env file written");

  // ── GitHub Secrets ───────────────────────────────────────────────────────

  await setupGhSecrets({ projectId, dataset, readToken });

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
