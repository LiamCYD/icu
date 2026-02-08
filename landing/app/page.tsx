export const dynamic = "force-dynamic";

import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCards } from "@/components/dashboard/stat-cards";
import { DetectionChart } from "@/components/dashboard/detection-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { RecentThreats } from "@/components/dashboard/recent-threats";
import { getDashboardStats, getMarketplaceStats } from "@/lib/queries/stats";
import { getRecentThreats } from "@/lib/queries/threats";

export default async function DashboardPage() {
  const [stats, marketplaceStats, recentThreats] = await Promise.all([
    getDashboardStats(),
    getMarketplaceStats(),
    getRecentThreats(10),
  ]);

  const categoryData = {
    prompt_injection: stats.promptInjection,
    data_exfiltration: stats.dataExfiltration,
    obfuscation: stats.obfuscation,
    suspicious_commands: stats.suspiciousCommands,
    network_suspicious: stats.networkSuspicious,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      {/* Hero */}
      <section className="py-8 text-center sm:py-12">
        <div className="mx-auto flex items-center justify-center gap-2 pb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="gradient-text text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          I See You
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Scanning AI marketplaces for malicious packages. Prompt injection,
          data exfiltration, and obfuscation — detected and exposed.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/threats">
              View Threats <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/about">About ICU</Link>
          </Button>
        </div>
      </section>

      {/* Stat Cards */}
      <StatCards
        totalCritical={stats.totalCritical}
        totalFindings={stats.totalFindings}
        totalPackages={stats.totalPackages}
        marketplaceCount={marketplaceStats.length}
      />

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <DetectionChart data={stats.dailyTrend} />
        <CategoryChart data={categoryData} />
      </div>

      {/* Recent threats table */}
      <RecentThreats threats={recentThreats} />

      {/* Risk + Marketplace row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Risk distribution */}
        <div className="glass-card rounded-lg p-6">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Risk Distribution
          </h3>
          <div className="space-y-3">
            {(
              [
                { label: "Critical", value: stats.totalCritical, color: "bg-red-500" },
                { label: "High", value: stats.totalHigh, color: "bg-orange-500" },
                { label: "Medium", value: stats.totalMedium, color: "bg-yellow-500" },
                { label: "Low", value: stats.totalLow, color: "bg-blue-500" },
                { label: "Clean", value: stats.totalClean, color: "bg-green-500" },
              ] as const
            ).map((item) => {
              const pct =
                stats.totalPackages > 0
                  ? (item.value / stats.totalPackages) * 100
                  : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-muted-foreground">
                    {item.label}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-secondary/50 h-2">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-muted-foreground">
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Marketplace safety scores */}
        <div className="glass-card rounded-lg p-6">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Marketplace Safety Scores
          </h3>
          <div className="space-y-3">
            {marketplaceStats.map((mp) => (
              <div key={mp.id} className="flex items-center gap-3">
                <span className="w-24 truncate text-sm">{mp.name}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-secondary/50 h-2">
                  <div
                    className={`h-full rounded-full ${
                      mp.safetyScore >= 80
                        ? "bg-green-500"
                        : mp.safetyScore >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${mp.safetyScore}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-muted-foreground">
                  {mp.safetyScore}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
