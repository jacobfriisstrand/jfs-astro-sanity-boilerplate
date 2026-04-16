#!/usr/bin/env node

import { execSync, spawnSync } from "node:child_process";
import { select } from "@inquirer/prompts";

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

function fail(msg: string): never {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

// ── Preflight checks ────────────────────────────────────────────────────────

try {
  run("gh --version");
} catch {
  fail("GitHub CLI (gh) is required. Install it: https://cli.github.com");
}

const branch = run("git rev-parse --abbrev-ref HEAD");
if (branch !== "develop") {
  fail("You must be on the develop branch to create a release.");
}

// Check for uncommitted changes
const status = run("git status --porcelain");
if (status) {
  fail("You have uncommitted changes. Commit or stash them first.");
}

// Ensure local develop is up to date
console.log("Syncing with remote...");
execSync("git fetch origin", { stdio: "inherit" });

const local = run("git rev-parse develop");
const remote = run("git rev-parse origin/develop");
if (local !== remote) {
  fail(
    "Local develop is out of sync with origin. Pull or push your changes first."
  );
}

// ── Version bump ─────────────────────────────────────────────────────────────

const currentVersion = run("node -p \"require('./package.json').version\"");
console.log(`\nCurrent version: ${currentVersion}`);

const versionType = await select({
  message: "Version bump:",
  choices: [
    { name: "patch", value: "patch" as const },
    { name: "minor", value: "minor" as const },
    { name: "major", value: "major" as const },
  ],
});

const newVersion = run(`npm version ${versionType} --no-git-tag-version`);
console.log(`Bumped to ${newVersion}`);

execSync("git add package.json package-lock.json", { stdio: "inherit" });
execSync(`git commit -m "chore: bump version to ${newVersion}"`, {
  stdio: "inherit",
});
execSync("git push origin develop", { stdio: "inherit" });

// ── Create PR ────────────────────────────────────────────────────────────────

console.log("\nCreating release PR...\n");

const result = spawnSync(
  "gh",
  [
    "pr",
    "create",
    "--base",
    "main",
    "--head",
    "develop",
    "--title",
    `Release ${newVersion}`,
    "--body",
    `Merge develop into main to release ${newVersion}.`,
  ],
  { encoding: "utf-8", stdio: "inherit" }
);

if (result.status !== 0) {
  fail("Failed to create PR. A PR from develop → main may already exist.");
}

console.log(
  "\n✓ Release PR created. Merge it to trigger the release workflow."
);
