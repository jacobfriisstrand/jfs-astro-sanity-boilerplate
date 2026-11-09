#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { select } from "@inquirer/prompts";
import { deletePageType } from "./utils/page-type-deleter.js";
import { parseEntriesWithTitle } from "./utils/registry-parsing.js";

interface PageTypeSummary {
  name: string;
  title: string;
}

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
      for (const entry of parseEntriesWithTitle(pageTypesSection)) {
        pageTypes.push({
          name: entry.name,
          title: entry.title,
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
    /import \{ (?<name>\w+) \} from ["']@\/sanity\/schema-types\/page-types\/(?<file>[^"']+)["'];?/gu;
  for (const importMatch of indexContent.matchAll(pageTypeImportRegex)) {
    const pageTypeName = importMatch.groups?.name ?? "";
    // Check if it's not already in the list (not in registry = fixed page type)
    if (!existingPageTypeNames.includes(pageTypeName)) {
      // Try to get title from the schema file
      const fileName = importMatch.groups?.file ?? "";
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

// Regex patterns defined at top level for performance
const TITLE_REGEX = /title:\s*"(?<title>[^"]+)"/u;

// Protected page types that cannot be deleted (singletons)
const PROTECTED_PAGE_TYPES = ["homepage", "notFoundPage"];

async function main() {
  console.log("Delete a Sanity page type\n");

  // Get available page types
  const availablePageTypes = getAvailablePageTypes();

  // Filter out protected page types
  const deletablePageTypes = availablePageTypes.filter(
    (pt) => !PROTECTED_PAGE_TYPES.includes(pt.name)
  );

  if (deletablePageTypes.length === 0) {
    console.error("No deletable page types found.");
    process.exit(1);
  }

  // Prompt for page type to delete
  const selectedPageType = await select({
    choices: deletablePageTypes.map((pt) => ({
      name: `${pt.title} (${pt.name})`,
      value: pt.name,
    })),
    message: "Select a page type to delete:",
  });

  // Additional safety check
  if (PROTECTED_PAGE_TYPES.includes(selectedPageType)) {
    console.error(
      `\n✗ Error: "${selectedPageType}" is a protected page type and cannot be deleted.`
    );
    process.exit(1);
  }

  await deletePageType(selectedPageType);
}

try {
  await main();
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
