export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ParticleEye } from "@/components/hero/particle-eye";
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
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[830px] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center" style={{ background: "#172322" }}>
        <ParticleEye />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <h1 className="display-heading text-6xl sm:text-8xl lg:text-[131px] lg:leading-none">
            I See You
          </h1>
          <p className="light-text max-w-[1076px] text-xl sm:text-2xl lg:text-[40px] lg:leading-snug">
            Scanning AI marketplaces for malicious packages. Prompt injection,
            data exfiltration, and obfuscation — detected and exposed.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button variant="icu" size="lg" className="px-12 py-6 text-xl" asChild>
              <a href="https://github.com/LiamCYD/icu" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </Button>
            <Button variant="icu" size="lg" className="px-12 py-6 text-xl" asChild>
              <Link href="/about">
                About ICU
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="mx-auto w-full max-w-[1600px] space-y-8 px-6 py-12 md:px-20">
        {/* Stat Cards */}
        <StatCards
          totalCritical={stats.totalCritical}
          totalFindings={stats.totalFindings}
          totalPackages={stats.totalPackages}
          marketplaceCount={marketplaceStats.length}
        />

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DetectionChart data={stats.dailyTrend} />
          <CategoryChart data={categoryData} />
        </div>

        {/* Recent threats table */}
        <RecentThreats threats={recentThreats} />

        {/* Marketplace safety scores */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Risk bar distribution */}
          <div className="rounded-[22px] border border-border p-6">
            <p className="light-text mb-4 text-lg">
              Risk Distribution
            </p>
            <div className="space-y-3">
              {([
                { label: "Critical", value: stats.totalCritical, color: "bg-[#e05252]" },
                { label: "High", value: stats.totalHigh, color: "bg-[#5bb8d4]" },
                { label: "Medium", value: stats.totalMedium, color: "bg-[#d4a853]" },
                { label: "Low", value: stats.totalLow, color: "bg-[#6b8a7a]" },
                { label: "Clean", value: stats.totalClean, color: "bg-[#3a8a8c]" },
              ] as const).map((item) => {
                const pct =
                  stats.totalPackages > 0
                    ? (item.value / stats.totalPackages) * 100
                    : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-white/50">
                      {item.label}
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-border/30 h-2">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-white/50">
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Marketplace safety scores */}
          <div className="rounded-[22px] border border-border p-6">
            <p className="light-text mb-4 text-lg">
              Marketplace Safety Scores
            </p>
            <div className="space-y-3">
              {marketplaceStats.map((mp) => (
                <div key={mp.id} className="flex items-center gap-3">
                  <span className="w-24 truncate text-sm">{mp.name}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-border/30 h-2">
                    <div
                      className={`h-full rounded-full ${
                        mp.safetyScore >= 80
                          ? "bg-[#3a8a8c]"
                          : mp.safetyScore >= 50
                            ? "bg-[#d4a853]"
                            : "bg-[#e05252]"
                      }`}
                      style={{ width: `${mp.safetyScore}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-white/50">
                    {mp.safetyScore}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section — "We all see you" */}
      <section className="relative flex min-h-[830px] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/BG vid.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[#0d1b20]/60" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <h2 className="display-heading text-6xl sm:text-8xl lg:text-[131px] lg:leading-none">
            We all see you
          </h2>
          <p className="light-text text-xl sm:text-2xl lg:text-[40px]">
            Community driven
          </p>
        </div>
      </section>
    </div>
  );
}
