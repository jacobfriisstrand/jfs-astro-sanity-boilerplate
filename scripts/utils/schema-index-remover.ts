import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Regex patterns defined at top level for performance
const TYPES_ARRAY_REGEX = /types: \[([^\]]+)\]/s;

/**
 * Remove page type from schema index.ts
 */
export function removePageTypeFromSchemaIndex(name: string): void {
  const indexPath = join(process.cwd(), "src/sanity/schema-types/index.ts");
  let content = readFileSync(indexPath, "utf-8");

  // Remove import
  const importRegex = new RegExp(
    String.raw`import \{ ${name} \} from "@/sanity/schema-types/page-types/[^"]+";\n?`,
    "g"
  );
  content = content.replace(importRegex, "");

  // Remove from schema.types array
  const typesRegex = new RegExp(TYPES_ARRAY_REGEX);
  const typesMatch = typesRegex.exec(content);
  if (typesMatch) {
    const existingTypes =
      typesMatch[1]
        ?.split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t !== name) ?? [];
    const newTypesString = existingTypes.join(", ");
    content = content.replace(typesRegex, `types: [${newTypesString}]`);
  }

  writeFileSync(indexPath, content, "utf-8");
}

/**
 * Remove component from schema index.ts
 */
export function removeComponentFromSchemaIndex(name: string): void {
  const indexPath = join(process.cwd(), "src/sanity/schema-types/index.ts");
  let content = readFileSync(indexPath, "utf-8");

  // Remove import
  const importRegex = new RegExp(
    String.raw`import \{ ${name} \} from "@/sanity/schema-types/components/[^"]+";\n?`,
    "g"
  );
  content = content.replace(importRegex, "");

  // Remove from schema.types array
  const typesRegex = new RegExp(TYPES_ARRAY_REGEX);
  const typesMatch = typesRegex.exec(content);
  if (typesMatch) {
    const existingTypes =
      typesMatch[1]
        ?.split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t !== name) ?? [];
    const newTypesString = existingTypes.join(", ");
    content = content.replace(typesRegex, `types: [${newTypesString}]`);
  }

  writeFileSync(indexPath, content, "utf-8");
}
