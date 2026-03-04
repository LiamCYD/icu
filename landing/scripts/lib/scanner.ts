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
          // Strip lone Unicode surrogates (\uD800-\uDFFF) — PostgreSQL rejects these
          const cleaned = stdout.replace(
            /\\u[dD][89a-fA-F][0-9a-fA-F]{2}/g,
            "\\ufffd",
          );
          const output = JSON.parse(cleaned) as IcuScanOutput;
          resolve(output);
        } catch (parseErr) {
          if (error && error.killed) {
            reject(new Error("Scanner process was killed"));
            return;
          }
          // If the error is about invalid unicode escapes (e.g. \u00zz from
          // malformed source files), aggressively replace ALL \uXXXX sequences
          // that aren't valid 4-hex-digit escapes. We only do this on retry to
          // avoid the regex corrupting valid \\u sequences unnecessarily.
          const msg = parseErr instanceof Error ? parseErr.message : "";
          if (msg.includes("Unicode") || msg.includes("escape")) {
            try {
              // Replace ALL \uXXXX where XXXX isn't 4 valid hex digits.
              // This may also replace \\uXXXX (literal backslash + u) but
              // in the retry path the JSON is already unparseable, so a
              // minor data corruption is better than a total failure.
              const aggressive = stdout.replace(
                /\\u(?![0-9a-fA-F]{4})[0-9a-zA-Z]{0,4}/g,
                "\\ufffd",
              );
              const output = JSON.parse(aggressive) as IcuScanOutput;
              resolve(output);
              return;
            } catch {
              // Fall through to reject
            }
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
