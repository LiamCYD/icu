import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="glass-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent Critical Threats
        </CardTitle>
        <Link
          href="/threats"
          className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
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
                className="border-border/50 hover:bg-secondary/50"
              >
                <TableCell>
                  <RiskBadge level={threat.riskLevel} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/threats/${threat.id}`}
                    className="font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {threat.name}
                  </Link>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {threat.marketplace.name}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {threat.author ? (
                    <Link
                      href={`/authors/${threat.author.id}`}
                      className="transition-colors hover:text-foreground"
                    >
                      {threat.author.name}
                    </Link>
                  ) : (
                    "Unknown"
                  )}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatRelativeDate(threat.firstSeen)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
