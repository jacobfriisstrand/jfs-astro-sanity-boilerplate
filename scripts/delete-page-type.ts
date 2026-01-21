#!/usr/bin/env node

import { readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { select } from "@inquirer/prompts";
import { removePageTypeFromRegistry } from "./utils/registry-remover.js";
import { removePageTypeFromSchemaIndex } from "./utils/schema-index-remover.js";
import { removeFixedPageTypeFromSlugPage } from "./utils/slug-page-updater.js";

// Regex patterns defined at top level for performance
const JSON_OBJECT_REGEX = /^\{[\s\S]*\}$/;
const TITLE_REGEX = /title:\s*"([^"]+)"/;

type PageTypeSummary = { name: string; title: string };

// Get flexible page types from registry
function getFlexiblePageTypesFromRegistry(): PageTypeSummary[] {
  const pageTypes: PageTypeSummary[] = [];

  const registryPath = join(process.cwd(), "src/registry.ts");
  const registryContent = readFileSync(registryPath, "utf-8");

  const pageTypesStart = registryContent.indexOf("export const PAGE_TYPES = {");
  if (pageTypesStart !== -1) {
    const pageTypesEnd = registryContent.indexOf("} as const;", pageTypesStart);
    if (pageTypesEnd !== -1) {
      const pageTypesSection = registryContent.slice(
        pageTypesStart,
        pageTypesEnd
      );
      const pageTypeRegex = /(\w+):\s*\{\s*title:\s*"([^"]+)"/g;
      for (const match of pageTypesSection.matchAll(pageTypeRegex)) {
        pageTypes.push({
          name: match[1] ?? "",
          title: match[2] ?? "",
        });
      }
    }
  }
  return pageTypes;
}

// Get fixed page types from schema index (those not in registry)
function getFixedPageTypesFromIndex(
  existingPageTypeNames: string[]
): PageTypeSummary[] {
  const pageTypes: PageTypeSummary[] = [];

  const indexPath = join(process.cwd(), "src/sanity/schema-types/index.ts");
  const indexContent = readFileSync(indexPath, "utf-8");

  const pageTypeImportRegex =
    /import \{ (\w+) \} from ["']@\/sanity\/schema-types\/page-types\/([^"']+)["'];?/g;
  for (const importMatch of indexContent.matchAll(pageTypeImportRegex)) {
    const pageTypeName = importMatch[1] ?? "";
    // Check if it's not already in the list (not in registry = fixed page type)
    if (!existingPageTypeNames.includes(pageTypeName)) {
      // Try to get title from the schema file
      const fileName = importMatch[2] ?? "";
      const schemaPath = join(
        process.cwd(),
        "src/sanity/schema-types/page-types",
        `${fileName}.ts`
      );
      try {
        const schemaContent = readFileSync(schemaPath, "utf-8");
        const titleMatch = TITLE_REGEX.exec(schemaContent);
        const title = titleMatch?.[1] ?? pageTypeName;
        pageTypes.push({
          name: pageTypeName,
          title,
        });
      } catch {
        // If file doesn't exist, skip it
      }
    }
  }
  return pageTypes;
}

// Read registry and schema index to get available page types
function getAvailablePageTypes(): PageTypeSummary[] {
  const flexible = getFlexiblePageTypesFromRegistry();
  const fixed = getFixedPageTypesFromIndex(flexible.map((pt) => pt.name));
  return [...flexible, ...fixed];
}

// Get file name from schema index import
function getPageTypeFileName(pageTypeName: string): string | null {
  const indexPath = join(process.cwd(), "src/sanity/schema-types/index.ts");
  const content = readFileSync(indexPath, "utf-8");

  const importRegex = new RegExp(
    String.raw`import \{ ${pageTypeName} \} from ["']@/sanity/schema-types/page-types/([^"']+)["'];`,
    "g"
  );
  const match = importRegex.exec(content);
  return match?.[1] ?? null;
}

async function main() {
  console.log("Delete a Sanity page type\n");

  // Get available page types
  const availablePageTypes = getAvailablePageTypes();
  if (availablePageTypes.length === 0) {
    console.error("No page types found.");
    process.exit(1);
  }

  // Prompt for page type to delete
  const selectedPageType = await select({
    message: "Select a page type to delete:",
    choices: availablePageTypes.map((pt) => ({
      value: pt.name,
      name: `${pt.title} (${pt.name})`,
    })),
  });

  // Get file name
  const fileName = getPageTypeFileName(selectedPageType);
  if (!fileName) {
    console.error(`Could not find file name for page type ${selectedPageType}`);
    process.exit(1);
  }

  console.log(`\nDeleting page type: ${selectedPageType}...`);

  // Delete file
  const schemaPath = join(
    process.cwd(),
    "src/sanity/schema-types/page-types",
    `${fileName}.ts`
  );

  try {
    unlinkSync(schemaPath);
    console.log(`✓ Deleted ${schemaPath}`);
  } catch (error) {
    console.error(`✗ Error deleting schema file: ${error}`);
  }

  // Delete template file if it exists (for fixed page types)
  const templatePath = join(
    process.cwd(),
    "src/pages",
    `_${selectedPageType}.astro`
  );
  try {
    unlinkSync(templatePath);
    console.log(`✓ Deleted ${templatePath}`);
    // Also remove from [slug].astro
    removeFixedPageTypeFromSlugPage(selectedPageType);
    console.log("✓ Updated src/pages/[slug].astro");
  } catch {
    // Template doesn't exist (flexible page type), ignore
  }

  // Update registry (only if it's a flexible page type)
  const wasInRegistry = removePageTypeFromRegistry(selectedPageType);
  if (wasInRegistry) {
    console.log("✓ Updated registry.ts");
  } else {
    console.log("✓ Skipped registry update (fixed page type)");
  }

  // Update schema index
  removePageTypeFromSchemaIndex(selectedPageType);
  console.log("✓ Updated schema index.ts");

  console.log("✓ Page type deleted successfully");

  // Run typegen
  console.log("\nRunning typegen...");
  try {
    const { spawn } = await import("node:child_process");

    const child = spawn("npm", ["run", "typegen"], {
      cwd: process.cwd(),
      stdio: ["inherit", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // Filter stdout for import.meta warnings
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

    // Filter stderr
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

    // Write filtered output
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
  } catch (error) {
    console.error("✗ Error running typegen:", error);
    process.exit(1);
  }
}

try {
  await main();
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
