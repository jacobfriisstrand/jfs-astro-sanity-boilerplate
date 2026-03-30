import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RENDER_COMPONENT_PATH = "src/lib/components/render-component.astro";

// Markers in the file
const REACT_IMPORTS_MARKER = "// [REACT_IMPORTS]";
const REACT_MAP_START = "// [REACT_COMPONENTS_MAP]";
const REACT_MAP_END = "// [/REACT_COMPONENTS_MAP]";
const REACT_COMPONENTS_MAP_REGEX = /const REACT_COMPONENTS[^{]*\{([^}]*)\}/s;

/**
 * Convert camelCase to PascalCase
 */
function toPascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Add a React component import and mapping to render-component.astro
 */
export function addReactComponentToRenderer(
  name: string,
  fileName: string
): void {
  const filePath = join(process.cwd(), RENDER_COMPONENT_PATH);
  let content = readFileSync(filePath, "utf-8");

  const pascalName = toPascalCase(name);

  // Add import after the marker (named import)
  const importLine = `import { ${pascalName} } from "@/components/${fileName}.tsx";`;
  const importMarkerIndex = content.indexOf(REACT_IMPORTS_MARKER);
  if (importMarkerIndex !== -1 && !content.includes(importLine)) {
    const markerEnd = content.indexOf("\n", importMarkerIndex);
    content =
      content.slice(0, markerEnd + 1) +
      importLine +
      "\n" +
      content.slice(markerEnd + 1);
  }

  // Update the REACT_COMPONENTS map
  const mapStartIndex = content.indexOf(REACT_MAP_START);
  const mapEndIndex = content.indexOf(REACT_MAP_END);

  if (mapStartIndex !== -1 && mapEndIndex !== -1) {
    const beforeMap = content.slice(0, mapStartIndex + REACT_MAP_START.length);
    const afterMap = content.slice(mapEndIndex);

    // Extract existing map content
    const existingMapContent = content.slice(
      mapStartIndex + REACT_MAP_START.length,
      mapEndIndex
    );

    // Parse existing entries
    const entriesMatch = REACT_COMPONENTS_MAP_REGEX.exec(existingMapContent);
    let entries: string[] = [];
    if (entriesMatch?.[1]) {
      entries = entriesMatch[1]
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
    }

    // Add new entry if not exists
    const newEntry = `${name}: ${pascalName}`;
    if (!entries.some((e) => e.startsWith(`${name}:`))) {
      entries.push(newEntry);
    }

    // Rebuild the map with biome-ignore comment
    const entriesStr = entries.length > 0 ? ` ${entries.join(", ")} ` : "";
    const newMapContent = `\n// biome-ignore lint/suspicious/noExplicitAny: React components need flexible typing\nconst REACT_COMPONENTS: Record<string, any> = {${entriesStr}};\n`;

    content = beforeMap + newMapContent + afterMap;
  }

  writeFileSync(filePath, content, "utf-8");
}

/**
 * Remove a React component import and mapping from render-component.astro
 */
export function removeReactComponentFromRenderer(
  name: string,
  fileName: string
): void {
  const filePath = join(process.cwd(), RENDER_COMPONENT_PATH);
  let content = readFileSync(filePath, "utf-8");

  const pascalName = toPascalCase(name);

  // Remove import line (handles both named and default imports)
  const importRegex = new RegExp(
    String.raw`import\s+\{?\s*${pascalName}\s*\}?\s+from\s+["']@/components/${fileName}\.tsx["'];?\n?`,
    "g"
  );
  content = content.replace(importRegex, "");

  // Update the REACT_COMPONENTS map
  const mapStartIndex = content.indexOf(REACT_MAP_START);
  const mapEndIndex = content.indexOf(REACT_MAP_END);

  if (mapStartIndex !== -1 && mapEndIndex !== -1) {
    const beforeMap = content.slice(0, mapStartIndex + REACT_MAP_START.length);
    const afterMap = content.slice(mapEndIndex);

    // Extract existing map content
    const existingMapContent = content.slice(
      mapStartIndex + REACT_MAP_START.length,
      mapEndIndex
    );

    // Parse existing entries
    const entriesMatch = REACT_COMPONENTS_MAP_REGEX.exec(existingMapContent);
    let entries: string[] = [];
    if (entriesMatch?.[1]) {
      entries = entriesMatch[1]
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0 && !e.startsWith(`${name}:`));
    }

    // Rebuild the map with biome-ignore comment
    const entriesStr = entries.length > 0 ? ` ${entries.join(", ")} ` : "";
    const newMapContent = `\n// biome-ignore lint/suspicious/noExplicitAny: React components need flexible typing\nconst REACT_COMPONENTS: Record<string, any> = {${entriesStr}};\n`;

    content = beforeMap + newMapContent + afterMap;
  }

  writeFileSync(filePath, content, "utf-8");
}
