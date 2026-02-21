import type { PrismaClient } from "../../lib/generated/prisma/client";

export async function recomputeStats(prisma: PrismaClient): Promise<void> {
  const [
    totalPackages,
    totalScans,
    totalFindings,
    riskCounts,
    categoryCounts,
    topRulesRaw,
    dailyTrendRaw,
  ] = await Promise.all([
    prisma.package.count(),
    prisma.scan.count(),
    prisma.finding.count(),
    prisma.package.groupBy({ by: ["riskLevel"], _count: true }),
    prisma.finding.groupBy({ by: ["category"], _count: true }),
    prisma.$queryRaw<Array<{ ruleId: string; count: bigint }>>`
      SELECT "ruleId", COUNT(*)::bigint as count
      FROM findings
      GROUP BY "ruleId"
      ORDER BY count DESC
      LIMIT 10
    `,
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE("scanDate")::text as date, COUNT(*)::bigint as count
      FROM scans
      WHERE "scanDate" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("scanDate")
      ORDER BY date ASC
    `,
  ]);

  const riskMap: Record<string, number> = {};
  for (const r of riskCounts) riskMap[r.riskLevel] = r._count;

  const categoryMap: Record<string, number> = {};
  for (const c of categoryCounts) categoryMap[c.category] = c._count;

  const topRules = topRulesRaw.map((r) => ({
    rule: r.ruleId,
    count: Number(r.count),
  }));

  const dailyTrend = dailyTrendRaw.map((d) => ({
    date: d.date,
    count: Number(d.count),
  }));

  await prisma.scanStats.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      totalPackages,
      totalScans,
      totalFindings,
      totalClean: riskMap["clean"] ?? 0,
      totalLow: riskMap["low"] ?? 0,
      totalMedium: riskMap["medium"] ?? 0,
      totalHigh: riskMap["high"] ?? 0,
      totalCritical: riskMap["critical"] ?? 0,
      promptInjection: categoryMap["prompt_injection"] ?? 0,
      dataExfiltration: categoryMap["data_exfiltration"] ?? 0,
      obfuscation: categoryMap["obfuscation"] ?? 0,
      suspiciousCommands: categoryMap["suspicious_commands"] ?? 0,
      networkSuspicious: categoryMap["network_suspicious"] ?? 0,
      topRules,
      dailyTrend,
      lastUpdated: new Date(),
    },
    update: {
      totalPackages,
      totalScans,
      totalFindings,
      totalClean: riskMap["clean"] ?? 0,
      totalLow: riskMap["low"] ?? 0,
      totalMedium: riskMap["medium"] ?? 0,
      totalHigh: riskMap["high"] ?? 0,
      totalCritical: riskMap["critical"] ?? 0,
      promptInjection: categoryMap["prompt_injection"] ?? 0,
      dataExfiltration: categoryMap["data_exfiltration"] ?? 0,
      obfuscation: categoryMap["obfuscation"] ?? 0,
      suspiciousCommands: categoryMap["suspicious_commands"] ?? 0,
      networkSuspicious: categoryMap["network_suspicious"] ?? 0,
      topRules,
      dailyTrend,
      lastUpdated: new Date(),
    },
  });

  console.log(
    `[stats] Updated: ${totalPackages} packages, ${totalScans} scans, ${totalFindings} findings`,
  );
}
