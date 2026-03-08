"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RiskBadge } from "@/components/shared/risk-badge";
import { formatRelativeDate } from "@/lib/utils";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface ThreatRow {
  id: string;
  name: string;
  riskLevel: string;
  firstSeen: Date;
  marketplace: { name: string };
  author: { name: string; id: string } | null;
  _count: { scans: number };
}

function SortHeader({
  label,
  field,
  className,
}: {
  label: string;
  field: string;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "firstSeen";
  const currentOrder = searchParams.get("order") || "desc";
  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === "desc" ? "asc" : "desc";

  const params = new URLSearchParams(searchParams.toString());
  params.set("sort", field);
  params.set("order", nextOrder);
  params.delete("page");

  return (
    <TableHead className={className}>
      <Link
        href={`/threats?${params.toString()}`}
        className="inline-flex items-center gap-1 transition-colors hover:text-white"
      >
        {label}
        {isActive ? (
          currentOrder === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </Link>
    </TableHead>
  );
}

export function ThreatsTable({ threats }: { threats: ThreatRow[] }) {
  if (threats.length === 0) {
    return (
      <div className="py-12 text-center text-white/50">
        <p>No threats found matching your filters.</p>
        <p className="mt-2 text-sm">
          <Link href="/threats" className="text-[#3a8a8c] hover:underline">
            Clear all filters
          </Link>
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <SortHeader label="Risk" field="riskLevel" className="w-[100px]" />
          <SortHeader label="Package" field="name" />
          <TableHead className="hidden sm:table-cell">Marketplace</TableHead>
          <TableHead className="hidden md:table-cell">Author</TableHead>
          <TableHead className="hidden lg:table-cell text-center">
            Scans
          </TableHead>
          <SortHeader label="First Seen" field="firstSeen" className="text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {threats.map((t) => (
          <TableRow
            key={t.id}
            className="border-border hover:bg-secondary/30"
          >
            <TableCell>
              <RiskBadge level={t.riskLevel} />
            </TableCell>
            <TableCell>
              <Link
                href={`/threats/${t.id}`}
                className="font-medium text-white transition-colors hover:text-white/70"
              >
                {t.name}
              </Link>
            </TableCell>
            <TableCell className="hidden text-white/50 sm:table-cell">
              {t.marketplace.name}
            </TableCell>
            <TableCell className="hidden text-white/50 md:table-cell">
              {t.author ? (
                <Link
                  href={`/authors/${t.author.id}`}
                  className="transition-colors hover:text-white"
                >
                  {t.author.name}
                </Link>
              ) : (
                "Unknown"
              )}
            </TableCell>
            <TableCell className="hidden text-center text-white/50 lg:table-cell">
              {t._count.scans}
            </TableCell>
            <TableCell className="text-right text-sm text-white/50">
              {formatRelativeDate(t.firstSeen)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
