export const dynamic = "force-dynamic";

import { getMarketplaceStats } from "@/lib/queries/stats";
import { Badge } from "@/components/ui/badge";
import { RISK_BG_CLASSES, RISK_LEVELS, type RiskLevel } from "@/lib/constants";
import { ExternalLink } from "lucide-react";

export default async function MarketplacesPage() {
  const marketplaces = await getMarketplaceStats();

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-12 md:px-20">
      <div>
        <h1 className="display-heading text-3xl">Marketplaces</h1>
        <p className="light-text mt-1 text-lg opacity-55">
          Safety comparison across {marketplaces.length} AI package
          marketplaces
        </p>
      </div>

      {/* Safety comparison bar chart */}
      <div className="rounded-[22px] border border-border p-6">
        <p className="light-text mb-4 text-lg">
          Safety Scores
        </p>
        <div className="space-y-4">
          {marketplaces
            .sort((a, b) => b.safetyScore - a.safetyScore)
            .map((mp) => (
              <div key={mp.id} className="flex items-center gap-4">
                <span className="w-24 truncate text-sm font-medium">{mp.name}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-border/30 h-3">
                  <div
                    className={`h-full rounded-full transition-all ${
                      mp.safetyScore >= 80
                        ? "bg-[#3a8a8c]"
                        : mp.safetyScore >= 50
                          ? "bg-[#d4a853]"
                          : "bg-[#e05252]"
                    }`}
                    style={{ width: `${mp.safetyScore}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm font-bold">
                  {mp.safetyScore}%
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Marketplace cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {marketplaces.map((mp) => (
          <div key={mp.id} className="space-y-4 rounded-[22px] border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{mp.name}</h3>
                {mp.description && (
                  <p className="text-sm text-white/50">
                    {mp.description}
                  </p>
                )}
              </div>
              <a
                href={mp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/50 transition-colors hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <span className="display-heading text-2xl">{mp.totalPackages}</span>
              <span className="text-sm text-white/50">
                packages scanned
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {RISK_LEVELS.map((level) => {
                const count = mp.riskCounts[level] || 0;
                if (count === 0) return null;
                return (
                  <Badge
                    key={level}
                    variant="outline"
                    className={`text-xs ${RISK_BG_CLASSES[level as RiskLevel]}`}
                  >
                    {count} {level}
                  </Badge>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">
                Safety Score:
              </span>
              <span
                className={`text-sm font-bold ${
                  mp.safetyScore >= 80
                    ? "text-[#3a8a8c]"
                    : mp.safetyScore >= 50
                      ? "text-[#d4a853]"
                      : "text-[#e05252]"
                }`}
              >
                {mp.safetyScore}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
