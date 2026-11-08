#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkbox, confirm, input, select } from "@inquirer/prompts";
import {
  generateAstroComponent,
  generateComponentSchema,
  generateReactComponent,
  SCHEMA_ORG_TYPES,
} from "./utils/file-generators.js";
import { runLintFix } from "./utils/lint-fix.js";
import { addComponentToRegistry } from "./utils/registry-updater.js";
import { addReactComponentToRenderer } from "./utils/render-component-updater.js";
import { addComponentToSchemaIndex } from "./utils/schema-index-updater.js";
import {
  fileExists,
  isValidCamelCase,
  isValidSnakeCase,
} from "./utils/validation.js";

// Regex patterns defined at top level for performance
const PAGE_TYPES_REGEX = /(?<name>\w+):\s*\{/gu;
const JSON_OBJECT_REGEX = /^\{[\s\S]*\}$/u;

// Read registry to get available page types
function getAvailablePageTypes(): string[] {
  const registryPath = join(process.cwd(), "src/registry.ts");
  const content = readFileSync(registryPath, "utf-8");

  // Extract page type names from PAGE_TYPES object
  const pageTypesRegex = PAGE_TYPES_REGEX;
  const pageTypes: string[] = [];
  let match: RegExpExecArray | null = pageTypesRegex.exec(content);
  while (match !== null) {
    // Check if it's in the PAGE_TYPES object (not COMPONENTS)
    const beforeMatch = content.slice(0, match.index);
    const pageTypesStart = beforeMatch.lastIndexOf("PAGE_TYPES");
    const componentsStart = beforeMatch.lastIndexOf("COMPONENTS");
    if (
      pageTypesStart !== -1 &&
      (componentsStart === -1 || pageTypesStart > componentsStart)
    ) {
      pageTypes.push(match.groups?.name ?? "");
    }
    match = pageTypesRegex.exec(content);
  }
  return pageTypes;
}

async function main() {
  console.log("Create a new Sanity component\n");

  // Prompt for component type
  const componentType = await select({
    choices: [
      { name: "Astro (.astro)", value: "astro" },
      { name: "React (.tsx) with client:load", value: "react" },
    ],
    message: "Component type:",
  });

  // Prompt for title
  const title = await input({
    message: "Component title:",
    validate: (value) => {
      if (!value.trim()) {
        return "Title is required";
      }
      return true;
    },
  });

  // Prompt for name (camelCase)
  const name = await input({
    message: "Component name (camelCase):",
    validate: (value) => {
      if (!value.trim()) {
        return "Name is required";
      }
      if (!isValidCamelCase(value)) {
        return "Name must be in camelCase (e.g., heroComponent)";
      }
      return true;
    },
  });

  // Prompt for file name (snake-case)
  const fileName = await input({
    message: "File name (snake-case):",
    validate: (value) => {
      if (!value.trim()) {
        return "File name is required";
      }
      if (!isValidSnakeCase(value)) {
        return "File name must be in snake-case (e.g., hero-component)";
      }
      // Check if files already exist
      const schemaPath = join(
        process.cwd(),
        "src/sanity/schema-types/components",
        `${value}.ts`
      );
      const astroPath = join(process.cwd(), "src/components", `${value}.astro`);
      const reactPath = join(process.cwd(), "src/components", `${value}.tsx`);
      if (fileExists(schemaPath)) {
        return `Schema file ${value}.ts already exists`;
      }
      if (componentType === "astro" && fileExists(astroPath)) {
        return `Astro component ${value}.astro already exists`;
      }
      if (componentType === "react" && fileExists(reactPath)) {
        return `React component ${value}.tsx already exists`;
      }
      return true;
    },
  });

  // Get available page types
  const availablePageTypes = getAvailablePageTypes();
  if (availablePageTypes.length === 0) {
    console.error("No page types found. Please create a page type first.");
    process.exit(1);
  }

  // Prompt for page types
  const selectedPageTypes = await checkbox({
    choices: availablePageTypes.map((pt) => ({
      name: pt,
      value: pt,
    })),
    message: "Select page types that can use this component:",
    validate: (value) => {
      if (value.length === 0) {
        return "At least one page type must be selected";
      }
      return true;
    },
  });

  // Prompt for media field
  const includeMedia = await confirm({
    default: false,
    message: "Include a media field?",
  });

  let mediaAllowedTypes: "both" | "image" | "video" = "both";
  if (includeMedia) {
    mediaAllowedTypes = await select({
      choices: [
        { name: "Both (image & video)", value: "both" as const },
        { name: "Image only", value: "image" as const },
        { name: "Video only", value: "video" as const },
      ],
      message: "Allowed media types:",
    });
  }

  // Prompt for JSON-LD structured data
  const includeJsonLd = await confirm({
    default: false,
    message:
      "Include JSON-LD structured data? (Recommended for content-semantic components like FAQs, products, events, team bios — not for layout/visual components like heroes, banners, CTAs)",
  });

  let jsonLdSchemaType: string | undefined;
  if (includeJsonLd) {
    jsonLdSchemaType = await select({
      choices: SCHEMA_ORG_TYPES.map((t) => ({
        name: t.name,
        value: t.value,
      })),
      message: "Schema.org type:",
    });
  }

  console.log("\nCreating component...");

  // Generate files
  const mediaConfig = includeMedia
    ? { allowedTypes: mediaAllowedTypes }
    : undefined;
  const jsonLdConfig = jsonLdSchemaType
    ? { schemaType: jsonLdSchemaType }
    : undefined;
  generateComponentSchema(name, title, fileName, mediaConfig);

  if (componentType === "react") {
    // Generate React component and update render-component.astro
    generateReactComponent(name, fileName, mediaConfig, jsonLdConfig);
    addReactComponentToRenderer(name, fileName);
    console.log(`✓ Created React component: src/components/${fileName}.tsx`);
    console.log("✓ Updated render-component.astro with client:load");
  } else {
    // Generate Astro component
    generateAstroComponent(name, fileName, mediaConfig, jsonLdConfig);
    console.log(`✓ Created Astro component: src/components/${fileName}.astro`);
  }

  if (jsonLdConfig) {
    console.log(`✓ Added JSON-LD structured data (${jsonLdConfig.schemaType})`);
  }

  // Update registry
  const isReact = componentType === "react";
  addComponentToRegistry(name, title, {
    fileName,
    isReact,
    pageTypes: selectedPageTypes,
  });

  // Update schema index
  addComponentToSchemaIndex(name, fileName);

  console.log("✓ Component created successfully");

  // Keep generated/updated files lint-clean (biome formatting + key order)
  runLintFix();

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
