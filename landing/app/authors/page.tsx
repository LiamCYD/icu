export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAuthors } from "@/lib/queries/authors";
import { parsePage, paginationMeta, formatRelativeDate } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, RISK_BG_CLASSES, type RiskLevel } from "@/lib/constants";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Package } from "lucide-react";

interface AuthorsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AuthorsPage({ searchParams }: AuthorsPageProps) {
  const sp = await searchParams;
  const page = parsePage(sp.page || null);
  const limit = DEFAULT_PAGE_SIZE;

  const { authors, total } = await getAuthors({
    page,
    limit,
    q: sp.q,
  });

  const pagination = paginationMeta(total, page, limit);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Authors</h1>
          <p className="text-sm text-muted-foreground">
            {total} authors across AI marketplaces
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {authors.map((author) => {
          const riskCounts: Record<string, number> = {};
          for (const pkg of author.packages) {
            riskCounts[pkg.riskLevel] = (riskCounts[pkg.riskLevel] || 0) + 1;
          }

          return (
            <Link key={author.id} href={`/authors/${author.id}`}>
              <Card className="glass-card border-border/50 transition-colors hover:border-primary/30">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{author.name}</h3>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />
                      {author._count.packages}
                    </span>
                  </div>

                  {author.marketplaceSlug && (
                    <p className="text-xs text-muted-foreground">
                      {author.marketplaceSlug}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {Object.entries(riskCounts).map(([risk, count]) => (
                      <Badge
                        key={risk}
                        variant="outline"
                        className={`text-xs ${RISK_BG_CLASSES[risk as RiskLevel] || ""}`}
                      >
                        {count} {risk}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Last seen {formatRelativeDate(author.lastSeen)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {authors.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No authors found.
        </div>
      )}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} />
    </div>
  );
}
