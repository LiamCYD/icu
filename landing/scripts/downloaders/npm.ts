import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { RateLimiter } from "../lib/rate-limiter";
import { RATE_LIMITS, NPM_SEARCH_QUERIES, USER_AGENT } from "../lib/config";
import { safeFetch, safeExtractTarball } from "../lib/safe-extract";
import type { DownloadResult, PackageInfo } from "../lib/types";

const limiter = new RateLimiter(RATE_LIMITS.npm.requestsPerSecond);

interface NpmSearchResult {
  objects: Array<{
    package: {
      name: string;
      version: string;
      description?: string;
      links?: { repository?: string; npm?: string };
      publisher?: { username?: string };
    };
  }>;
}

async function searchNpm(query: string, size: number): Promise<PackageInfo[]> {
  await limiter.acquire();
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${size}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`npm search failed: ${res.status}`);
  const data = (await res.json()) as NpmSearchResult;
  return data.objects.map((o) => ({
    name: o.package.name,
    version: o.package.version,
    description: o.package.description,
    sourceUrl: o.package.links?.repository || o.package.links?.npm,
    authorName: o.package.publisher?.username,
    authorSlug: o.package.publisher?.username,
  }));
}

async function downloadTarball(packageName: string, version: string): Promise<string> {
  await limiter.acquire();
  const metaUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${version}`;
  const res = await fetch(metaUrl, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`npm metadata fetch failed: ${res.status}`);
  const meta = (await res.json()) as { dist: { tarball: string } };
  const tarballUrl = meta.dist.tarball;

  const tmpDir = await mkdtemp(join(tmpdir(), "icu-npm-"));
  const tarPath = join(tmpDir, "package.tgz");

  await limiter.acquire();
  const tarRes = await safeFetch(tarballUrl, { "User-Agent": USER_AGENT });
  await pipeline(tarRes.body as unknown as NodeJS.ReadableStream, createWriteStream(tarPath));

  await safeExtractTarball(tarPath, tmpDir);
  return tmpDir;
}

export async function* npmDownloader(
  maxPackages?: number,
): AsyncGenerator<DownloadResult> {
  const cap = maxPackages ?? RATE_LIMITS.npm.maxPackages;
  const seen = new Set<string>();
  let yielded = 0;

  for (const query of NPM_SEARCH_QUERIES) {
    if (yielded >= cap) break;
    try {
      const packages = await searchNpm(query, 250);
      for (const pkg of packages) {
        if (yielded >= cap) break;
        if (seen.has(pkg.name)) continue;
        seen.add(pkg.name);

        let tmpDir: string | undefined;
        try {
          tmpDir = await downloadTarball(pkg.name, pkg.version);
          yielded++;
          yield { packageInfo: pkg, extractedPath: tmpDir };
        } catch (err) {
          console.error(`[npm] Failed to download ${pkg.name}: ${err}`);
          if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        }
      }
    } catch (err) {
      console.error(`[npm] Search failed for query "${query}": ${err}`);
    }
  }
}
