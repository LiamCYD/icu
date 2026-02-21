export const dynamic = "force-dynamic";

import { getDashboardStats, getMarketplaceStats } from "@/lib/queries/stats";
import { TrendsCharts } from "@/components/trends/trends-charts";

export default async function TrendsPage() {
  const [stats, marketplaceStats] = await Promise.all([
    getDashboardStats(),
    getMarketplaceStats(),
  ]);

  const categoryData = {
    prompt_injection: stats.promptInjection,
    data_exfiltration: stats.dataExfiltration,
    obfuscation: stats.obfuscation,
    suspicious_commands: stats.suspiciousCommands,
    network_suspicious: stats.networkSuspicious,
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-12 md:px-20">
      <div>
        <h1 className="display-heading text-3xl">Trends</h1>
        <p className="light-text mt-1 text-lg opacity-55">
          Detection trends and threat landscape analysis
        </p>
      </div>

      <TrendsCharts
        dailyTrend={stats.dailyTrend}
        categoryData={categoryData}
        riskData={{
          critical: stats.totalCritical,
          high: stats.totalHigh,
          medium: stats.totalMedium,
          low: stats.totalLow,
          clean: stats.totalClean,
        }}
        marketplaceData={marketplaceStats.map((mp) => ({
          name: mp.name,
          total: mp.totalPackages,
          malicious: mp.totalPackages - (mp.riskCounts["clean"] || 0),
        }))}
      />
    </div>
  );
}
