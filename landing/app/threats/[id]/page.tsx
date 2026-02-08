export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getThreatById } from "@/lib/queries/threats";
import { RiskBadge } from "@/components/shared/risk-badge";
import { FindingsList } from "@/components/threats/findings-list";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  ChevronRight,
  ExternalLink,
  FileText,
  Hash,
  User,
  Calendar,
  Store,
} from "lucide-react";

interface ThreatDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ThreatDetailPage({
  params,
}: ThreatDetailPageProps) {
  const { id } = await params;
  const threat = await getThreatById(id);

  if (!threat) notFound();

  const latestScan = threat.scans[0];
  const findings = latestScan?.findings || [];
  const criticalCount = findings.filter(
    (f) => f.severity === "critical"
  ).length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/threats" className="transition-colors hover:text-foreground">
          Threats
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{threat.name}</span>
      </nav>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <RiskBadge level={threat.riskLevel} className="text-sm" />
          <h1 className="text-2xl font-bold">{threat.name}</h1>
          <span className="text-sm text-muted-foreground">
            v{threat.version}
          </span>
        </div>

        {threat.description && (
          <p className="text-muted-foreground">{threat.description}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Store className="h-4 w-4" />
            {threat.marketplace.name}
          </span>
          {threat.author && (
            <Link
              href={`/authors/${threat.author.id}`}
              className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <User className="h-4 w-4" />
              {threat.author.name}
            </Link>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            First seen {formatDate(threat.firstSeen)}
          </span>
          {threat.sha256 && (
            <span className="flex items-center gap-1.5 font-mono text-xs">
              <Hash className="h-4 w-4" />
              {threat.sha256.slice(0, 16)}...
            </span>
          )}
          {threat.sourceUrl && (
            <a
              href={threat.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              Source
            </a>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: findings.length, icon: FileText },
          { label: "Critical", value: criticalCount, color: "text-red-400" },
          { label: "High", value: highCount, color: "text-orange-400" },
          { label: "Medium", value: mediumCount, color: "text-yellow-400" },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card border-border/50">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color || ""}`}>
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Findings */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Findings</h2>
        <FindingsList findings={findings} />
      </div>

      {/* Scan history */}
      {threat.scans.length > 1 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Scan History</h2>
          <div className="glass-card overflow-hidden rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Risk</th>
                  <th className="px-4 py-2 font-medium">Findings</th>
                  <th className="px-4 py-2 font-medium">Files</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {threat.scans.map((scan) => (
                  <tr
                    key={scan.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-2">
                      {formatDate(scan.scanDate)}
                    </td>
                    <td className="px-4 py-2">
                      <RiskBadge level={scan.riskLevel} />
                    </td>
                    <td className="px-4 py-2">{scan.findings.length}</td>
                    <td className="px-4 py-2">{scan.filesScanned}</td>
                    <td className="px-4 py-2">
                      {scan.scanDuration.toFixed(2)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
