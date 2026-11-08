#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkbox, select } from "@inquirer/prompts";
import { runLintFix } from "./utils/lint-fix.js";
import {
  parseEntriesWithTitle,
  parsePageTypesFromEntryBody,
} from "./utils/registry-parsing.js";

// Regex patterns defined at top level for performance
const JSON_OBJECT_REGEX = /^\{[\s\S]*\}$/u;
const PAGE_TYPE_ENTRY_REGEX = /(?<name>\w+):\s*\{(?<body>[^}]*)\}/gu;
const PAGE_TYPE_TITLE_REGEX = /title:\s*"(?<title>[^"]+)"/u;
const PAGE_TYPE_FIXED_REGEX = /fixed:\s*true/u;

interface PageType {
  isFixed: boolean;
  name: string;
  title: string;
}

interface Component {
  name: string;
  pageTypes: string[];
  title: string;
}

/**
 * Get available page types from registry
 */
function getAvailablePageTypes(): PageType[] {
  const registryPath = join(process.cwd(), "src/registry.ts");
  const content = readFileSync(registryPath, "utf-8");

  const pageTypes: PageType[] = [];
  const pageTypesStart = content.indexOf("export const PAGE_TYPES = {");
  if (pageTypesStart === -1) {
    return pageTypes;
  }

  const pageTypesEnd = content.indexOf("} as const;", pageTypesStart);
  if (pageTypesEnd === -1) {
    return pageTypes;
  }

  const pageTypesSection = content.slice(pageTypesStart, pageTypesEnd);

  // Match each page type entry and capture its content
  const pageTypeRegex = PAGE_TYPE_ENTRY_REGEX;
  pageTypeRegex.lastIndex = 0;

  let match: RegExpExecArray | null = pageTypeRegex.exec(pageTypesSection);
  while (match !== null) {
    const name = match[1] ?? "";
    const entryContent = match[2] ?? "";

    // Extract title from entry content
    const titleMatch = PAGE_TYPE_TITLE_REGEX.exec(entryContent);
    const title = titleMatch?.[1] ?? name;

    // Check if fixed: true exists in entry content
    const isFixed = PAGE_TYPE_FIXED_REGEX.test(entryContent);

    pageTypes.push({ isFixed, name, title });

    match = pageTypeRegex.exec(pageTypesSection);
  }

  return pageTypes;
}

/**
 * Get available components from registry
 */
function getAvailableComponents(): Component[] {
  const registryPath = join(process.cwd(), "src/registry.ts");
  const content = readFileSync(registryPath, "utf-8");

  const componentsStart = content.indexOf("export const COMPONENTS = {");
  const componentsEnd = content.indexOf(
    "} as const satisfies",
    componentsStart
  );
  if (componentsStart === -1 || componentsEnd === -1) {
    return [];
  }

  const componentsSection = content.slice(componentsStart, componentsEnd);
  const components: Component[] = [];

  for (const entry of parseEntriesWithTitle(componentsSection)) {
    const pageTypes = parsePageTypesFromEntryBody(entry.body);

    components.push({
      name: entry.name,
      pageTypes,
      title: entry.title,
    });
  }

  return components;
}

/**
 * Add page type to specified components' pageTypes arrays
 */
function addPageTypeToComponents(
  pageTypeName: string,
  componentNames: string[]
): void {
  const registryPath = join(process.cwd(), "src/registry.ts");
  let content = readFileSync(registryPath, "utf-8");

  for (const componentName of componentNames) {
    const pageTypesRegex = new RegExp(
      String.raw`(?<prefix>${componentName}:\s*\{[^}]*pageTypes:\s*\[)(?<list>[^\]]*)\]`,
      "su"
    );
    const match = pageTypesRegex.exec(content);
    if (match) {
      const existingTypes = match.groups?.list ?? "";
      if (!existingTypes.includes(`"${pageTypeName}"`)) {
        const newTypes = existingTypes
          ? `${existingTypes}, "${pageTypeName}"`
          : `"${pageTypeName}"`;
        content = content.replace(pageTypesRegex, `$<prefix>${newTypes}]`);
      }
    }
  }

  writeFileSync(registryPath, content, "utf-8");
}

/**
 * Remove page type from specified components' pageTypes arrays
 */
function removePageTypeFromComponents(
  pageTypeName: string,
  componentNames: string[]
): void {
  const registryPath = join(process.cwd(), "src/registry.ts");
  let content = readFileSync(registryPath, "utf-8");

  for (const componentName of componentNames) {
    const pageTypesRegex = new RegExp(
      String.raw`(?<prefix>${componentName}:\s*\{[^}]*pageTypes:\s*\[)(?<list>[^\]]*)\]`,
      "su"
    );
    const match = pageTypesRegex.exec(content);
    if (match) {
      const existingTypes = match.groups?.list ?? "";
      const types = existingTypes
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t !== `"${pageTypeName}"`);
      const newTypes = types.join(", ");
      content = content.replace(pageTypesRegex, `$<prefix>${newTypes}]`);
    }
  }

  writeFileSync(registryPath, content, "utf-8");
}

/**
 * Run typegen to update types
 */
