import { AlertTriangle, Bug, Search, Store } from "lucide-react";
import { formatNumber, formatRelativeDate } from "@/lib/utils";

interface StatCardsProps {
  totalCritical: number;
  totalFindings: number;
  totalPackages: number;
  marketplaceCount: number;
  lastUpdated?: Date | string;
}

const STATS_CONFIG = [
  { key: "totalCritical" as const, label: "Critical threats", subtitle: "packages with critical findings", icon: AlertTriangle, color: "text-[#e05252]", bg: "bg-[#e05252]/10" },
  { key: "totalFindings" as const, label: "Total findings", subtitle: "detections across all scans", icon: Bug, color: "text-[#e08a4a]", bg: "bg-[#e08a4a]/10" },
  { key: "totalPackages" as const, label: "Packages scanned", subtitle: "across all marketplaces", icon: Search, color: "text-[#5ba3c9]", bg: "bg-[#5ba3c9]/10" },
  { key: "marketplaceCount" as const, label: "Marketplaces", subtitle: "monitored continuously", icon: Store, color: "text-[#3a8a8c]", bg: "bg-[#3a8a8c]/10" },
];

export function StatCards(props: StatCardsProps) {
  return (
    <div className="space-y-2">
      {props.lastUpdated && (
        <p className="text-xs text-white/40 text-right">
          Last updated {formatRelativeDate(props.lastUpdated)}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {STATS_CONFIG.map((stat) => {
          const Icon = stat.icon;
          const value = props[stat.key];
          return (
            <div
              key={stat.key}
              className="ambient-glow flex h-auto flex-col items-start gap-3 overflow-hidden rounded-[22px] border border-border px-4 py-4 sm:h-[176px] sm:flex-row sm:items-center sm:gap-8 sm:px-8 sm:py-0"
            >
              <div className={`shrink-0 rounded-lg p-2.5 ${stat.bg}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="display-heading text-2xl leading-none sm:text-4xl lg:text-5xl">
                  {formatNumber(value)}
                </span>
                <span className="light-text text-lg leading-tight">
                  {stat.label}
                </span>
                <span className="text-xs text-white/35 hidden sm:block">
                  {stat.subtitle}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
