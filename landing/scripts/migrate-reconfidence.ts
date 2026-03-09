/**
 * Migration: recompute confidence scores with lowered base scores for
 * noise-heavy rules (DO-*, EN-*, OB-001), trim legacy bloated scans,
 * recompute package risk levels, and refresh stats.
 *
 * Run: cd landing && npx tsx scripts/migrate-reconfidence.ts
 *
 * Safe to run multiple times (idempotent).
 */
import "dotenv/config";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { recomputeStats } from "./lib/stats";

neonConfig.webSocketConstructor = ws;

const MIN_CONFIDENCE_FOR_RISK = 0.4;
const MAX_FINDINGS_PER_SCAN = 200;

// New base scores (matches updated confidence.ts)
const NEW_BASE_SCORES: Record<string, number> = {
  "DO-": 0.3,    // deobfuscation noise
  "EN-": 0.25,   // entropy noise
  "OB-001": 0.3, // base64 string detection
  "OB-": 0.3,    // other obfuscation
};

function newBaseScore(ruleId: string): number {
  if (ruleId === "OB-001") return NEW_BASE_SCORES["OB-001"];
  for (const prefix of ["DO-", "EN-", "OB-"]) {
    if (ruleId.startsWith(prefix)) return NEW_BASE_SCORES[prefix];
  }
  return 0.7; // pattern_match default — unchanged
}

const SEVERITY_RISK_ORDER = ["low", "medium", "high", "critical"];

function worstRisk(severities: string[]): string {
  let worst = -1;
  for (const s of severities) {
    const idx = SEVERITY_RISK_ORDER.indexOf(s);
    if (idx > worst) worst = idx;
  }
  return worst >= 0 ? SEVERITY_RISK_ORDER[worst] : "clean";
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // Step 1: Recompute confidence for noise-heavy rules
    console.log("Step 1: Lowering confidence for noise-heavy rules (DO-*, EN-*, OB-*)...");

    // Batch update: set base confidence for each prefix
    // DO-* findings: 0.3 base (was 0.6)
    const doCnt = await prisma.$executeRaw`
      UPDATE findings SET confidence = 0.3
      WHERE "ruleId" LIKE 'DO-%' AND (confidence IS NULL OR confidence > 0.35)
    `;
    console.log(`  DO-* rules: updated ${doCnt} findings → 0.3 confidence`);

    // EN-* findings: 0.25 base (was 0.4/0.7)
    const enCnt = await prisma.$executeRaw`
      UPDATE findings SET confidence = 0.25
      WHERE "ruleId" LIKE 'EN-%' AND (confidence IS NULL OR confidence > 0.3)
    `;
    console.log(`  EN-* rules: updated ${enCnt} findings → 0.25 confidence`);

    // OB-001 (base64): 0.3 base (was 0.6)
    const ob1Cnt = await prisma.$executeRaw`
      UPDATE findings SET confidence = 0.3
      WHERE "ruleId" = 'OB-001' AND (confidence IS NULL OR confidence > 0.35)
    `;
    console.log(`  OB-001 rule: updated ${ob1Cnt} findings → 0.3 confidence`);

    // OB-002,003,004 also get 0.3 base (were 0.6)
    const obOtherCnt = await prisma.$executeRaw`
      UPDATE findings SET confidence = 0.3
      WHERE "ruleId" LIKE 'OB-%' AND "ruleId" != 'OB-001'
        AND (confidence IS NULL OR confidence > 0.35)
    `;
    console.log(`  OB-002+ rules: updated ${obOtherCnt} findings → 0.3 confidence`);

    const totalConfUpdated = doCnt + enCnt + ob1Cnt + obOtherCnt;
    console.log(`  Total confidence updates: ${totalConfUpdated}`);

    // Step 2: Trim legacy bloated scans (pre-cap, >200 findings)
    console.log("\nStep 2: Trimming legacy scans with >200 findings...");

    const bloatedScans = await prisma.$queryRaw<Array<{ scanId: string; cnt: number }>>`
      SELECT "scanId" as "scanId", COUNT(*)::int as cnt
      FROM findings
      GROUP BY "scanId"
      HAVING COUNT(*) > ${MAX_FINDINGS_PER_SCAN}
    `;

    let totalTrimmed = 0;
    for (const scan of bloatedScans) {
      // Keep the 200 highest-confidence findings, delete the rest
      const excess = scan.cnt - MAX_FINDINGS_PER_SCAN;
      const deleted = await prisma.$executeRaw`
        DELETE FROM findings
        WHERE id IN (
          SELECT id FROM findings
          WHERE "scanId" = ${scan.scanId}
          ORDER BY COALESCE(confidence, 0) ASC, id ASC
          LIMIT ${excess}
        )
      `;
      totalTrimmed += deleted;
    }
    console.log(`  Trimmed ${bloatedScans.length} scans, deleted ${totalTrimmed} excess findings`);

    // Step 3: Recompute package risk levels
    console.log("\nStep 3: Recomputing package risk levels...");

    const packages = await prisma.package.findMany({
      select: { id: true, name: true, riskLevel: true },
    });

    let riskUpdated = 0;
    for (const pkg of packages) {
      const latestScan = await prisma.scan.findFirst({
        where: { packageId: pkg.id },
        orderBy: { scanDate: "desc" },
        select: { id: true },
      });

      if (!latestScan) continue;

      const findings = await prisma.finding.findMany({
        where: { scanId: latestScan.id },
        select: { severity: true, confidence: true },
      });

      const credible = findings.filter(
        (f) => (f.confidence ?? 0) >= MIN_CONFIDENCE_FOR_RISK,
      );
      const newRisk = credible.length > 0
        ? worstRisk(credible.map((f) => f.severity))
        : "clean";

      if (newRisk !== pkg.riskLevel) {
        await prisma.package.update({
          where: { id: pkg.id },
          data: { riskLevel: newRisk },
        });
        await prisma.scan.update({
          where: { id: latestScan.id },
          data: { riskLevel: newRisk },
        });
        riskUpdated++;
        if (riskUpdated <= 30) {
          console.log(`  ${pkg.name}: ${pkg.riskLevel} → ${newRisk}`);
        }
      }
    }
    if (riskUpdated > 30) {
      console.log(`  ... and ${riskUpdated - 30} more`);
    }
    console.log(`  Total risk changes: ${riskUpdated} / ${packages.length} packages`);

    // Step 4: Recompute stats singleton
    console.log("\nStep 4: Recomputing stats...");
    await recomputeStats(prisma);

    // Final summary
    const finalFindings = await prisma.finding.count();
    const credibleFindings = await prisma.finding.count({
      where: { confidence: { gte: MIN_CONFIDENCE_FOR_RISK } },
    });
    console.log(`\nDone! ${finalFindings} total findings, ${credibleFindings} above confidence threshold.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
