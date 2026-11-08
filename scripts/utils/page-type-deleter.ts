import { readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { runLintFix } from "./lint-fix.js";
import { removePageTypeFromRegistry } from "./registry-remover.js";
import { removePageTypeFromSchemaIndex } from "./schema-index-remover.js";
import { removeFixedPageTypeFromSlugPage } from "./slug-page-updater.js";
import { runTypegen } from "./typegen.js";
import { camelToKebab } from "./validation.js";

export interface DeletePageTypeOptions {
  runTypegen?: boolean;
}

/**
 * Get the schema file name for a page type from the schema index import
 */
export function getPageTypeFileName(pageTypeName: string): string | null {
  const indexPath = join(process.cwd(), "src/sanity/schema-types/index.ts");
  const content = readFileSync(indexPath, "utf-8");

  const importRegex = new RegExp(
    String.raw`import \{ ${pageTypeName} \} from ["']@/sanity/schema-types/page-types/(?<file>[^"']+)["'];`,
    "gu"
  );
  const match = importRegex.exec(content);
  return match?.groups?.file ?? null;
}

/**
 * Delete a page type from the codebase:
 * - schema file
 * - template file (fixed page types)
 * - registry entry
 * - schema index entry
 * - lint fix
 * - optional typegen
 *
 * Returns true if the page type was deleted, false when it was not found
 * (e.g. already deleted).
 */
export async function deletePageType(
  name: string,
  options?: DeletePageTypeOptions
): Promise<boolean> {
  const fileName = getPageTypeFileName(name);
  if (!fileName) {
    console.log(`✓ Page type ${name} not found (already deleted?)`);
    return false;
  }

  console.log(`\nDeleting page type: ${name}...`);

  // Delete schema file
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
    `_${camelToKebab(name)}.astro`
  );
  try {
    unlinkSync(templatePath);
    console.log(`✓ Deleted ${templatePath}`);
    // Also remove from [...slug].astro
    removeFixedPageTypeFromSlugPage(name);
    console.log("✓ Updated src/pages/[...slug].astro");
  } catch {
    // Template doesn't exist (flexible page type), ignore
  }

  // Update registry (only if it's a flexible page type)
  const wasInRegistry = removePageTypeFromRegistry(name);
  if (wasInRegistry) {
    console.log("✓ Updated registry.ts");
  } else {
    console.log("✓ Skipped registry update (fixed page type)");
  }

  // Update schema index
  removePageTypeFromSchemaIndex(name);
  console.log("✓ Updated schema index.ts");

  console.log("✓ Page type deleted successfully");

  // Keep generated/updated files lint-clean (biome formatting + key order)
  runLintFix();

  // Run typegen
  if (options?.runTypegen !== false) {
    await runTypegen();
  }

  return true;
}
