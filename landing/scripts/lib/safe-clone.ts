import { mkdtemp, readdir, lstat, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ALLOWED_HOSTS = ["github.com", "gitlab.com", "bitbucket.org"];

/** Validates that a URL is HTTPS and points to an allowed git host. */
export function validateRepoUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid repository URL: ${url}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`Rejected non-HTTPS repository URL: ${url}`);
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new Error(`Rejected repository URL from untrusted host "${parsed.hostname}": ${url}`);
  }

  // Block credentials in URL
  if (parsed.username || parsed.password) {
    throw new Error(`Rejected repository URL with embedded credentials: ${url}`);
  }
}

/** Recursively checks for symlinks that escape the root directory. */
async function checkForSymlinks(dir: string, root: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Symlink detected in cloned repo: ${fullPath}`);
    }
    if (entry.isDirectory()) {
      await checkForSymlinks(fullPath, root);
    }
  }
}

/** Safely clones a git repo after URL validation and post-clone symlink check. */
export async function safeShallowClone(repoUrl: string, prefix: string): Promise<string> {
  validateRepoUrl(repoUrl);

  const tmpDir = await mkdtemp(join(tmpdir(), `icu-${prefix}-`));
  const cloneTarget = join(tmpDir, "repo");

  try {
    await execFileAsync("git", ["clone", "--depth", "1", repoUrl, cloneTarget], {
      timeout: 60_000,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0", // Prevent git from prompting for credentials
      },
    });

    // Post-clone: check for symlinks that could escape the directory
    await checkForSymlinks(cloneTarget, cloneTarget);

    return tmpDir;
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}
