import "dotenv/config";
import { rm } from "node:fs/promises";
import { relative } from "node:path";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

neonConfig.webSocketConstructor = ws;
import { MARKETPLACES, SCAN_STALENESS_HOURS } from "./lib/config";
import { runIcuScan } from "./lib/scanner";
import { categoryFromRuleId, normalizeSeverity, worstRisk } from "./lib/rule-category-map";
import { scoreConfidence } from "./lib/confidence";
import { recomputeStats } from "./lib/stats";
import { npmDownloader } from "./downloaders/npm";
import { pypiDownloader } from "./downloaders/pypi";
import { smitheryDownloader } from "./downloaders/smithery";
import { glamaDownloader } from "./downloaders/glama";
import { mcpRegistryDownloader } from "./downloaders/mcp-registry";
import { skillsmpDownloader } from "./downloaders/skillsmp";
import { pulsemcpDownloader } from "./downloaders/pulsemcp";
import type { MarketplaceName, DownloadResult, ScrapeResult } from "./lib/types";

function createPrisma(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const ENV_MARKETPLACE = process.env.MARKETPLACE as MarketplaceName | undefined;
const ENV_MAX_PACKAGES = process.env.MAX_PACKAGES ? parseInt(process.env.MAX_PACKAGES) : undefined;

function getDownloader(name: MarketplaceName, max?: number): AsyncGenerator<DownloadResult> {
  switch (name) {
    case "npm":
      return npmDownloader(max);
    case "PyPI":
      return pypiDownloader(max);
    case "Smithery":
      return smitheryDownloader(max);
    case "Glama":
      return glamaDownloader(max);
    case "MCP Registry":
      return mcpRegistryDownloader(max);
    case "SkillsMP":
      return skillsmpDownloader(max);
    case "PulseMCP":
      return pulsemcpDownloader(max);
  }
}

async function upsertMarketplaces(prisma: PrismaClient) {
  for (const [, def] of Object.entries(MARKETPLACES)) {
    await prisma.marketplace.upsert({
      where: { name: def.name },
      create: { name: def.name, url: def.url, description: def.description },
      update: { url: def.url, description: def.description },
    });
  }
}

async function isRecentlyScanned(prisma: PrismaClient, packageName: string, marketplaceId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - SCAN_STALENESS_HOURS * 60 * 60 * 1000);
  const pkg = await prisma.package.findFirst({
    where: {
      name: packageName,
      marketplaceId,
      lastScanned: { gte: cutoff },
    },
  });
  return pkg !== null;
}

