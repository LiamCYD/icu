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
import { ArrowRight } from "lucide-react";

interface RecentThreat {
  id: string;
  name: string;
  riskLevel: string;
  firstSeen: Date;
  marketplace: { name: string };
  author: { name: string; id: string } | null;
}

export function RecentThreats({ threats }: { threats: RecentThreat[] }) {
  return (
    <div className="overflow-x-auto rounded-[22px] border border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <p className="light-text text-lg">
          Recent Critical Threats
        </p>
        <Link
          href="/threats"
          className="flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-[100px]">Risk</TableHead>
            <TableHead>Package</TableHead>
            <TableHead className="hidden sm:table-cell">
              Marketplace
            </TableHead>
            <TableHead className="hidden md:table-cell">Author</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {threats.map((threat) => (
            <TableRow
              key={threat.id}
              className="border-border hover:bg-secondary/30"
            >
              <TableCell>
                <RiskBadge level={threat.riskLevel} />
              </TableCell>
              <TableCell>
                <Link
                  href={`/threats/${threat.id}`}
                  className="font-medium text-white transition-colors hover:text-white/70"
                >
                  {threat.name}
                </Link>
              </TableCell>
              <TableCell className="hidden text-white/50 sm:table-cell">
                {threat.marketplace.name}
              </TableCell>
              <TableCell className="hidden text-white/50 md:table-cell">
                {threat.author ? (
                  <Link
                    href={`/authors/${threat.author.id}`}
                    className="transition-colors hover:text-white"
                  >
                    {threat.author.name}
                  </Link>
                ) : (
                  "Unknown"
                )}
              </TableCell>
              <TableCell className="text-right text-sm text-white/50">
                {formatRelativeDate(threat.firstSeen)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
