import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Per-icon subpath imports (@sanity/icons v5): import { XxxIcon } from "@sanity/icons/Xxx"
const ICON_IMPORT_LINE_REGEX =
  /import \{\s*(?<iconName>\w+Icon)\s*\} from "@sanity\/icons\/(?<subpath>[\w$]+)";\n?/gu;
// Strips the "Icon" suffix: HomeIcon -> Home (subpath base name)
const ICON_SUFFIX_REGEX = /Icon$/u;
const TYPE_IMPORT_REGEX =
  /import type \{(?<importNames>[^}]+)\} from "sanity\.types";/su;
const FLEXIBLE_PAGE_TYPE_REGEX =
  /export type FlexiblePageType = (?<typeValue>[^;]+);/u;
const FIXED_PAGE_TYPE_REGEX =
  /export type FixedPageType = (?<typeValue>[^;]+);/u;
const ANY_PAGE_TYPE_REGEX = /export type AnyPageType = (?<typeValue>[^;]+);/u;

/**
 * Find the position to insert imports (after file header comment, before first code)
 */
function findImportInsertPosition(content: string): number {
  // Look for the end of the file header comment block
  const headerEnd = content.indexOf("*/");
  if (headerEnd !== -1) {
    // Find the next newline after the comment
    const nextNewline = content.indexOf("\n", headerEnd);
    if (nextNewline !== -1) {
      return nextNewline + 1;
    }
  }
  // Fallback to start of file
  return 0;
}

/**
 * Add icon import to registry if not present.
 *
 * @sanity/icons v5 exports each icon from its own subpath, so each icon
 * gets its own import line, kept in alphabetical order.
 */
function addIconImport(content: string, iconName: string): string {
  const iconLines = [...content.matchAll(ICON_IMPORT_LINE_REGEX)].map(
    (match) => ({
      end: (match.index ?? 0) + match[0].length,
      name: match.groups?.iconName ?? "",
      start: match.index ?? 0,
    })
  );

  if (iconLines.some((icon) => icon.name === iconName)) {
    return content;
  }

  const iconBaseName = iconName.replace(ICON_SUFFIX_REGEX, "");
  const newLine = `import { ${iconName} } from "@sanity/icons/${iconBaseName}";\n`;

  // Insert alphabetically among the existing icon import lines
  const firstAfter = iconLines.find(
    (icon) => icon.name.localeCompare(iconName) > 0
  );
  if (firstAfter) {
    return (
      content.slice(0, firstAfter.start) +
      newLine +
      content.slice(firstAfter.start)
    );
  }
  if (iconLines.length > 0) {
    const last = iconLines.at(-1);
    if (last) {
      return content.slice(0, last.end) + newLine + content.slice(last.end);
    }
  }

  // No icon imports yet — add after the file header comment
  const insertPos = findImportInsertPosition(content);
  return `${content.slice(0, insertPos)}\n${newLine}${content.slice(insertPos)}`;
}

/**
 * Add type import to sanity.types if not present
 */
function addTypeImport(content: string, name: string): string {
  const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
  const typeMatch = TYPE_IMPORT_REGEX.exec(content);
  if (typeMatch) {
    // Parse existing types, handling whitespace and newlines
    const existingTypes =
      typeMatch[1]
        ?.split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0) ?? [];
    if (!existingTypes.includes(pascalName)) {
      const newImports = [...existingTypes, pascalName].join(", ");
      return content.replace(
        TYPE_IMPORT_REGEX,
        `import type { ${newImports} } from "sanity.types";`
      );
    }
    return content;
  }
  // Add import after the file header comment
  const insertPos = findImportInsertPosition(content);
  return (
    content.slice(0, insertPos) +
    `\nimport type { ${pascalName} } from "sanity.types";` +
    content.slice(insertPos)
  );
}

/**
 * Add page type to FlexiblePageType type union
 */
function addToFlexiblePageType(content: string, name: string): string {
  const match = FLEXIBLE_PAGE_TYPE_REGEX.exec(content);
  if (match) {
    const existingTypes =
      match.groups?.typeValue?.split("|").map((t) => t.trim()) ?? [];
    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
    if (!existingTypes.includes(pascalName)) {
      const newTypes = [...existingTypes, pascalName].join(" | ");
      return content.replace(
        FLEXIBLE_PAGE_TYPE_REGEX,
        `export type FlexiblePageType = ${newTypes};`
      );
    }
  }
  return content;
}

