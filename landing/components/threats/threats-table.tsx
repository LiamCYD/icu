import Link from "next/link";
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

interface ThreatRow {
  id: string;
  name: string;
  riskLevel: string;
  firstSeen: Date;
  marketplace: { name: string };
  author: { name: string; id: string } | null;
  _count: { scans: number };
}

export function ThreatsTable({ threats }: { threats: ThreatRow[] }) {
  if (threats.length === 0) {
    return (
      <div className="py-12 text-center text-white/50">
        No threats found matching your filters.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="w-[100px]">Risk</TableHead>
          <TableHead>Package</TableHead>
          <TableHead className="hidden sm:table-cell">Marketplace</TableHead>
          <TableHead className="hidden md:table-cell">Author</TableHead>
          <TableHead className="hidden lg:table-cell text-center">
            Scans
          </TableHead>
          <TableHead className="text-right">First Seen</TableHead>
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
