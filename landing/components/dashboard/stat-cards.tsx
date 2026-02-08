import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Bug, Search, Store } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface StatCardsProps {
  totalCritical: number;
  totalFindings: number;
  totalPackages: number;
  marketplaceCount: number;
}

const STATS_CONFIG = [
  {
    key: "totalCritical" as const,
    label: "Critical Threats",
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    key: "totalFindings" as const,
    label: "Total Findings",
    icon: Bug,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    key: "totalPackages" as const,
    label: "Packages Scanned",
    icon: Search,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    key: "marketplaceCount" as const,
    label: "Marketplaces",
    icon: Store,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
];

export function StatCards(props: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STATS_CONFIG.map((stat) => {
        const Icon = stat.icon;
        const value = props[stat.key];
        return (
          <Card key={stat.key} className="glass-card border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(value)}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
