export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthorById } from "@/lib/queries/authors";
import { RiskBadge } from "@/components/shared/risk-badge";
import { formatDate, formatRelativeDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, User, Calendar, Package } from "lucide-react";

interface AuthorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AuthorDetailPage({
  params,
}: AuthorDetailPageProps) {
  const { id } = await params;
  const author = await getAuthorById(id);

  if (!author) notFound();

  const riskCounts: Record<string, number> = {};
  for (const pkg of author.packages) {
    riskCounts[pkg.riskLevel] = (riskCounts[pkg.riskLevel] || 0) + 1;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/authors"
          className="transition-colors hover:text-foreground"
        >
          Authors
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{author.name}</span>
      </nav>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{author.name}</h1>
            {author.marketplaceSlug && (
              <p className="text-sm text-muted-foreground">
                {author.marketplaceSlug}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            {author.packages.length} packages
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            First seen {formatDate(author.firstSeen)}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Last seen {formatRelativeDate(author.lastSeen)}
          </span>
        </div>
      </div>

      {/* Risk summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {(
          [
            { label: "Critical", key: "critical", color: "text-red-400" },
            { label: "High", key: "high", color: "text-orange-400" },
            { label: "Medium", key: "medium", color: "text-yellow-400" },
            { label: "Low", key: "low", color: "text-blue-400" },
            { label: "Clean", key: "clean", color: "text-green-400" },
          ] as const
        ).map((stat) => (
          <Card key={stat.key} className="glass-card border-border/50">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>
                {riskCounts[stat.key] || 0}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Packages table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Packages</h2>
        <div className="glass-card overflow-hidden rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-[100px]">Risk</TableHead>
                <TableHead>Package</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Marketplace
                </TableHead>
                <TableHead className="hidden md:table-cell">Version</TableHead>
                <TableHead className="text-right">First Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {author.packages.map((pkg) => (
                <TableRow
                  key={pkg.id}
                  className="border-border/50 hover:bg-secondary/50"
                >
                  <TableCell>
                    <RiskBadge level={pkg.riskLevel} />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/threats/${pkg.id}`}
                      className="font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {pkg.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {pkg.marketplace.name}
                  </TableCell>
                  <TableCell className="hidden font-mono text-sm text-muted-foreground md:table-cell">
                    {pkg.version}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatRelativeDate(pkg.firstSeen)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
