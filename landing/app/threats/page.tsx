export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getThreats } from "@/lib/queries/threats";
import { prisma } from "@/lib/db";
import { parsePage, paginationMeta } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { ThreatsTable } from "@/components/threats/threats-table";
import { ThreatFilters } from "@/components/threats/threat-filters";
import { Pagination } from "@/components/shared/pagination";

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
    <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-12 md:px-20">
      <div>
        <h1 className="display-heading text-3xl">Threat Database</h1>
        <p className="light-text mt-1 text-lg opacity-55">
          {total} malicious packages detected across AI marketplaces
        </p>
      </div>

      <Suspense>
        <ThreatFilters marketplaces={marketplaces.map((m) => m.name)} />
      </Suspense>

      <div className="overflow-x-auto rounded-[22px] border border-border">
        <ThreatsTable threats={packages} />
      </div>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} />
    </div>
  );
}
