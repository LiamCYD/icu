import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RateLimiter } from "../lib/rate-limiter";
import { RATE_LIMITS, USER_AGENT } from "../lib/config";
import type { DownloadResult, PackageInfo } from "../lib/types";

const execFileAsync = promisify(execFile);
const limiter = new RateLimiter(RATE_LIMITS["MCP Registry"].requestsPerSecond);

interface McpRegistryServer {
  server: {
    name: string;
    description?: string;
    version?: string;
    title?: string;
    repository?: {
      url: string;
      source?: string;
      subfolder?: string;
    };
    packages?: Array<{
      registryType: string;
      identifier: string;
      version?: string;
    }>;
  };
  _meta?: Record<string, unknown>;
}

interface McpRegistryResponse {
  servers: McpRegistryServer[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

async function fetchPage(cursor?: string): Promise<McpRegistryResponse> {
  await limiter.acquire();
  const params = new URLSearchParams({ limit: "100" });
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `https://registry.modelcontextprotocol.io/v0.1/servers?${params}`,
    { headers: { "User-Agent": USER_AGENT } },
  );
  if (!res.ok) throw new Error(`MCP Registry API failed: ${res.status}`);
  return (await res.json()) as McpRegistryResponse;
}

function extractAuthor(name: string): string | undefined {
  // Names are reverse-DNS: "io.github.user/server-name"
  const parts = name.split("/");
  if (parts.length >= 2) {
    const domain = parts[0];
    const segments = domain.split(".");
    return segments[segments.length - 1]; // last segment is usually the username
  }
  return undefined;
}

async function shallowClone(repoUrl: string, subfolder?: string): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), "icu-mcpreg-"));
  const cloneTarget = join(tmpDir, "repo");
  await execFileAsync("git", ["clone", "--depth", "1", repoUrl, cloneTarget], {
    timeout: 60_000,
  });
  // If there's a subfolder, the scan path should still be the clone root
  // so the scanner can see all files
  return tmpDir;
}

export async function* mcpRegistryDownloader(
  maxPackages?: number,
): AsyncGenerator<DownloadResult> {
  const cap = maxPackages ?? RATE_LIMITS["MCP Registry"].maxPackages;
  let yielded = 0;
  let cursor: string | undefined;

  while (yielded < cap) {
    let page: McpRegistryResponse;
    try {
      page = await fetchPage(cursor);
    } catch (err) {
      console.error(`[mcp-registry] Failed to fetch page: ${err}`);
      break;
    }

    if (page.servers.length === 0) break;

    for (const entry of page.servers) {
      if (yielded >= cap) break;

      const repoUrl = entry.server.repository?.url;
      if (!repoUrl) continue; // Skip servers without source repos

      let tmpDir: string | undefined;
      try {
        const author = extractAuthor(entry.server.name);
        const pkg: PackageInfo = {
          name: entry.server.name,
          version: entry.server.version ?? "latest",
          description: entry.server.description,
          sourceUrl: repoUrl,
          authorName: author,
          authorSlug: author?.toLowerCase(),
        };

        tmpDir = await shallowClone(repoUrl, entry.server.repository?.subfolder);
        yielded++;
        yield { packageInfo: pkg, extractedPath: tmpDir };
      } catch (err) {
        console.error(`[mcp-registry] Failed to clone ${entry.server.name}: ${err}`);
        if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    if (!page.metadata.nextCursor) break;
    cursor = page.metadata.nextCursor;
  }
}
