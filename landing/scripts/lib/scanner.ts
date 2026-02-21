import { execFile } from "node:child_process";
import { SCANNER_TIMEOUT_MS } from "./config";
import type { IcuScanOutput } from "./types";

export async function runIcuScan(targetPath: string): Promise<IcuScanOutput> {
  return new Promise((resolve, reject) => {
    const proc = execFile(
      "icu",
      ["scan", targetPath, "--format", "json", "--no-db", "--depth", "auto"],
      { timeout: SCANNER_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        // Exit codes 1/2 mean findings detected — not errors
        if (error && error.code !== null && (error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
          reject(new Error(`Scanner timed out after ${SCANNER_TIMEOUT_MS}ms`));
          return;
        }

        if (!stdout.trim()) {
          reject(new Error(`Scanner produced no output. stderr: ${stderr}`));
          return;
        }

        try {
          // Sanitize invalid Unicode escape sequences before parsing
          const sanitized = stdout.replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u");
          const output = JSON.parse(sanitized) as IcuScanOutput;
          resolve(output);
        } catch {
          // Exit code might be non-zero for findings but output should still be valid JSON
          if (error && error.killed) {
            reject(new Error("Scanner process was killed"));
            return;
          }
          reject(new Error(`Failed to parse scanner output: ${stdout.slice(0, 200)}`));
        }
      },
    );

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn scanner: ${err.message}`));
    });
  });
}
