import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SLUG_PAGE_PATH = "src/pages/[slug].astro";

// Markers in the file
const IMPORT_MARKER =
  "// Fixed page type templates - import and add new ones here";
const UNKNOWN_FALLBACK = "<p>Unknown fixed page type: {page._type}</p>";
const SANITY_TYPES_IMPORT_REGEX =
  /import\s+type\s*\{([^}]+)\}\s*from\s*["']sanity\.types["'];?/;
const SANITY_IMPORT_REGEX =
  /import\s+type\s*\{[^}]+\}\s*from\s*["']sanity["'];?\n/;
const SANITY_TYPES_IMPORT_LINE_REGEX =
  /import\s+type\s*\{[^}]+\}\s*from\s*["']sanity\.types["'];?\n?/;

/**
 * Convert camelCase to PascalCase
 */
function toPascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Add type import from sanity.types
 */
function addSanityTypeImport(content: string, typeName: string): string {
  const match = SANITY_TYPES_IMPORT_REGEX.exec(content);

  if (match) {
    // Check if type already imported
    const existingTypes = match[1].split(",").map((t) => t.trim());
    if (existingTypes.includes(typeName)) {
      return content;
    }
    // Add to existing import
    const newTypes = [...existingTypes, typeName]
      .sort((a, b) => a.localeCompare(b))
      .join(", ");
    return content.replace(
      match[0],
      `import type { ${newTypes} } from "sanity.types";`
    );
  }

  // Add new import after "sanity" import
  const sanityImportMatch = SANITY_IMPORT_REGEX.exec(content);
  if (sanityImportMatch) {
    const insertPos = sanityImportMatch.index + sanityImportMatch[0].length;
    return (
      content.slice(0, insertPos) +
      `import type { ${typeName} } from "sanity.types";\n` +
      content.slice(insertPos)
    );
  }

  return content;
}

/**
 * Remove type from sanity.types import
 */
function removeSanityTypeImport(content: string, typeName: string): string {
  const match = SANITY_TYPES_IMPORT_REGEX.exec(content);
  if (!match) {
    return content;
  }

  const existingTypes = match[1]
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t !== typeName);

  if (existingTypes.length === 0) {
    // Remove entire import line
    return content.replace(SANITY_TYPES_IMPORT_LINE_REGEX, "");
  }

  return content.replace(
    match[0],
    `import type { ${existingTypes.join(", ")} } from "sanity.types";`
  );
}

/**
 * Find closing paren index accounting for nesting
 */
function findClosingParen(str: string): number {
  let depth = 1;
  for (let i = 0; i < str.length; i += 1) {
    const char = str[i];
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Remove case pattern from content
 */
function removeCaseFromContent(
  content: string,
  name: string,
  componentName: string
): string {
  const casePattern = String.raw`page\._type\s*===\s*"${name}"\s*\?\s*\([\s\S]*?<${componentName}[\s\S]*?\/>\s*\)\s*:\s*\(?`;
  const caseRegex = new RegExp(casePattern, "g");
  const match = caseRegex.exec(content);

  if (!match) {
    return content;
  }

  const beforeMatch = content.slice(0, match.index);
  const afterMatch = content.slice(match.index + match[0].length);

  // If the match ended with "(", we need to also remove the closing ")"
  if (!match[0].endsWith("(")) {
    return beforeMatch + afterMatch;
  }

  const closeIndex = findClosingParen(afterMatch);
  if (closeIndex === -1) {
    return beforeMatch + afterMatch;
  }

  // Remove the closing paren
  return (
    beforeMatch +
    afterMatch.slice(0, closeIndex) +
    afterMatch.slice(closeIndex + 1)
  );
}

/**
 * Add fixed page type import and case to [slug].astro
 */
export function addFixedPageTypeToSlugPage(name: string): void {
  const filePath = join(process.cwd(), SLUG_PAGE_PATH);
  let content = readFileSync(filePath, "utf-8");

  const pascalName = toPascalCase(name);
  const componentName = `${pascalName}PageType`;

  // Add type import from sanity.types
  content = addSanityTypeImport(content, pascalName);

  // Add component import after the marker comment
  const importLine = `import ${componentName} from "@/pages/_${name}.astro";`;
  const markerIndex = content.indexOf(IMPORT_MARKER);
  if (markerIndex !== -1) {
    const markerEnd = content.indexOf("\n", markerIndex);
    // Check if import already exists
    if (!content.includes(importLine)) {
      content =
        content.slice(0, markerEnd + 1) +
        importLine +
        "\n" +
        content.slice(markerEnd + 1);
    }
  }

  // Add case before the unknown fallback (with type assertion)
  const caseCode = `page._type === "${name}" ? (\n        <${componentName} page={page as ${pascalName}} />\n      ) : `;
  const fallbackIndex = content.indexOf(UNKNOWN_FALLBACK);
  // Check if case already exists before adding
  if (fallbackIndex !== -1 && !content.includes(`page._type === "${name}"`)) {
    content =
      content.slice(0, fallbackIndex) + caseCode + content.slice(fallbackIndex);
  }

  writeFileSync(filePath, content, "utf-8");
}

/**
 * Remove fixed page type import and case from [slug].astro
 */
export function removeFixedPageTypeFromSlugPage(name: string): void {
  const filePath = join(process.cwd(), SLUG_PAGE_PATH);
  let content = readFileSync(filePath, "utf-8");

  const pascalName = toPascalCase(name);
  const componentName = `${pascalName}PageType`;

  // Remove type import from sanity.types
  content = removeSanityTypeImport(content, pascalName);

  // Remove component import line
  const importRegex = new RegExp(
    String.raw`import\s+${componentName}\s+from\s+["']@/pages/_${name}\.astro["'];?\n?`,
    "g"
  );
  content = content.replace(importRegex, "");

  // Remove case from template
  content = removeCaseFromContent(content, name, componentName);

  writeFileSync(filePath, content, "utf-8");
}
