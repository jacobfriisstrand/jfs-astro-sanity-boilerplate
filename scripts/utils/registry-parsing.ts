/**
 * Order-agnostic registry entry parsing helpers.
 *
 * Biome (via ultracite) sorts object keys in registry entries
 * (useSortedKeys assist), so parsers must not assume `title` (or any
 * other key) comes first. Entries are matched by name with the full
 * body captured, then individual fields are extracted from the body.
 *
 * These helpers only work on flat entries (no nested braces), which is
 * the shape of PAGE_TYPES and COMPONENTS entries in src/registry.ts.
 */

const TITLE_IN_ENTRY_REGEX = /title:\s*"(?<title>[^"]+)"/u;
const PAGE_TYPES_IN_ENTRY_REGEX = /pageTypes:\s*\[(?<pageTypes>[^\]]*)\]/u;

export interface RegistryEntryMatch {
  body: string;
  name: string;
  title: string;
}

/**
 * Parse flat `{ name: { ... } }` entries from a registry section,
 * returning only entries that contain a `title` string.
 */
export function parseEntriesWithTitle(section: string): RegistryEntryMatch[] {
  const entries: RegistryEntryMatch[] = [];
  // Local regex instance: global regexes keep lastIndex state across calls.
  const entryRegex = /(?<name>\w+):\s*\{(?<body>[^}]*)\}/gu;
  let match: RegExpExecArray | null = entryRegex.exec(section);
  while (match !== null) {
    const name = match.groups?.name ?? "";
    const body = match.groups?.body ?? "";
    const title = TITLE_IN_ENTRY_REGEX.exec(body)?.groups?.title;
    if (title) {
      entries.push({ body, name, title });
    }
    match = entryRegex.exec(section);
  }
  return entries;
}

/**
 * Extract the pageTypes string array from a registry entry body.
 */
export function parsePageTypesFromEntryBody(body: string): string[] {
  const pageTypesMatch = PAGE_TYPES_IN_ENTRY_REGEX.exec(body);
  return (pageTypesMatch?.groups?.pageTypes ?? "")
    .split(",")
    .map((pageType) => pageType.trim().replaceAll('"', ""))
    .filter((pageType) => pageType.length > 0);
}
