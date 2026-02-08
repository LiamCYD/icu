export const dynamic = "force-dynamic";

import { getMarketplaceStats } from "@/lib/queries/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RISK_BG_CLASSES, RISK_LEVELS, type RiskLevel } from "@/lib/constants";
import { Store, ExternalLink } from "lucide-react";

export default async function MarketplacesPage() {
  const marketplaces = await getMarketplaceStats();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Store className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Marketplaces</h1>
          <p className="text-sm text-muted-foreground">
            Safety comparison across {marketplaces.length} AI package
            marketplaces
          </p>
        </div>
      </div>

      {/* Safety comparison bar chart */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Safety Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketplaces
              .sort((a, b) => b.safetyScore - a.safetyScore)
              .map((mp) => (
                <div key={mp.id} className="flex items-center gap-4">
                  <span className="w-24 text-sm font-medium">{mp.name}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-secondary/50 h-3">
                    <div
                      className={`h-full rounded-full transition-all ${
                        mp.safetyScore >= 80
                          ? "bg-green-500"
                          : mp.safetyScore >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
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
        </CardContent>
      </Card>

      {/* Marketplace cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {marketplaces.map((mp) => (
          <Card key={mp.id} className="glass-card border-border/50">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{mp.name}</h3>
                  {mp.description && (
                    <p className="text-sm text-muted-foreground">
                      {mp.description}
                    </p>
                  )}
                </div>
                <a
                  href={mp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{mp.totalPackages}</span>
                <span className="text-sm text-muted-foreground">
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
                <span className="text-xs text-muted-foreground">
                  Safety Score:
                </span>
                <span
                  className={`text-sm font-bold ${
                    mp.safetyScore >= 80
                      ? "text-green-400"
                      : mp.safetyScore >= 50
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {mp.safetyScore}%
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
