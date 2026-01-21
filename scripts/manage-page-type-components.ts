#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkbox, select } from "@inquirer/prompts";

// Regex patterns defined at top level for performance
const JSON_OBJECT_REGEX = /^\{[\s\S]*\}$/;
const COMPONENT_REGEX =
  /(\w+):\s*\{\s*title:\s*"([^"]+)"[^}]*pageTypes:\s*\[([^\]]*)\]/gs;
const PAGE_TYPE_ENTRY_REGEX = /(\w+):\s*\{([^}]*)\}/g;
const PAGE_TYPE_TITLE_REGEX = /title:\s*"([^"]+)"/;
const PAGE_TYPE_FIXED_REGEX = /fixed:\s*true/;

type PageType = {
  name: string;
  title: string;
  isFixed: boolean;
};

type Component = {
  name: string;
  title: string;
  pageTypes: string[];
};

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

    pageTypes.push({ name, title, isFixed });

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

  for (const match of componentsSection.matchAll(COMPONENT_REGEX)) {
    const pageTypesStr = match[3] ?? "";
    const pageTypes = pageTypesStr
      .split(",")
      .map((pt) => pt.trim().replaceAll('"', ""))
      .filter((pt) => pt.length > 0);

    components.push({
      name: match[1] ?? "",
      title: match[2] ?? "",
      pageTypes,
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
      String.raw`(${componentName}:\s*\{[^}]*pageTypes:\s*\[)([^\]]*)\]`,
      "s"
    );
    const match = pageTypesRegex.exec(content);
    if (match) {
      const existingTypes = match[2] ?? "";
      if (!existingTypes.includes(`"${pageTypeName}"`)) {
        const newTypes = existingTypes
          ? `${existingTypes}, "${pageTypeName}"`
          : `"${pageTypeName}"`;
        content = content.replace(pageTypesRegex, `$1${newTypes}]`);
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
      String.raw`(${componentName}:\s*\{[^}]*pageTypes:\s*\[)([^\]]*)\]`,
      "s"
    );
    const match = pageTypesRegex.exec(content);
    if (match) {
      const existingTypes = match[2] ?? "";
      const types = existingTypes
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t !== `"${pageTypeName}"`);
      const newTypes = types.join(", ");
      content = content.replace(pageTypesRegex, `$1${newTypes}]`);
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
      action = await select({
        message: "What would you like to do?",
        choices: [
          { value: "add", name: "Add components to a page type" },
          { value: "remove", name: "Remove components from a page type" },
        ],
      });
      step = 2;
    } else if (step === 2) {
      // Step 2: Select page type
      selectedPageType = await select({
        message: "Select a page type:",
        choices: [
          { value: BACK, name: "← Back" },
          ...flexiblePageTypes.map((pt) => ({
            value: pt.name,
            name: `${pt.title} (${pt.name})`,
          })),
        ],
      });

      if (selectedPageType === BACK) {
        step = 1;
        continue;
      }
      step = 3;
    } else if (step === 3) {
      // Step 3: Select components
      if (action === "add") {
        const unassignedComponents = components.filter(
          (c) => !c.pageTypes.includes(selectedPageType)
        );

        if (unassignedComponents.length === 0) {
          console.log(
            "\nAll components are already assigned to this page type."
          );
          step = 2;
          continue;
        }

        const selectedComponents = await checkbox({
          message: `Select components to add to "${selectedPageType}":`,
          choices: [
            { value: BACK, name: "← Back" },
            ...unassignedComponents.map((comp) => ({
              value: comp.name,
              name: `${comp.title} (${comp.name})`,
            })),
          ],
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
        console.log(
          `✓ Added ${selectedComponents.length} component(s) to ${selectedPageType}`
        );

        await runTypegen();
        step = 4; // Exit loop
      } else {
        const assignedComponents = components.filter((c) =>
          c.pageTypes.includes(selectedPageType)
        );

        if (assignedComponents.length === 0) {
          console.log("\nNo components are assigned to this page type.");
          step = 2;
          continue;
        }

        const selectedComponents = await checkbox({
          message: `Select components to remove from "${selectedPageType}":`,
          choices: [
            { value: BACK, name: "← Back" },
            ...assignedComponents.map((comp) => ({
              value: comp.name,
              name: `${comp.title} (${comp.name})`,
            })),
          ],
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
