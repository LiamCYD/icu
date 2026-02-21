export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthorById } from "@/lib/queries/authors";
import { RiskBadge } from "@/components/shared/risk-badge";
import { formatDate, formatRelativeDate } from "@/lib/utils";
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
    <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-12 md:px-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-white/50">
        <Link
          href="/authors"
          className="transition-colors hover:text-white"
        >
          Authors
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white">{author.name}</span>
      </nav>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border">
            <User className="h-6 w-6 text-white/50" />
          </div>
          <div>
            <h1 className="display-heading text-3xl">{author.name}</h1>
            {author.marketplaceSlug && (
              <p className="text-sm text-white/50">
                {author.marketplaceSlug}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-white/50">
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
        {([
          { label: "Critical", key: "critical", color: "text-[#e05252]" },
          { label: "High", key: "high", color: "text-[#5bb8d4]" },
          { label: "Medium", key: "medium", color: "text-[#d4a853]" },
          { label: "Low", key: "low", color: "text-[#6b8a7a]" },
          { label: "Clean", key: "clean", color: "text-[#3a8a8c]" },
        ] as const).map((stat) => (
          <div key={stat.key} className="rounded-[22px] border border-border p-4 text-center">
            <p className={`display-heading text-2xl ${stat.color}`}>
              {riskCounts[stat.key] || 0}
            </p>
            <p className="text-xs text-white/50">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Packages table */}
      <div>
        <h2 className="display-heading mb-4 text-xl">Packages</h2>
        <div className="overflow-x-auto rounded-[22px] border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
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
                  className="border-border hover:bg-secondary/30"
                >
                  <TableCell>
                    <RiskBadge level={pkg.riskLevel} />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/threats/${pkg.id}`}
                      className="font-medium text-white transition-colors hover:text-white/70"
                    >
                      {pkg.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-white/50 sm:table-cell">
                    {pkg.marketplace.name}
                  </TableCell>
                  <TableCell className="hidden font-mono text-sm text-white/50 md:table-cell">
                    {pkg.version}
                  </TableCell>
                  <TableCell className="text-right text-sm text-white/50">
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
