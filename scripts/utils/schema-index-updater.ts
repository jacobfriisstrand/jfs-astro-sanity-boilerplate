import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Regex patterns defined at top level for performance
const PAGE_TYPE_IMPORT_REGEX =
  /import \{ ([^}]+) \} from "@\/sanity\/schema-types\/page-types\/([^"]+)";/g;
const COMPONENT_IMPORT_REGEX =
  /import \{ ([^}]+) \} from "@\/sanity\/schema-types\/components\/([^"]+)";/g;
const TYPES_ARRAY_REGEX = /types: \[([^\]]+)\]/s;

/**
 * Extract existing page type imports
 */
function extractPageTypeImports(
  content: string
): Array<{ name: string; file: string }> {
  const imports: Array<{ name: string; file: string }> = [];
  const importRegex = new RegExp(PAGE_TYPE_IMPORT_REGEX);
  let match: RegExpExecArray | null = importRegex.exec(content);
  while (match !== null) {
    imports.push({ name: match[1] ?? "", file: match[2] ?? "" });
    match = importRegex.exec(content);
  }
  return imports;
}

/**
 * Add page type import to content
 */
function addPageTypeImport(
  content: string,
  name: string,
  fileName: string
): string {
  const lastPageTypeImport = content.lastIndexOf(
    'from "@/sanity/schema-types/page-types/'
  );
  if (lastPageTypeImport !== -1) {
    const endOfLine = content.indexOf("\n", lastPageTypeImport);
    const newImport = `import { ${name} } from "@/sanity/schema-types/page-types/${fileName}";\n`;
    return (
      content.slice(0, endOfLine + 1) + newImport + content.slice(endOfLine + 1)
    );
  }
  // Add after the first import
  const firstImportEnd = content.indexOf("\n", content.indexOf("import"));
  return (
    content.slice(0, firstImportEnd + 1) +
    `import { ${name} } from "@/sanity/schema-types/page-types/${fileName}";\n` +
    content.slice(firstImportEnd + 1)
  );
}

/**
 * Add page type to types array
 */
function addPageTypeToTypesArray(content: string, name: string): string {
  const typesRegex = new RegExp(TYPES_ARRAY_REGEX);
  const typesMatch = typesRegex.exec(content);
  if (!typesMatch) {
    return content;
  }

  const existingTypes =
    typesMatch[1]
      ?.split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0) ?? [];
  if (existingTypes.includes(name)) {
    return content;
  }

  // Insert before richTextType or siteSettings (core types)
  const insertIndex = existingTypes.findIndex(
    (t) => t === "richTextType" || t === "siteSettings"
  );
  if (insertIndex !== -1) {
    existingTypes.splice(insertIndex, 0, name);
  } else {
    existingTypes.push(name);
  }
  const newTypesString = existingTypes.join(", ");
  return content.replace(TYPES_ARRAY_REGEX, `types: [${newTypesString}]`);
}

/**
 * Update schema index.ts to add a new page type
 */
export function addPageTypeToSchemaIndex(name: string, fileName: string): void {
  const indexPath = join(process.cwd(), "src/sanity/schema-types/index.ts");
  let content = readFileSync(indexPath, "utf-8");

  // Add import if needed
  const imports = extractPageTypeImports(content);
  const hasImport = imports.some((imp) => imp.name === name);
  if (!hasImport) {
    content = addPageTypeImport(content, name, fileName);
  }

  // Add to types array
  content = addPageTypeToTypesArray(content, name);

  writeFileSync(indexPath, content, "utf-8");
}

/**
 * Extract existing component imports
 */
function extractComponentImports(
  content: string
): Array<{ name: string; file: string }> {
  const imports: Array<{ name: string; file: string }> = [];
  const importRegex = new RegExp(COMPONENT_IMPORT_REGEX);
  let match: RegExpExecArray | null = importRegex.exec(content);
  while (match !== null) {
    imports.push({ name: match[1] ?? "", file: match[2] ?? "" });
    match = importRegex.exec(content);
  }
  return imports;
}

/**
 * Add component import to content
 */
function addComponentImport(
  content: string,
  name: string,
  fileName: string
): string {
  const lastComponentImport = content.lastIndexOf(
    'from "@/sanity/schema-types/components/'
  );
  if (lastComponentImport !== -1) {
    const endOfLine = content.indexOf("\n", lastComponentImport);
    const newImport = `import { ${name} } from "@/sanity/schema-types/components/${fileName}";\n`;
    return (
      content.slice(0, endOfLine + 1) + newImport + content.slice(endOfLine + 1)
    );
  }
  // Add after the first import
  const firstImportEnd = content.indexOf("\n", content.indexOf("import"));
  return (
    content.slice(0, firstImportEnd + 1) +
    `import { ${name} } from "@/sanity/schema-types/components/${fileName}";\n` +
    content.slice(firstImportEnd + 1)
  );
}

/**
 * Add component to types array
 */
function addComponentToTypesArray(content: string, name: string): string {
  const typesRegex = new RegExp(TYPES_ARRAY_REGEX);
  const typesMatch = typesRegex.exec(content);
  if (!typesMatch) {
    return content;
  }

  const existingTypes =
    typesMatch[1]
      ?.split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0) ?? [];
  if (existingTypes.includes(name)) {
    return content;
  }

  // Insert at the beginning (components come before page types)
  existingTypes.unshift(name);
  const newTypesString = existingTypes.join(", ");
  return content.replace(TYPES_ARRAY_REGEX, `types: [${newTypesString}]`);
}

/**
 * Update schema index.ts to add a new component
 */
export function addComponentToSchemaIndex(
  name: string,
  fileName: string
): void {
  const indexPath = join(process.cwd(), "src/sanity/schema-types/index.ts");
  let content = readFileSync(indexPath, "utf-8");

  // Add import if needed
  const imports = extractComponentImports(content);
  const hasImport = imports.some((imp) => imp.name === name);
  if (!hasImport) {
    content = addComponentImport(content, name, fileName);
  }

  // Add to types array
  content = addComponentToTypesArray(content, name);

  writeFileSync(indexPath, content, "utf-8");
}
