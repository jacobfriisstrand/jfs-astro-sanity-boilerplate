import { spawn } from "node:child_process";

// Regex patterns defined at top level for performance
const JSON_OBJECT_REGEX = /^\{[\s\S]*\}$/u;

/**
 * Run `npm run typegen` (schema extract + typegen generate) with the noisy
 * import.meta warnings filtered out, so script output stays readable.
 */
export async function runTypegen(): Promise<void> {
  console.log("\nRunning typegen...");
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
}