/**
 * Add page type to FixedPageType type union
 */
function addToFixedPageType(content: string, name: string): string {
  const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
  const match = FIXED_PAGE_TYPE_REGEX.exec(content);

  if (match) {
    // Update existing FixedPageType
    const existingTypes =
      match.groups?.typeValue
        ?.split("|")
        .map((t) => t.trim())
        .filter((t) => t !== "never") ?? [];
    if (!existingTypes.includes(pascalName)) {
      const newTypes = [...existingTypes, pascalName].join(" | ");
      return content.replace(
        FIXED_PAGE_TYPE_REGEX,
        `export type FixedPageType = ${newTypes};`
      );
    }
    return content;
  }

  // FixedPageType doesn't exist - create it after FlexiblePageType
  const flexibleMatch = FLEXIBLE_PAGE_TYPE_REGEX.exec(content);
  if (flexibleMatch) {
    const insertIndex = flexibleMatch.index + flexibleMatch[0].length;
    const newLine = `\n\n/**\n * Union type of all fixed page types (with predefined fields)\n * Add fixed page types here when created\n */\nexport type FixedPageType = ${pascalName};`;
    return content.slice(0, insertIndex) + newLine + content.slice(insertIndex);
  }

  return content;
}

/**
 * Ensure AnyPageType includes FixedPageType
 */
function ensureAnyPageTypeIncludesFixed(content: string): string {
  const anyMatch = ANY_PAGE_TYPE_REGEX.exec(content);
  if (anyMatch) {
    const existingTypes = anyMatch[1]?.split("|").map((t) => t.trim()) ?? [];
    if (!existingTypes.includes("FixedPageType")) {
      const newTypes = [...existingTypes, "FixedPageType"].join(" | ");
      return content.replace(
        ANY_PAGE_TYPE_REGEX,
        `export type AnyPageType = ${newTypes};`
      );
    }
  }
  return content;
}

/**
 * Find matching closing brace for an object
 */
function findClosingBrace(
  content: string,
  startIndex: number,
  startString: string
): number {
  let braceCount = 0;
  let i = startIndex + startString.length;
  for (; i < content.length; i += 1) {
    if (content[i] === "{") {
      braceCount += 1;
    }
    if (content[i] === "}") {
      if (braceCount === 0) {
        return i;
      }
      braceCount -= 1;
    }
  }
  return i;
}

interface PageTypeEntry {
  content: string;
  iconName: string;
  isFixed?: boolean;
  name: string;
  structureTitle?: string;
  title: string;
}

/**
 * Add entry to PAGE_TYPES object
 */
function addToPageTypes(entry: PageTypeEntry): string {
  const { content, name, title, iconName, structureTitle, isFixed } = entry;
  const pageTypesStart = content.indexOf("export const PAGE_TYPES = {");
  if (pageTypesStart === -1) {
    return content;
  }

  const pageTypesEnd = findClosingBrace(
    content,
    pageTypesStart,
    "export const PAGE_TYPES = {"
  );

  const existingEntries = content.slice(
    pageTypesStart + "export const PAGE_TYPES = {".length,
    pageTypesEnd
  );

  // Build entry with keys in the order biome (useSortedKeys) expects:
  // fixed < icon < structureTitle < title
  const entryLines: string[] = [];
  if (isFixed) {
    entryLines.push("    fixed: true");
  }
  entryLines.push(`    icon: ${iconName}`);
  if (structureTitle) {
    entryLines.push(`    structureTitle: "${structureTitle}"`);
  }
  entryLines.push(`    title: "${title}"`);
  entryLines.push("");
  const entryContent = `${entryLines.join(",\n")}`;

  const newEntry = `  ${name}: {\n${entryContent}  },`;
  const insertPosition = existingEntries.lastIndexOf("},") + 2;

  // Get content after insert position and ensure it has proper spacing
  const afterInsert = existingEntries.slice(insertPosition).trimStart();

  const prefix = `${existingEntries.slice(0, insertPosition)}\n${newEntry}`;
  const updatedEntries = afterInsert
    ? `${prefix}\n${afterInsert}`
    : `${prefix}\n`;

  return (
    content.slice(0, pageTypesStart + "export const PAGE_TYPES = {".length) +
    updatedEntries +
    content.slice(pageTypesEnd)
  );
}

