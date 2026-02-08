export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getThreats } from "@/lib/queries/threats";
import { prisma } from "@/lib/db";
import { parsePage, paginationMeta } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { ThreatsTable } from "@/components/threats/threats-table";
import { ThreatFilters } from "@/components/threats/threat-filters";
import { Pagination } from "@/components/shared/pagination";
import { Shield } from "lucide-react";

interface ThreatsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ThreatsPage({ searchParams }: ThreatsPageProps) {
  const sp = await searchParams;
  const page = parsePage(sp.page || null);
  const limit = DEFAULT_PAGE_SIZE;

  const [{ packages, total }, marketplaces] = await Promise.all([
    getThreats({
      page,
      limit,
      risk: sp.risk,
      category: sp.category,
      marketplace: sp.marketplace,
      q: sp.q,
      sort: sp.sort,
      order: sp.order as "asc" | "desc" | undefined,
    }),
    prisma.marketplace.findMany({ select: { name: true } }),
  ]);

  const pagination = paginationMeta(total, page, limit);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Threat Database</h1>
          <p className="text-sm text-muted-foreground">
            {total} malicious packages detected across AI marketplaces
          </p>
        </div>
      </div>

      <Suspense>
        <ThreatFilters marketplaces={marketplaces.map((m) => m.name)} />
      </Suspense>

      <div className="glass-card overflow-hidden rounded-lg">
        <ThreatsTable threats={packages} />
      </div>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} />
    </div>
  );
}
