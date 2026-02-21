import { rm } from "node:fs/promises";
import { RateLimiter } from "../lib/rate-limiter";
import { RATE_LIMITS, USER_AGENT } from "../lib/config";
import { safeShallowClone } from "../lib/safe-clone";
import type { DownloadResult, PackageInfo } from "../lib/types";

const limiter = new RateLimiter(RATE_LIMITS.PulseMCP.requestsPerSecond);

interface PulseMcpServer {
  server: {
    name: string;
    title?: string;
    description?: string;
    version?: string;
    repository?: {
      url: string;
      source?: string;
    };
  };
  _meta?: Record<string, unknown>;
}

interface PulseMcpResponse {
  servers: PulseMcpServer[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

async function fetchPage(cursor?: string): Promise<PulseMcpResponse> {
  await limiter.acquire();
  const apiKey = process.env.PULSEMCP_API_KEY;
  if (!apiKey) throw new Error("PULSEMCP_API_KEY is required");

  const params = new URLSearchParams({ limit: "100" });
  if (cursor) params.set("cursor", cursor);

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "X-API-Key": apiKey,
  };
  const tenantId = process.env.PULSEMCP_TENANT_ID;
  if (tenantId) headers["X-Tenant-ID"] = tenantId;

  const res = await fetch(`https://api.pulsemcp.com/v0.1/servers?${params}`, { headers });
  if (!res.ok) throw new Error(`PulseMCP API failed: ${res.status}`);
  return (await res.json()) as PulseMcpResponse;
}

function extractAuthor(name: string): string | undefined {
  const parts = name.split("/");
  if (parts.length >= 2) {
    const domain = parts[0];
    const segments = domain.split(".");
    return segments[segments.length - 1];
  }
  return undefined;
}

export async function* pulsemcpDownloader(
  maxPackages?: number,
): AsyncGenerator<DownloadResult> {
  const cap = maxPackages ?? RATE_LIMITS.PulseMCP.maxPackages;

  if (!process.env.PULSEMCP_API_KEY) {
    console.warn("[pulsemcp] PULSEMCP_API_KEY not set, skipping");
    return;
  }

  let yielded = 0;
  let cursor: string | undefined;

  while (yielded < cap) {
    let page: PulseMcpResponse;
    try {
      page = await fetchPage(cursor);
    } catch (err) {
      console.error(`[pulsemcp] Failed to fetch page: ${err}`);
      break;
    }

    if (page.servers.length === 0) break;

    for (const entry of page.servers) {
      if (yielded >= cap) break;

      const repoUrl = entry.server.repository?.url;
      if (!repoUrl) continue;

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

        tmpDir = await safeShallowClone(repoUrl, "pulsemcp");
        yielded++;
        yield { packageInfo: pkg, extractedPath: tmpDir };
      } catch (err) {
        console.error(`[pulsemcp] Failed to clone ${entry.server.name}: ${err}`);
        if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    if (!page.metadata.nextCursor) break;
    cursor = page.metadata.nextCursor;
  }
}