/**
 * Update registry.ts to add a new flexible page type
 */
export function addPageTypeToRegistry(
  name: string,
  title: string,
  iconName: string,
  structureTitle?: string
): void {
  const registryPath = join(process.cwd(), "src/registry.ts");
  let content = readFileSync(registryPath, "utf-8");

  content = addIconImport(content, iconName);
  content = addTypeImport(content, name);
  content = addToFlexiblePageType(content, name);
  content = addToPageTypes({ content, iconName, name, structureTitle, title });

  writeFileSync(registryPath, content, "utf-8");
}

/**
 * Update registry.ts to add a new fixed page type
 */
export function addFixedPageTypeToRegistry(
  name: string,
  title: string,
  iconName: string,
  structureTitle?: string
): void {
  const registryPath = join(process.cwd(), "src/registry.ts");
  let content = readFileSync(registryPath, "utf-8");

  content = addIconImport(content, iconName);
  content = addTypeImport(content, name);
  content = addToFixedPageType(content, name);
  content = ensureAnyPageTypeIncludesFixed(content);
  content = addToPageTypes({
    content,
    iconName,
    isFixed: true,
    name,
    structureTitle,
    title,
  });

  writeFileSync(registryPath, content, "utf-8");
}

/**
 * Component entry data
 */
interface ComponentEntryData {
  fileName: string;
  isReact?: boolean;
  name: string;
  pageTypes: string[];
  title: string;
}

/**
 * Add entry to COMPONENTS object
 */
function addToComponents(content: string, entry: ComponentEntryData): string {
  const componentsStart = content.indexOf("export const COMPONENTS = {");
  if (componentsStart === -1) {
    return content;
  }

  const componentsEnd = findClosingBrace(
    content,
    componentsStart,
    "export const COMPONENTS = {"
  );

  const existingEntries = content.slice(
    componentsStart + "export const COMPONENTS = {".length,
    componentsEnd
  );
  const pageTypesString = entry.pageTypes.map((pt) => `"${pt}"`).join(", ");
  const extension = entry.isReact ? "tsx" : "astro";
  // Keys in the order biome (useSortedKeys) expects:
  // component < pageTypes < title
  const newEntry = `  ${entry.name}: {\n    component: () => import("@/components/${entry.fileName}.${extension}"),\n    pageTypes: [${pageTypesString}],\n    title: "${entry.title}",\n  },`;
  const insertPosition = existingEntries.lastIndexOf("},") + 2;
  const updatedEntries =
    existingEntries.slice(0, insertPosition) +
    "\n" +
    newEntry +
    existingEntries.slice(insertPosition);

  return (
    content.slice(0, componentsStart + "export const COMPONENTS = {".length) +
    updatedEntries +
    content.slice(componentsEnd)
  );
}

/**
 * Update registry.ts to add a new component
 */
export function addComponentToRegistry(
  name: string,
  title: string,
  options: { pageTypes: string[]; fileName: string; isReact?: boolean }
): void {
  const registryPath = join(process.cwd(), "src/registry.ts");
  let content = readFileSync(registryPath, "utf-8");

  const entry: ComponentEntryData = { name, title, ...options };
  content = addToComponents(content, entry);

  writeFileSync(registryPath, content, "utf-8");
}

/**
 * Add a page type to multiple components' pageTypes arrays
 */
export function addPageTypeToComponents(
  pageTypeName: string,
  componentNames: string[]
): void {
  const registryPath = join(process.cwd(), "src/registry.ts");
  let content = readFileSync(registryPath, "utf-8");

  for (const componentName of componentNames) {
    // Find the component's pageTypes array and add the new page type
    const pageTypesRegex = new RegExp(
      String.raw`(?<prefix>${componentName}:\s*\{[^}]*pageTypes:\s*\[)(?<list>[^\]]*)\]`,
      "su"
    );
    const match = pageTypesRegex.exec(content);
    if (match) {
      const existingTypes = match.groups?.list ?? "";
      // Check if already includes this page type
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
