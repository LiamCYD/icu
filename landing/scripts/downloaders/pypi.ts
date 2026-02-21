import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { RateLimiter } from "../lib/rate-limiter";
import { RATE_LIMITS, PYPI_PACKAGES, USER_AGENT } from "../lib/config";
import type { DownloadResult, PackageInfo } from "../lib/types";

const execFileAsync = promisify(execFile);
const limiter = new RateLimiter(RATE_LIMITS.PyPI.requestsPerSecond);

interface PyPIMetadata {
  info: {
    name: string;
    version: string;
    summary?: string;
    home_page?: string;
    project_urls?: Record<string, string>;
    author?: string;
  };
  urls: Array<{
    packagetype: string;
    url: string;
    filename: string;
  }>;
}

async function fetchMetadata(packageName: string): Promise<PyPIMetadata> {
  await limiter.acquire();
  const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`PyPI metadata fetch failed: ${res.status}`);
  return (await res.json()) as PyPIMetadata;
}

async function downloadSdist(meta: PyPIMetadata): Promise<string> {
  const sdist = meta.urls.find((u) => u.packagetype === "sdist" && u.filename.endsWith(".tar.gz"));
  if (!sdist) throw new Error("No sdist tarball available");

  const tmpDir = await mkdtemp(join(tmpdir(), "icu-pypi-"));
  const tarPath = join(tmpDir, sdist.filename);

  await limiter.acquire();
  const res = await fetch(sdist.url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok || !res.body) throw new Error(`Sdist download failed: ${res.status}`);
  await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(tarPath));

  await execFileAsync("tar", ["xzf", tarPath, "-C", tmpDir]);
  return tmpDir;
}

export async function* pypiDownloader(
  maxPackages?: number,
): AsyncGenerator<DownloadResult> {
  const cap = maxPackages ?? RATE_LIMITS.PyPI.maxPackages;
  let yielded = 0;

  for (const packageName of PYPI_PACKAGES) {
    if (yielded >= cap) break;

    let tmpDir: string | undefined;
    try {
      const meta = await fetchMetadata(packageName);
      const sourceUrl =
        meta.info.project_urls?.["Source"] ||
        meta.info.project_urls?.["Repository"] ||
        meta.info.home_page;

      const pkg: PackageInfo = {
        name: meta.info.name,
        version: meta.info.version,
        description: meta.info.summary,
        sourceUrl,
        authorName: meta.info.author || undefined,
        authorSlug: meta.info.author?.toLowerCase().replace(/\s+/g, "-"),
      };

      tmpDir = await downloadSdist(meta);
      yielded++;
      yield { packageInfo: pkg, extractedPath: tmpDir };
    } catch (err) {
      console.error(`[pypi] Failed to process ${packageName}: ${err}`);
      if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
