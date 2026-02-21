import { readdir, lstat, realpath, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024; // 100MB

/** Check Content-Length before downloading. Returns the response if safe. */
export async function safeFetch(url: string, headers: Record<string, string>): Promise<Response> {
  const res = await fetch(url, { headers });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status}`);
  }

  const contentLength = res.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_DOWNLOAD_BYTES) {
    // Consume body to avoid hanging connection
    await res.body.cancel().catch(() => {});
    throw new Error(`Download too large: ${contentLength} bytes (max ${MAX_DOWNLOAD_BYTES})`);
  }

  return res;
}

/** Safely extract a tarball with path traversal and symlink protections. */
export async function safeExtractTarball(tarPath: string, destDir: string): Promise<void> {
  await execFileAsync("tar", [
    "xzf",
    tarPath,
    "-C",
    destDir,
    "--no-same-owner",
    "--no-same-permissions",
  ]);

  // Post-extraction: verify no symlinks and no path escapes
  await validateExtractedFiles(destDir);
}

/** Recursively validate that no files escape the root and no symlinks exist. */
async function validateExtractedFiles(dir: string): Promise<void> {
  const root = resolve(dir);
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const resolved = resolve(fullPath);

    // Check path doesn't escape root
    if (!resolved.startsWith(root)) {
      await rm(fullPath, { recursive: true, force: true }).catch(() => {});
      throw new Error(`Path traversal detected: ${fullPath} resolves outside ${root}`);
    }

    // Check for symlinks
    const stats = await lstat(fullPath);
    if (stats.isSymbolicLink()) {
      const target = await realpath(fullPath).catch(() => "unknown");
      await rm(fullPath, { force: true }).catch(() => {});
      throw new Error(`Symlink detected: ${fullPath} -> ${target}`);
    }

    if (stats.isDirectory()) {
      await validateExtractedFiles(fullPath);
    }
  }
}