async function runTypegen(): Promise<void> {
  console.log("\nRunning typegen...");
  const { spawn } = await import("node:child_process");

  const child = spawn("npm", ["run", "typegen"], {
    cwd: process.cwd(),
    stdio: ["inherit", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  child.stdout?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        !(
          line.includes('"import.meta" is not available') ||
          line.includes('"column":') ||
          line.includes('"file":') ||
          line.includes('"lineText":') ||
          line.includes('"length":') ||
          line.includes('"namespace":') ||
          line.includes('"suggestion":') ||
          JSON_OBJECT_REGEX.test(trimmed)
        )
      ) {
        stdout += `${line}\n`;
      }
    }
  });

  child.stderr?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        !(
          line.includes('"import.meta" is not available') ||
          line.includes('"column":') ||
          line.includes('"file":') ||
          line.includes('"lineText":') ||
          line.includes('"length":') ||
          line.includes('"namespace":') ||
          line.includes('"suggestion":') ||
          JSON_OBJECT_REGEX.test(trimmed) ||
          line.includes("DEP0190")
        )
      ) {
        stderr += `${line}\n`;
      }
    }
  });

  const exitCode = await new Promise<number>((resolve) => {
    child.on("close", (code) => {
      resolve(code ?? 0);
    });
  });

  if (stdout.trim()) {
    process.stdout.write(stdout);
  }
  if (stderr.trim()) {
    process.stderr.write(stderr);
  }

  if (exitCode !== 0) {
    throw new Error(`typegen exited with code ${exitCode}`);
  }

  console.log("✓ Types generated successfully");
}

const BACK = "__back__";

// biome-ignore lint: CLI flow is clearer as a single function
async function main() {
  console.log("Manage page type components\n");

  // Get available page types (flexible only)
  const allPageTypes = getAvailablePageTypes();
  const flexiblePageTypes = allPageTypes.filter((pt) => !pt.isFixed);

  if (flexiblePageTypes.length === 0) {
    console.error(
      "No flexible page types found. Fixed page types don't support dynamic components."
    );
    process.exit(1);
  }

  // Get components
  const components = getAvailableComponents();

  if (components.length === 0) {
    console.error("No components found. Create a component first.");
    process.exit(1);
  }

  // Step tracking for back navigation
  let step = 1;
  let action = "";
  let selectedPageType = "";

  while (step <= 3) {
    if (step === 1) {
      // Step 1: Select action
      // biome-ignore lint/performance/noAwaitInLoops: interactive wizard prompts must await sequentially inside the loop
      action = await select({
        choices: [
          { name: "Add components to a page type", value: "add" },
          { name: "Remove components from a page type", value: "remove" },
        ],
        message: "What would you like to do?",
      });
      step = 2;
    } else if (step === 2) {
      // Step 2: Select page type
      selectedPageType = await select({
        choices: [
          { name: "← Back", value: BACK },
          ...flexiblePageTypes.map((pt) => ({
            name: `${pt.title} (${pt.name})`,
            value: pt.name,
          })),
        ],
        message: "Select a page type:",
      });

      if (selectedPageType === BACK) {
        step = 1;
        continue;
      }
      step = 3;
    } else if (step === 3) {
      // Copy to a per-iteration binding so the closures below don't capture a mutable outer variable
      const activePageType = selectedPageType;
      // Step 3: Select components
      if (action === "add") {
        const unassignedComponents = components.filter(
          (c) => !c.pageTypes.includes(activePageType)
        );

        if (unassignedComponents.length === 0) {
          console.log(
            "\nAll components are already assigned to this page type."
          );
          step = 2;
          continue;
        }

        const selectedComponents = await checkbox({
          choices: [
            { name: "← Back", value: BACK },
            ...unassignedComponents.map((comp) => ({
              name: `${comp.title} (${comp.name})`,
              value: comp.name,
            })),
          ],
          message: `Select components to add to "${selectedPageType}":`,
        });

        // Check if back was selected
        if (selectedComponents.includes(BACK)) {
          step = 2;
          continue;
        }

        if (selectedComponents.length === 0) {
          console.log("\nNo components selected. Please select at least one.");
          continue;
        }

        console.log("\nUpdating registry...");
        addPageTypeToComponents(selectedPageType, selectedComponents);
        runLintFix();
        console.log(
          `✓ Added ${selectedComponents.length} component(s) to ${selectedPageType}`
        );

        await runTypegen();
        step = 4; // Exit loop
      } else {
        const assignedComponents = components.filter((c) =>
          c.pageTypes.includes(activePageType)
        );

        if (assignedComponents.length === 0) {
          console.log("\nNo components are assigned to this page type.");
          step = 2;
          continue;
        }

        const selectedComponents = await checkbox({
          choices: [
            { name: "← Back", value: BACK },
            ...assignedComponents.map((comp) => ({
              name: `${comp.title} (${comp.name})`,
              value: comp.name,
            })),
          ],
          message: `Select components to remove from "${selectedPageType}":`,
        });

        // Check if back was selected
        if (selectedComponents.includes(BACK)) {
          step = 2;
          continue;
        }

        if (selectedComponents.length === 0) {
          console.log("\nNo components selected. Please select at least one.");
          continue;
        }

        console.log("\nUpdating registry...");
        removePageTypeFromComponents(selectedPageType, selectedComponents);
        runLintFix();
        console.log(
          `✓ Removed ${selectedComponents.length} component(s) from ${selectedPageType}`
        );

        await runTypegen();
        step = 4; // Exit loop
      }
    }
  }
}

try {
  await main();
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
