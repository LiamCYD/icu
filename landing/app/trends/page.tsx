export const dynamic = "force-dynamic";

import { getDashboardStats, getMarketplaceStats } from "@/lib/queries/stats";
import { TrendsCharts } from "@/components/trends/trends-charts";
import { TrendingUp } from "lucide-react";

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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Trends</h1>
          <p className="text-sm text-muted-foreground">
            Detection trends and threat landscape analysis
          </p>
        </div>
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
