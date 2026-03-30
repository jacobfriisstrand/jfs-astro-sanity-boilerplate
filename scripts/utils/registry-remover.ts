import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Regex patterns defined at top level for performance (use 's' flag for multi-line)
const PAGE_TYPES_REGEX = /export const PAGE_TYPES = \{[\s\S]*?\} as const;/;
const FLEXIBLE_TYPE_REGEX = /export type FlexiblePageType = ([^;]+);/;
const FIXED_TYPE_REGEX = /export type FixedPageType = ([^;]+);/;
const ICON_IMPORT_REGEX = /import \{([^}]+)\} from "@sanity\/icons";/s;
const ICON_IMPORT_LINE_REGEX = /import \{[^}]+\} from "@sanity\/icons";\n?/s;
const SANITY_TYPE_IMPORT_REGEX =
  /import type \{([^}]+)\} from "sanity\.types";/s;
const SANITY_TYPE_IMPORT_LINE_REGEX =
  /import type \{[^}]+\} from "sanity\.types";\n?/s;
const COMPONENTS_REGEX =
  /export const COMPONENTS = \{[\s\S]*?\} as const satisfies/;
const TYPE_NAME_FROM_EXPORT_REGEX = /export type (\w+) =/;

/**
 * Find the end index of an object entry by counting braces
 */
function findEntryEnd(content: string, startAfterBrace: number): number {
  let braceCount = 1;
  let i = startAfterBrace;

  while (i < content.length && braceCount > 0) {
    if (content[i] === "{") {
      braceCount += 1;
    } else if (content[i] === "}") {
      braceCount -= 1;
    }
    i += 1;
  }

  return i;
}

/**
 * Remove an entry from an object string (PAGE_TYPES or COMPONENTS)
 */
function removeEntryFromObject(objectStr: string, name: string): string | null {
  const entryPattern = new RegExp(String.raw`(\s*)${name}:\s*\{`);
  const entryMatch = entryPattern.exec(objectStr);
  if (!entryMatch) {
    return null;
  }

  const entryStart = entryMatch.index;
  const openBraceIndex = objectStr.indexOf("{", entryStart + name.length);
  const entryEnd = findEntryEnd(objectStr, openBraceIndex + 1);

  // Include trailing comma and whitespace
  let finalEnd = entryEnd;
  while (finalEnd < objectStr.length) {
    const char = objectStr[finalEnd];
    if (char === "," || char === " " || char === "\n") {
      finalEnd += 1;
    } else {
      break;
    }
  }

  return objectStr.slice(0, entryStart) + objectStr.slice(finalEnd);
}

/**
 * Update a type union by removing a type name
 */
function updateTypeUnion(
  content: string,
  regex: RegExp,
  typeToRemove: string,
  fallback?: string
): string {
  const match = regex.exec(content);
  if (!match?.[1]) {
    return content;
  }

  const existingTypes = match[1].split("|").map((t) => t.trim());
  const filtered = existingTypes.filter(
    (t) => t !== typeToRemove && t !== "never"
  );

  if (
    filtered.length === existingTypes.length &&
    !existingTypes.includes(typeToRemove)
  ) {
    return content;
  }

  const newTypes =
    filtered.length > 0
      ? filtered.join(" | ")
      : (fallback ?? filtered.join(" | "));

  // Build replacement by keeping the type declaration and only changing the value
  // Extract the type name from the match (e.g., "FlexiblePageType" or "FixedPageType")
  const typeNameMatch = TYPE_NAME_FROM_EXPORT_REGEX.exec(match[0]);
  if (!typeNameMatch) {
    return content;
  }
  const typeName = typeNameMatch[1];
  const replacement = `export type ${typeName} = ${newTypes};`;
  return content.replace(match[0], replacement);
}

/**
 * Remove unused imports from a line
 */
function cleanupImports(
  content: string,
  importRegex: RegExp,
  lineRegex: RegExp
): string {
  const match = importRegex.exec(content);
  if (!match?.[1]) {
    return content;
  }

  // Parse items, handling whitespace and newlines
  const items = match[1]
    .split(",")
    .map((i) => i.trim())
    .filter((i) => i.length > 0);
  const importLine = match[0];
  const contentWithoutImport = content.replace(importLine, "");

  const usedItems = items.filter((item) => {
    const usage = new RegExp(String.raw`\b${item}\b`);
    return usage.test(contentWithoutImport);
  });

  if (usedItems.length === items.length) {
    return content;
  }

  if (usedItems.length > 0) {
    // Rebuild as single-line import
    const newImport = importLine.includes("import type")
      ? `import type { ${usedItems.join(", ")} } from "sanity.types";`
      : `import { ${usedItems.join(", ")} } from "@sanity/icons";`;
    return content.replace(importRegex, newImport);
  }
  return content.replace(lineRegex, "");
}

/**
 * Remove page type from all components' pageTypes arrays
 */
function removePageTypeFromComponents(
  content: string,
  pageTypeName: string
): string {
  // Find all pageTypes arrays and remove the page type
  const pageTypesArrayRegex = /pageTypes:\s*\[([^\]]*)\]/g;
  return content.replaceAll(pageTypesArrayRegex, (_, arrayContent) => {
    const types = arrayContent
      .split(",")
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0 && t !== `"${pageTypeName}"`);
    return `pageTypes: [${types.join(", ")}]`;
  });
}

/**
 * Remove page type from registry.ts
 * Returns true if the page type was found and removed
 */
export function removePageTypeFromRegistry(name: string): boolean {
  const registryPath = join(process.cwd(), "src/registry.ts");
  let content = readFileSync(registryPath, "utf-8");

  // Find and update PAGE_TYPES object
  const pageTypesMatch = PAGE_TYPES_REGEX.exec(content);
  if (!pageTypesMatch) {
    return false;
  }

  const newPageTypes = removeEntryFromObject(pageTypesMatch[0], name);
  if (!newPageTypes) {
    return false;
  }

  content = content.replace(pageTypesMatch[0], newPageTypes);

  // Update type unions (use "never" as fallback when empty)
  const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
  content = updateTypeUnion(content, FLEXIBLE_TYPE_REGEX, pascalName, "never");
  content = updateTypeUnion(content, FIXED_TYPE_REGEX, pascalName, "never");

  // Remove page type from components' pageTypes arrays
  content = removePageTypeFromComponents(content, name);

  // Cleanup imports
  content = cleanupImports(content, ICON_IMPORT_REGEX, ICON_IMPORT_LINE_REGEX);
  content = cleanupImports(
    content,
    SANITY_TYPE_IMPORT_REGEX,
    SANITY_TYPE_IMPORT_LINE_REGEX
  );

  writeFileSync(registryPath, content, "utf-8");
  return true;
}

/**
 * Remove component from registry.ts
 */
export function removeComponentFromRegistry(name: string): void {
  const registryPath = join(process.cwd(), "src/registry.ts");
  let content = readFileSync(registryPath, "utf-8");

  const componentsMatch = COMPONENTS_REGEX.exec(content);
  if (!componentsMatch) {
    return;
  }

  const newComponents = removeEntryFromObject(componentsMatch[0], name);
  if (!newComponents) {
    return;
  }

  content = content.replace(componentsMatch[0], newComponents);
  writeFileSync(registryPath, content, "utf-8");
}
