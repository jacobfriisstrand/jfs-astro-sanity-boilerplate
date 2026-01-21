import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Regex patterns defined at top level for performance (use 's' flag for multi-line)
const ICON_IMPORT_REGEX = /import \{([^}]+)\} from "@sanity\/icons";/s;
const TYPE_IMPORT_REGEX = /import type \{([^}]+)\} from "sanity\.types";/s;
const FLEXIBLE_PAGE_TYPE_REGEX = /export type FlexiblePageType = ([^;]+);/;
const FIXED_PAGE_TYPE_REGEX = /export type FixedPageType = ([^;]+);/;
const ANY_PAGE_TYPE_REGEX = /export type AnyPageType = ([^;]+);/;

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
 * Add icon import to registry if not present
 */
function addIconImport(content: string, iconName: string): string {
  const iconMatch = ICON_IMPORT_REGEX.exec(content);
  if (iconMatch) {
    // Parse existing icons, handling whitespace and newlines
    const existingIcons =
      iconMatch[1]
        ?.split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0) ?? [];
    if (!existingIcons.includes(iconName)) {
      const newImports = [...existingIcons, iconName].join(", ");
      return content.replace(
        ICON_IMPORT_REGEX,
        `import { ${newImports} } from "@sanity/icons";`
      );
    }
    return content;
  }
  // Add import after the file header comment
  const insertPos = findImportInsertPosition(content);
  return (
    content.slice(0, insertPos) +
    `\nimport { ${iconName} } from "@sanity/icons";` +
    content.slice(insertPos)
  );
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
  const regex = new RegExp(FLEXIBLE_PAGE_TYPE_REGEX);
  const match = regex.exec(content);
  if (match) {
    const existingTypes = match[1]?.split("|").map((t) => t.trim()) ?? [];
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
  const regex = new RegExp(FIXED_PAGE_TYPE_REGEX);
  const match = regex.exec(content);

  if (match) {
    // Update existing FixedPageType
    const existingTypes =
      match[1]
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

type PageTypeEntry = {
  content: string;
  name: string;
  title: string;
  iconName: string;
  structureTitle?: string;
  isFixed?: boolean;
};

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

  // Build entry with optional fields
  let entryContent = `    title: "${title}",\n`;
  if (structureTitle) {
    entryContent += `    structureTitle: "${structureTitle}",\n`;
  }
  entryContent += `    icon: ${iconName},`;
  if (isFixed) {
    entryContent += "\n    fixed: true,";
  }

  const newEntry = `  ${name}: {\n${entryContent}\n  },`;
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
  content = addToPageTypes({ content, name, title, iconName, structureTitle });

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
    name,
    title,
    iconName,
    structureTitle,
    isFixed: true,
  });

  writeFileSync(registryPath, content, "utf-8");
}

/**
 * Component entry data
 */
type ComponentEntryData = {
  name: string;
  title: string;
  pageTypes: string[];
  fileName: string;
  isReact?: boolean;
};

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
  const newEntry = `  ${entry.name}: {\n    title: "${entry.title}",\n    pageTypes: [${pageTypesString}],\n    component: () => import("@/components/${entry.fileName}.${extension}"),\n  },`;
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
      String.raw`(${componentName}:\s*\{[^}]*pageTypes:\s*\[)([^\]]*)\]`,
      "s"
    );
    const match = pageTypesRegex.exec(content);
    if (match) {
      const existingTypes = match[2] ?? "";
      // Check if already includes this page type
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
