import { spawnSync } from "node:child_process";

/**
 * Run ultracite's fixer after scripts mutate source files, so generated
 * code (key order, formatting) is lint-clean immediately — matching what
 * `npx ultracite check` / CI expect.
 */
export function runLintFix(): void {
  const result = spawnSync("npx", ["--no-install", "ultracite", "fix"], {
    encoding: "utf-8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    console.warn(
      "⚠ ultracite fix failed or is unavailable — run `npx ultracite fix` manually"
    );
  }
}
