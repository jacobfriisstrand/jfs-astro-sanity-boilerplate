import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Parse @sanity/icons type definitions to extract available icon exports
 * Filters to only include *Icon exports (excludes Icon, IconComponent, etc.)
 */
export function parseAvailableIcons(): string[] {
  const iconsPath = join(
    process.cwd(),
    "node_modules/@sanity/icons/dist/index.d.ts"
  );

  const content = readFileSync(iconsPath, "utf-8");

  // Extract all icon exports - look for "declare const *Icon:"
  const iconMatches = content.matchAll(
    /declare const (\w+Icon): ForwardRefExoticComponent/g
  );

  const icons: string[] = [];
  const excluded = new Set([
    "Icon",
    "IconComponent",
    "IconMap",
    "IconProps",
    "IconSymbol",
    "icons",
  ]);

  for (const match of iconMatches) {
    const iconName = match[1];
    if (!excluded.has(iconName)) {
      icons.push(iconName);
    }
  }

  return icons.sort((a, b) => a.localeCompare(b));
}
