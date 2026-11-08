import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Regex patterns defined at top level for performance
const ICON_EXPORT_REGEX =
  /declare const (?<iconName>\w+Icon): ForwardRefExoticComponent/u;

/**
 * Parse @sanity/icons type declarations to extract available icon exports.
 *
 * Since @sanity/icons v5, the root entry only contains deprecated stubs
 * (`export declare const XxxIcon: never`); real icon components live in
 * per-icon files (dist/<Name>.d.ts), each exporting `XxxIcon` as a
 * ForwardRefExoticComponent.
 */
export function parseAvailableIcons(): string[] {
  const distDir = join(process.cwd(), "node_modules/@sanity/icons/dist");

  let files: string[];
  try {
    files = readdirSync(distDir);
  } catch {
    return [];
  }

  const icons: string[] = [];
  for (const file of files) {
    // Skip the root entry (deprecated stubs) and source maps
    if (!file.endsWith(".d.ts") || file === "index.d.ts") {
      continue;
    }
    const content = readFileSync(join(distDir, file), "utf-8");
    const match = ICON_EXPORT_REGEX.exec(content);
    if (match?.groups?.iconName) {
      icons.push(match.groups.iconName);
    }
  }

  return icons.sort((a, b) => a.localeCompare(b));
}