async function processPackage(
  prisma: PrismaClient,
  download: DownloadResult,
  marketplaceId: string,
): Promise<ScrapeResult> {
  const { packageInfo, extractedPath } = download;

  try {
    // Check idempotency
    if (await isRecentlyScanned(prisma, packageInfo.name, marketplaceId)) {
      return { packageName: packageInfo.name, status: "skipped" };
    }

    // Upsert author
    let authorId: string | undefined;
    if (packageInfo.authorName) {
      const author = await prisma.author.upsert({
        where: {
          name_marketplaceSlug: {
            name: packageInfo.authorName,
            marketplaceSlug: packageInfo.authorSlug ?? "",
          },
        },
        create: {
          name: packageInfo.authorName,
          marketplaceSlug: packageInfo.authorSlug,
          profileUrl: packageInfo.authorProfileUrl,
        },
        update: {
          lastSeen: new Date(),
          profileUrl: packageInfo.authorProfileUrl || undefined,
        },
      });
      authorId = author.id;
    }

    // Run scanner
    const scanOutput = await runIcuScan(extractedPath);

    // Normalize risk level from scanner output
    const fileRisks = scanOutput.results.map((r) => normalizeSeverity(r.risk_level));
    const overallRisk = fileRisks.length > 0 ? worstRisk(fileRisks) : "clean";

    // Upsert package
    const pkg = await prisma.package.upsert({
      where: {
        name_version_marketplaceId: {
          name: packageInfo.name,
          version: packageInfo.version,
          marketplaceId,
        },
      },
      create: {
        name: packageInfo.name,
        version: packageInfo.version,
        description: packageInfo.description,
        sourceUrl: packageInfo.sourceUrl,
        riskLevel: overallRisk,
        marketplaceId,
        authorId,
        lastScanned: new Date(),
      },
      update: {
        riskLevel: overallRisk,
        lastScanned: new Date(),
        description: packageInfo.description || undefined,
        sourceUrl: packageInfo.sourceUrl || undefined,
        authorId: authorId || undefined,
      },
    });

    // Create scan
    const scan = await prisma.scan.create({
      data: {
        packageId: pkg.id,
        scanDuration: scanOutput.summary.scan_duration,
        filesScanned: scanOutput.summary.total_files,
        riskLevel: overallRisk,
        rawOutput: JSON.parse(JSON.stringify(scanOutput)),
      },
    });

    // Create findings
    let findingsCount = 0;
    for (const fileResult of scanOutput.results) {
      const filePath = fileResult.file
        ? relative(extractedPath, fileResult.file) || fileResult.file
        : "unknown";
      for (const finding of fileResult.findings) {
        const { score, disclaimer } = scoreConfidence(finding, filePath, fileResult.findings);
        await prisma.finding.create({
          data: {
            scanId: scan.id,
            ruleId: finding.rule_id,
            category: categoryFromRuleId(finding.rule_id),
            severity: normalizeSeverity(finding.severity),
            description: finding.description || "",
            filePath,
            lineNumber: finding.line ?? 0,
            matchedText: (finding.matched_text ?? "").slice(0, 500),
            context: finding.context || "",
            confidence: score,
            disclaimer,
          },
        });
        findingsCount++;
      }
    }

    return { packageName: packageInfo.name, status: "scanned", findingsCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[scrape] Error processing ${packageInfo.name}: ${message}`);
    return { packageName: packageInfo.name, status: "failed", error: message };
  } finally {
    await rm(extractedPath, { recursive: true, force: true }).catch(() => {});
  }
}

async function scrapeMarketplace(
  prisma: PrismaClient,
  name: MarketplaceName,
  maxPackages?: number,
): Promise<ScrapeResult[]> {
  console.log(`\n=== Scraping ${name} ===`);

  const marketplace = await prisma.marketplace.findUnique({ where: { name } });
  if (!marketplace) {
    console.error(`[scrape] Marketplace ${name} not found in DB`);
    return [];
  }

  const results: ScrapeResult[] = [];
  const downloader = getDownloader(name, maxPackages);

  for await (const download of downloader) {
    const result = await processPackage(prisma, download, marketplace.id);
    results.push(result);

    const icon = result.status === "scanned" ? "+" : result.status === "skipped" ? "~" : "!";
    console.log(`  [${icon}] ${result.packageName} — ${result.status}${result.findingsCount ? ` (${result.findingsCount} findings)` : ""}${result.error ? `: ${result.error}` : ""}`);
  }

  // Update marketplace lastScraped
  await prisma.marketplace.update({
    where: { id: marketplace.id },
    data: { lastScraped: new Date() },
  });

  return results;
}

async function main() {
  console.log("ICU Scraper Pipeline");
  console.log("====================");
  console.log(`Time: ${new Date().toISOString()}`);

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const prisma = createPrisma();

  try {
    // Step 1: Initialize marketplaces
    await upsertMarketplaces(prisma);
    console.log("Marketplaces initialized");

    // Step 2: Determine which marketplaces to scrape
    const marketplaces: MarketplaceName[] = ENV_MARKETPLACE
      ? [ENV_MARKETPLACE]
      : (Object.keys(MARKETPLACES) as MarketplaceName[]);

    // Step 3: Scrape each marketplace
    const allResults: Record<string, ScrapeResult[]> = {};
    for (const mp of marketplaces) {
      allResults[mp] = await scrapeMarketplace(prisma, mp, ENV_MAX_PACKAGES);
    }

    // Step 4: Recompute stats
    await recomputeStats(prisma);

    // Step 5: Summary
    console.log("\n=== Summary ===");
    for (const [mp, results] of Object.entries(allResults)) {
      const scanned = results.filter((r) => r.status === "scanned").length;
      const skipped = results.filter((r) => r.status === "skipped").length;
      const failed = results.filter((r) => r.status === "failed").length;
      const withFindings = results.filter((r) => (r.findingsCount ?? 0) > 0).length;
      console.log(
        `  ${mp}: ${scanned} scanned, ${skipped} skipped, ${failed} failed, ${withFindings} with findings`,
      );
    }

    console.log("\nDone!");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
