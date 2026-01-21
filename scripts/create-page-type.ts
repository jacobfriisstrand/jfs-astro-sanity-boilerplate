#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkbox, input, search, select } from "@inquirer/prompts";
import {
  generateFixedPageTypeSchema,
  generateFixedPageTypeTemplate,
  generatePageTypeSchema,
} from "./utils/file-generators.js";
import { parseAvailableIcons } from "./utils/parse-icons.js";
import {
  addFixedPageTypeToRegistry,
  addPageTypeToComponents,
  addPageTypeToRegistry,
} from "./utils/registry-updater.js";
import { addPageTypeToSchemaIndex } from "./utils/schema-index-updater.js";
import { addFixedPageTypeToSlugPage } from "./utils/slug-page-updater.js";
import {
  fileExists,
  isValidCamelCase,
  isValidSnakeCase,
} from "./utils/validation.js";

// Regex patterns defined at top level for performance
const JSON_OBJECT_REGEX = /^\{[\s\S]*\}$/;
const COMPONENT_REGEX = /(\w+):\s*\{\s*title:\s*"([^"]+)"/g;

/**
 * Get available components from registry
 */
function getAvailableComponents(): Array<{ name: string; title: string }> {
  const registryPath = join(process.cwd(), "src/registry.ts");
  const content = readFileSync(registryPath, "utf-8");

  const componentsStart = content.indexOf("export const COMPONENTS = {");
  const componentsEnd = content.indexOf(
    "} as const satisfies",
    componentsStart
  );
  if (componentsStart === -1 || componentsEnd === -1) {
    return [];
  }

  const componentsSection = content.slice(componentsStart, componentsEnd);
  const components: Array<{ name: string; title: string }> = [];

  for (const match of componentsSection.matchAll(COMPONENT_REGEX)) {
    components.push({
      name: match[1] ?? "",
      title: match[2] ?? "",
    });
  }

  return components;
}

