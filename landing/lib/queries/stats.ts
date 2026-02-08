import { prisma } from "@/lib/db";

export async function getDashboardStats() {
  const stats = await prisma.scanStats.findUnique({
    where: { id: "singleton" },
  });

  if (!stats) {
    return {
      totalPackages: 0,
      totalScans: 0,
      totalFindings: 0,
      totalClean: 0,
      totalLow: 0,
      totalMedium: 0,
      totalHigh: 0,
      totalCritical: 0,
      promptInjection: 0,
      dataExfiltration: 0,
      obfuscation: 0,
      suspiciousCommands: 0,
      networkSuspicious: 0,
      topRules: [] as Array<{ rule: string; count: number }>,
      dailyTrend: [] as Array<{ date: string; count: number }>,
      lastUpdated: new Date(),
    };
  }

  return {
    ...stats,
    topRules: (stats.topRules as Array<{ rule: string; count: number }>) || [],
    dailyTrend: (stats.dailyTrend as Array<{ date: string; count: number }>) || [],
  };
}

export async function getMarketplaceStats() {
  const marketplaces = await prisma.marketplace.findMany({
    include: {
      _count: { select: { packages: true } },
      packages: {
        select: { riskLevel: true },
      },
    },
  });

  return marketplaces.map((mp) => {
    const riskCounts: Record<string, number> = {};
    for (const pkg of mp.packages) {
      riskCounts[pkg.riskLevel] = (riskCounts[pkg.riskLevel] || 0) + 1;
    }
    const total = mp.packages.length;
    const clean = riskCounts["clean"] || 0;
    const safetyScore = total > 0 ? Math.round((clean / total) * 100) : 100;

    return {
      id: mp.id,
      name: mp.name,
      url: mp.url,
      description: mp.description,
      totalPackages: total,
      riskCounts,
      safetyScore,
    };
  });
}
