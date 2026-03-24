import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import type { Plugin } from "vite";

const execAsync = promisify(exec);

const SCHEMA_WATCH_PATTERNS = [
  "sanity.config.{js,jsx,ts,tsx,mjs}",
  "src/sanity/schema-types/**/*.{js,jsx,ts,tsx}",
];

const DEBOUNCE_MS = 1000;

export function sanityTypegen(): Plugin {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isRunning = false;

  async function runTypegen() {
    if (isRunning) {
      return;
    }
    isRunning = true;
    try {
      console.log("[sanity-typegen] Extracting schema...");
      await execAsync("npx sanity schema extract");
      console.log("[sanity-typegen] Generating types...");
      await execAsync("npx sanity typegen generate");
      console.log("[sanity-typegen] Types updated.");
    } catch (err) {
      console.error("[sanity-typegen] Error:", (err as Error).message);
    } finally {
      isRunning = false;
    }
  }

  function scheduleRun() {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(runTypegen, DEBOUNCE_MS);
  }

  return {
    name: "sanity-typegen",
    apply: "serve",
    configureServer(server) {
      // Watch schema patterns via Vite's watcher
      for (const pattern of SCHEMA_WATCH_PATTERNS) {
        server.watcher.add(pattern);
      }

      // Run initial extraction if schema.json doesn't exist
      if (!existsSync("schema.json")) {
        runTypegen();
      }

      server.watcher.on("change", (file) => {
        if (file.includes("schema-types") || file.includes("sanity.config")) {
          scheduleRun();
        }
      });
    },
  };
}
