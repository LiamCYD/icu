import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RateLimiter } from "../lib/rate-limiter";
import { RATE_LIMITS, GLAMA_CURATED_REPOS, USER_AGENT } from "../lib/config";
import type { DownloadResult, PackageInfo } from "../lib/types";

const execFileAsync = promisify(execFile);
const limiter = new RateLimiter(RATE_LIMITS.Glama.requestsPerSecond);

interface GlamaServer {
  name: string;
  author: string;
  description?: string;
  repository?: string;
}

async function fetchServerList(): Promise<GlamaServer[]> {
  await limiter.acquire();
  const res = await fetch("https://glama.ai/mcp/servers", {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`Glama listing failed: ${res.status}`);
  const html = await res.text();

  // Extract server links from HTML: /mcp/servers/{author}/{name}
  const pattern = /\/mcp\/servers\/([^/"]+)\/([^/"]+)/g;
  const servers: GlamaServer[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const key = `${match[1]}/${match[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    servers.push({ author: match[1], name: match[2] });
  }

  return servers;
}

async function fetchServerMetadata(author: string, name: string): Promise<GlamaServer> {
  await limiter.acquire();
  const res = await fetch(`https://glama.ai/api/mcp/v1/servers/${author}/${name}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Glama metadata failed: ${res.status}`);
  return (await res.json()) as GlamaServer;
}

async function shallowClone(repoUrl: string): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), "icu-glama-"));
  await execFileAsync("git", ["clone", "--depth", "1", repoUrl, join(tmpDir, "repo")], {
    timeout: 60_000,
  });
  return tmpDir;
}

function curatedToPackages(): PackageInfo[] {
  return GLAMA_CURATED_REPOS.map((repo) => {
    const [author, name] = repo.split("/");
    return {
      name: repo,
      version: "latest",
      sourceUrl: `https://github.com/${repo}`,
      authorName: author,
      authorSlug: author.toLowerCase(),
    };
  });
}

export async function* glamaDownloader(
  maxPackages?: number,
): AsyncGenerator<DownloadResult> {
  const cap = maxPackages ?? RATE_LIMITS.Glama.maxPackages;
  let yielded = 0;

  let servers: GlamaServer[];
  try {
    servers = await fetchServerList();
    console.log(`[glama] Found ${servers.length} servers from listing`);
  } catch (err) {
    console.warn(`[glama] Listing scrape failed, using curated list: ${err}`);
    const curated = curatedToPackages();
    for (const pkg of curated) {
      if (yielded >= cap) break;
      let tmpDir: string | undefined;
      try {
        tmpDir = await shallowClone(pkg.sourceUrl!);
        yielded++;
        yield { packageInfo: pkg, extractedPath: tmpDir };
      } catch (cloneErr) {
        console.error(`[glama] Failed to clone ${pkg.name}: ${cloneErr}`);
        if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }
    return;
  }

  for (const server of servers) {
    if (yielded >= cap) break;

    let tmpDir: string | undefined;
    try {
      const meta = await fetchServerMetadata(server.author, server.name);
      const repoUrl = meta.repository || `https://github.com/${server.author}/${server.name}`;

      const pkg: PackageInfo = {
        name: `${server.author}/${server.name}`,
        version: "latest",
        description: meta.description,
        sourceUrl: repoUrl,
        authorName: server.author,
        authorSlug: server.author.toLowerCase(),
      };

      tmpDir = await shallowClone(repoUrl);
      yielded++;
      yield { packageInfo: pkg, extractedPath: tmpDir };
    } catch (err) {
      console.error(`[glama] Failed to process ${server.author}/${server.name}: ${err}`);
      if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
