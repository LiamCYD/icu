import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RateLimiter } from "../lib/rate-limiter";
import { RATE_LIMITS, USER_AGENT } from "../lib/config";
import type { DownloadResult, PackageInfo } from "../lib/types";

const execFileAsync = promisify(execFile);
const limiter = new RateLimiter(RATE_LIMITS.Smithery.requestsPerSecond);

interface SmitheryServer {
  qualifiedName: string;
  displayName?: string;
  description?: string;
  repository?: string;
  createdAt?: string;
  vendor?: string;
}

interface SmitheryPage {
  servers: SmitheryServer[];
  pagination: { currentPage: number; pageSize: number; totalPages: number; totalCount: number };
}

async function fetchPage(page: number): Promise<SmitheryPage> {
  await limiter.acquire();
  const token = process.env.SMITHERY_API_TOKEN;
  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(
    `https://registry.smithery.ai/servers?q=&pageSize=50&page=${page}`,
    { headers },
  );
  if (!res.ok) throw new Error(`Smithery API failed: ${res.status}`);
  return (await res.json()) as SmitheryPage;
}

function extractGithubUrl(server: SmitheryServer): string | undefined {
  if (server.repository) return server.repository;
  // qualifiedName is often "owner/repo"
  if (server.qualifiedName.includes("/")) {
    return `https://github.com/${server.qualifiedName}`;
  }
  return undefined;
}

async function shallowClone(repoUrl: string): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), "icu-smithery-"));
  await execFileAsync("git", ["clone", "--depth", "1", repoUrl, join(tmpDir, "repo")], {
    timeout: 60_000,
  });
  return tmpDir;
}

export async function* smitheryDownloader(
  maxPackages?: number,
): AsyncGenerator<DownloadResult> {
  const cap = maxPackages ?? RATE_LIMITS.Smithery.maxPackages;
  let yielded = 0;
  let page = 1;

  while (yielded < cap) {
    let pageData: SmitheryPage;
    try {
      pageData = await fetchPage(page);
    } catch (err) {
      console.error(`[smithery] Failed to fetch page ${page}: ${err}`);
      break;
    }

    if (pageData.servers.length === 0) break;

    for (const server of pageData.servers) {
      if (yielded >= cap) break;

      const repoUrl = extractGithubUrl(server);
      if (!repoUrl) {
        console.warn(`[smithery] No repo URL for ${server.qualifiedName}, skipping`);
        continue;
      }

      let tmpDir: string | undefined;
      try {
        const parts = server.qualifiedName.split("/");
        const pkg: PackageInfo = {
          name: server.qualifiedName,
          version: "latest",
          description: server.description,
          sourceUrl: repoUrl,
          authorName: server.vendor || parts[0],
          authorSlug: (server.vendor || parts[0])?.toLowerCase(),
        };

        tmpDir = await shallowClone(repoUrl);
        yielded++;
        yield { packageInfo: pkg, extractedPath: tmpDir };
      } catch (err) {
        console.error(`[smithery] Failed to clone ${server.qualifiedName}: ${err}`);
        if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    if (page >= pageData.pagination.totalPages) break;
    page++;
  }
}
