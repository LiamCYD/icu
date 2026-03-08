/**
 * One-time migration: fix existing findings with "unknown" category and
 * recompute package risk levels using confidence-gated scoring.
 *
 * Run: cd landing && npx tsx scripts/migrate-fix-categories.ts
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

const RULE_PREFIX_TO_CATEGORY: Record<string, string> = {
  "PI-": "prompt_injection",
  "DE-": "data_exfiltration",
  "OB-": "obfuscation",
  "SC-": "suspicious_commands",
  "NS-": "network_suspicious",
  "DO-": "obfuscation",
  "EN-": "obfuscation",
  "DB-": "known_malicious",
};

const MIN_CONFIDENCE_FOR_RISK = 0.4;

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
    // Step 1: Fix finding categories
    console.log("Step 1: Fixing finding categories...");
    let totalUpdated = 0;

    for (const [prefix, category] of Object.entries(RULE_PREFIX_TO_CATEGORY)) {
      const result = await prisma.$executeRaw`
        UPDATE findings
        SET category = ${category}
        WHERE "ruleId" LIKE ${prefix + '%'}
          AND category != ${category}
      `;
      if (result > 0) {
        console.log(`  Updated ${result} findings: ${prefix}* → ${category}`);
        totalUpdated += result;
      }
    }
    console.log(`  Total category fixes: ${totalUpdated}`);

    // Step 2: Recompute package risk levels from confidence-filtered findings
    console.log("\nStep 2: Recomputing package risk levels...");

    const packages = await prisma.package.findMany({
      select: { id: true, name: true, riskLevel: true },
    });

    let riskUpdated = 0;
    for (const pkg of packages) {
      // Get the most recent scan's findings
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

      // null confidence = pre-scoring data, treat as credible (0.7 = pattern_match base)
      const credible = findings.filter(
        (f) => (f.confidence ?? 0.7) >= MIN_CONFIDENCE_FOR_RISK,
      );
      const newRisk = credible.length > 0
        ? worstRisk(credible.map((f) => f.severity))
        : "clean";

      if (newRisk !== pkg.riskLevel) {
        await prisma.package.update({
          where: { id: pkg.id },
          data: { riskLevel: newRisk },
        });
        // Also update the latest scan's risk level
        await prisma.scan.update({
          where: { id: latestScan.id },
          data: { riskLevel: newRisk },
        });
        riskUpdated++;
        if (riskUpdated <= 20) {
          console.log(`  ${pkg.name}: ${pkg.riskLevel} → ${newRisk}`);
        }
      }
    }
    if (riskUpdated > 20) {
      console.log(`  ... and ${riskUpdated - 20} more`);
    }
    console.log(`  Total risk level changes: ${riskUpdated} / ${packages.length} packages`);

    // Step 3: Recompute stats
    console.log("\nStep 3: Recomputing stats...");
    await recomputeStats(prisma);

    console.log("\nDone! Migration complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
