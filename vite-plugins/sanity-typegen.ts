import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

let typegenProcess: ReturnType<typeof spawn> | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

/**
 * Run Sanity typegen command
 */
function runTypegen(): void {
  // Clear any existing debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Debounce: wait 500ms after last change before running typegen
  debounceTimer = setTimeout(() => {
    // Kill any existing typegen process
    if (typegenProcess) {
      typegenProcess.kill();
      typegenProcess = null;
    }

    console.log("[sanity-typegen] Schema files changed, regenerating types...");

    typegenProcess = spawn("npm", ["run", "typegen"], {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: true,
    });

    typegenProcess.on("close", (code) => {
      if (code === 0) {
        console.log("[sanity-typegen] ✓ Types regenerated successfully");
      } else {
        console.error(`[sanity-typegen] ✗ Typegen failed with code ${code}`);
      }
      typegenProcess = null;
    });

    typegenProcess.on("error", (error) => {
      console.error("[sanity-typegen] ✗ Error running typegen:", error.message);
      typegenProcess = null;
    });
  }, 500);
}

/**
 * Vite plugin to automatically regenerate Sanity types when schema files change
 */
export function sanityTypegen(): Plugin {
  let watcher: ReturnType<typeof watch> | null = null;
  let isWatching = false;

  return {
    name: "sanity-typegen",
    buildStart() {
      // Only watch in dev mode, not during production builds
      if (process.env.NODE_ENV === "production") {
        return;
      }

      if (isWatching) {
        return;
      }
      isWatching = true;

      const schemaTypesPath = join(process.cwd(), "src/sanity/schema-types");

      console.log(
        `[sanity-typegen] Watching ${schemaTypesPath} for changes...`
      );

      watcher = watch(
        schemaTypesPath,
        { recursive: true },
        (_eventType, filename) => {
          // Only watch for TypeScript files
          if (
            filename &&
            (filename.endsWith(".ts") || filename.endsWith(".tsx"))
          ) {
            runTypegen();
          }
        }
      );

      watcher.on("error", (error) => {
        console.error("[sanity-typegen] Watcher error:", error);
      });
    },
    buildEnd() {
      if (watcher) {
        watcher.close();
        watcher = null;
        isWatching = false;
      }
      if (typegenProcess) {
        typegenProcess.kill();
        typegenProcess = null;
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    },
  };
}
