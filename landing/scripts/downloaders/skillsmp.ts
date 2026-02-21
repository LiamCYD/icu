import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RateLimiter } from "../lib/rate-limiter";
import { RATE_LIMITS, USER_AGENT } from "../lib/config";
import type { DownloadResult, PackageInfo } from "../lib/types";

const execFileAsync = promisify(execFile);
const limiter = new RateLimiter(RATE_LIMITS.SkillsMP.requestsPerSecond);

interface SkillsmpSkill {
  id: string;
  name: string;
  description?: string;
  author?: string;
  stars?: number;
  tags?: string[];
  githubUrl?: string;
  skillUrl?: string;
}

interface SkillsmpSearchResponse {
  success: boolean;
  data: {
    skills: SkillsmpSkill[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
    };
  };
}

const SEARCH_QUERIES = [
  "mcp server",
  "ai agent",
  "claude tool",
  "security",
  "code analysis",
  "data pipeline",
  "web scraper",
  "api integration",
];

async function searchSkills(query: string, page: number): Promise<SkillsmpSearchResponse> {
  await limiter.acquire();
  const token = process.env.SKILLSMP_API_KEY;
  if (!token) throw new Error("SKILLSMP_API_KEY is required");

  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: "100",
    sortBy: "stars",
  });

  const res = await fetch(`https://skillsmp.com/api/v1/skills/search?${params}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`SkillsMP search failed: ${res.status}`);
  return (await res.json()) as SkillsmpSearchResponse;
}

async function shallowClone(repoUrl: string): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), "icu-skillsmp-"));
  await execFileAsync("git", ["clone", "--depth", "1", repoUrl, join(tmpDir, "repo")], {
    timeout: 60_000,
  });
  return tmpDir;
}

export async function* skillsmpDownloader(
  maxPackages?: number,
): AsyncGenerator<DownloadResult> {
  const cap = maxPackages ?? RATE_LIMITS.SkillsMP.maxPackages;

  if (!process.env.SKILLSMP_API_KEY) {
    console.warn("[skillsmp] SKILLSMP_API_KEY not set, skipping");
    return;
  }

  const seen = new Set<string>();
  let yielded = 0;

  for (const query of SEARCH_QUERIES) {
    if (yielded >= cap) break;
    let page = 1;

    while (yielded < cap) {
      let response: SkillsmpSearchResponse;
      try {
        response = await searchSkills(query, page);
      } catch (err) {
        console.error(`[skillsmp] Search failed for "${query}" page ${page}: ${err}`);
        break;
      }

      if (!response.success || response.data.skills.length === 0) break;

      for (const skill of response.data.skills) {
        if (yielded >= cap) break;

        const repoUrl = skill.githubUrl;
        if (!repoUrl || seen.has(repoUrl)) continue;
        seen.add(repoUrl);

        let tmpDir: string | undefined;
        try {
          const pkg: PackageInfo = {
            name: skill.name,
            version: "latest",
            description: skill.description,
            sourceUrl: repoUrl,
            authorName: skill.author,
            authorSlug: skill.author?.toLowerCase().replace(/\s+/g, "-"),
          };

          tmpDir = await shallowClone(repoUrl);
          yielded++;
          yield { packageInfo: pkg, extractedPath: tmpDir };
        } catch (err) {
          console.error(`[skillsmp] Failed to clone ${skill.name}: ${err}`);
          if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        }
      }

      if (!response.data.pagination.hasNext) break;
      page++;
    }
  }
}