async function main() {
  console.log("Create a new Sanity page type\n");

  // Prompt for title
  const title = await input({
    message: "Page type title:",
    validate: (value) => {
      if (!value.trim()) {
        return "Title is required";
      }
      return true;
    },
  });

  // Prompt for name (camelCase)
  const name = await input({
    message: "Page type name (camelCase):",
    validate: (value) => {
      if (!value.trim()) {
        return "Name is required";
      }
      if (!isValidCamelCase(value)) {
        return "Name must be in camelCase (e.g., pageTypeOne)";
      }
      return true;
    },
  });

  // Prompt for file name (snake-case, will be suffixed with -page-type)
  const fileNameBase = await input({
    message: "File name (snake-case):",
    transformer: (value, { isFinal }) => {
      const suffix = "-page-type";
      if (isFinal) {
        return value ? `${value}${suffix}` : "";
      }
      // Show suffix in dim color as user types
      return value ? `${value}\x1b[2m${suffix}\x1b[0m` : "";
    },
    validate: (value) => {
      if (!value.trim()) {
        return "File name is required";
      }
      if (!isValidSnakeCase(value)) {
        return "File name must be in snake-case (e.g., event, blog-post)";
      }
      // Check if file already exists (with suffix)
      const fullFileName = `${value}-page-type`;
      const filePath = join(
        process.cwd(),
        "src/sanity/schema-types/page-types",
        `${fullFileName}.ts`
      );
      if (fileExists(filePath)) {
        return `File ${fullFileName}.ts already exists`;
      }
      return true;
    },
  });
  const fileName = `${fileNameBase}-page-type`;

  // Prompt for page type style
  const pageTypeStyle = await select({
    message: "Page type style:",
    choices: [
      {
        value: "flexible",
        name: "Flexible - Editor can add/remove components dynamically",
      },
      {
        value: "fixed",
        name: "Fixed - Predefined component structure (e.g., article, event)",
      },
    ],
  });

  // Prompt for optional structure title (e.g., "Events" for "Event" page type)
  const structureTitle = await input({
    message: "Structure menu title (optional, e.g., 'Events' for 'Event'):",
    default: "",
  });

  // Get available icons
  const availableIcons = parseAvailableIcons();

  // Prompt for icon (searchable)
  const iconName = await search({
    message: "Select an icon (type to search):",
    source: (term) => {
      const searchTerm = (term ?? "").toLowerCase();
      const filtered = availableIcons.filter((icon) =>
        icon.toLowerCase().includes(searchTerm)
      );
      return Promise.resolve(
        filtered.map((icon) => ({
          value: icon,
          name: icon,
        }))
      );
    },
  });

  // For flexible page types, optionally select components
  let selectedComponents: string[] = [];
  if (pageTypeStyle === "flexible") {
    const availableComponents = getAvailableComponents();
    if (availableComponents.length > 0) {
      selectedComponents = await checkbox({
        message: "Select components for this page type (optional):",
        choices: availableComponents.map((comp) => ({
          value: comp.name,
          name: `${comp.title} (${comp.name})`,
        })),
      });
    }
  }

  console.log("\nCreating page type...");

  // Generate files and update registry
  if (pageTypeStyle === "flexible") {
    generatePageTypeSchema(name, title, iconName, fileName);
    addPageTypeToRegistry(name, title, iconName, structureTitle || undefined);
    if (selectedComponents.length > 0) {
      addPageTypeToComponents(name, selectedComponents);
      console.log(`✓ Added to components: ${selectedComponents.join(", ")}`);
    }
  } else {
    // Generate schema and template for fixed page type
    generateFixedPageTypeSchema({ name, title, iconName, fileName });
    generateFixedPageTypeTemplate(name, title, fileName);
    addFixedPageTypeToRegistry(
      name,
      title,
      iconName,
      structureTitle || undefined
    );
    addFixedPageTypeToSlugPage(name);
    console.log(`✓ Created template at src/pages/_${name}.astro`);
    console.log("✓ Updated src/pages/[slug].astro");
  }

  // Update schema index (both types)
  addPageTypeToSchemaIndex(name, fileName);

  console.log("✓ Page type created successfully");

  // Run typegen
  console.log("\nRunning typegen...");
  try {
    const { spawn } = await import("node:child_process");

    const child = spawn("npm", ["run", "typegen"], {
      cwd: process.cwd(),
      stdio: ["inherit", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // Filter stdout for import.meta warnings
    child.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (
          !(
            line.includes('"import.meta" is not available') ||
            line.includes('"column":') ||
            line.includes('"file":') ||
            line.includes('"lineText":') ||
            line.includes('"length":') ||
            line.includes('"namespace":') ||
            line.includes('"suggestion":') ||
            JSON_OBJECT_REGEX.test(trimmed)
          )
        ) {
          stdout += `${line}\n`;
        }
      }
    });

    // Filter stderr
    child.stderr?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (
          !(
            line.includes('"import.meta" is not available') ||
            line.includes('"column":') ||
            line.includes('"file":') ||
            line.includes('"lineText":') ||
            line.includes('"length":') ||
            line.includes('"namespace":') ||
            line.includes('"suggestion":') ||
            JSON_OBJECT_REGEX.test(trimmed) ||
            line.includes("DEP0190")
          )
        ) {
          stderr += `${line}\n`;
        }
      }
    });

    const exitCode = await new Promise<number>((resolve) => {
      child.on("close", (code) => {
        resolve(code ?? 0);
      });
    });

    // Write filtered output
    if (stdout.trim()) {
      process.stdout.write(stdout);
    }
    if (stderr.trim()) {
      process.stderr.write(stderr);
    }

    if (exitCode !== 0) {
      throw new Error(`typegen exited with code ${exitCode}`);
    }

    console.log("✓ Types generated successfully");
  } catch (error) {
    console.error("✗ Error running typegen:", error);
    process.exit(1);
  }
}

try {
  await main();
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
