#!/usr/bin/env node

import { readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { select } from "@inquirer/prompts";
import { removeComponentFromRegistry } from "./utils/registry-remover.js";
import { removeReactComponentFromRenderer } from "./utils/render-component-updater.js";
import { removeComponentFromSchemaIndex } from "./utils/schema-index-remover.js";

// Regex patterns defined at top level for performance
const JSON_OBJECT_REGEX = /^\{[\s\S]*\}$/;

// Read registry to get available components
function getAvailableComponents(): Array<{ name: string; title: string }> {
  const registryPath = join(process.cwd(), "src/registry.ts");
  const content = readFileSync(registryPath, "utf-8");

  // Extract component names from COMPONENTS object
  const components: Array<{ name: string; title: string }> = [];
  const componentsStart = content.indexOf("export const COMPONENTS = {");
  if (componentsStart !== -1) {
    const componentsEnd = content.indexOf(
      "} as const satisfies Record<string, ComponentEntry>;",
      componentsStart
    );
    if (componentsEnd !== -1) {
      const componentsSection = content.slice(componentsStart, componentsEnd);
      const componentRegex = /(\w+):\s*\{\s*title:\s*"([^"]+)"/g;
      for (const match of componentsSection.matchAll(componentRegex)) {
        components.push({
          name: match[1] ?? "",
          title: match[2] ?? "",
        });
      }
    }
  }
  return components;
}

// Get file name and extension from component import path
function getComponentFileInfo(
  componentName: string
): { fileName: string; isReact: boolean } | null {
  const registryPath = join(process.cwd(), "src/registry.ts");
  const content = readFileSync(registryPath, "utf-8");

  // Match both .astro and .tsx extensions
  const importRegex = new RegExp(
    String.raw`${componentName}:\s*\{[^}]*component:\s*\(\)\s*=>\s*import\(["']@/components/([^"']+)\.(astro|tsx)["']\)`,
    "s"
  );
  const match = content.match(importRegex);
  if (!match) {
    return null;
  }
  return {
    fileName: match[1] ?? "",
    isReact: match[2] === "tsx",
  };
}

async function main() {
  console.log("Delete a Sanity component\n");

  // Get available components
  const availableComponents = getAvailableComponents();
  if (availableComponents.length === 0) {
    console.error("No components found.");
    process.exit(1);
  }

  // Prompt for component to delete
  const selectedComponent = await select({
    message: "Select a component to delete:",
    choices: availableComponents.map((comp) => ({
      value: comp.name,
      name: `${comp.title} (${comp.name})`,
    })),
  });

  // Get file info
  const fileInfo = getComponentFileInfo(selectedComponent);
  if (!fileInfo) {
    console.error(
      `Could not find file info for component ${selectedComponent}`
    );
    process.exit(1);
  }

  const { fileName, isReact } = fileInfo;

  console.log(`\nDeleting component: ${selectedComponent}...`);

  // Delete files
  const schemaPath = join(
    process.cwd(),
    "src/sanity/schema-types/components",
    `${fileName}.ts`
  );

  try {
    unlinkSync(schemaPath);
    console.log(`✓ Deleted ${schemaPath}`);
  } catch (error) {
    console.error(`✗ Error deleting schema file: ${error}`);
  }

  if (isReact) {
    // Delete React component
    const reactPath = join(process.cwd(), "src/components", `${fileName}.tsx`);
    try {
      unlinkSync(reactPath);
      console.log(`✓ Deleted ${reactPath}`);
    } catch (error) {
      console.error(`✗ Error deleting React component: ${error}`);
    }
    // Remove from render-component.astro
    removeReactComponentFromRenderer(selectedComponent, fileName);
    console.log("✓ Updated render-component.astro");
  } else {
    // Delete Astro component
    const astroPath = join(
      process.cwd(),
      "src/components",
      `${fileName}.astro`
    );
    try {
      unlinkSync(astroPath);
      console.log(`✓ Deleted ${astroPath}`);
    } catch (error) {
      console.error(`✗ Error deleting Astro component: ${error}`);
    }
  }

  // Update registry
  removeComponentFromRegistry(selectedComponent);
  console.log("✓ Updated registry.ts");

  // Update schema index
  removeComponentFromSchemaIndex(selectedComponent);
  console.log("✓ Updated schema index.ts");

  console.log("✓ Component deleted successfully");

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
