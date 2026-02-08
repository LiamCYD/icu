import { prisma } from "@/lib/db";

interface SearchParams {
  q: string;
  type?: "packages" | "authors" | "all";
  limit?: number;
}

export async function search({ q, type = "all", limit = 10 }: SearchParams) {
  const results: {
    packages: Array<{
      id: string;
      name: string;
      riskLevel: string;
      marketplace: string;
    }>;
    authors: Array<{
      id: string;
      name: string;
      packageCount: number;
    }>;
  } = { packages: [], authors: [] };

  if (!q || q.length < 2) return results;

  if (type === "all" || type === "packages") {
    const packages = await prisma.package.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { marketplace: { select: { name: true } } },
      take: limit,
    });
    results.packages = packages.map((p) => ({
      id: p.id,
      name: p.name,
      riskLevel: p.riskLevel,
      marketplace: p.marketplace.name,
    }));
  }

  if (type === "all" || type === "authors") {
    const authors = await prisma.author.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      include: { _count: { select: { packages: true } } },
      take: limit,
    });
    results.authors = authors.map((a) => ({
      id: a.id,
      name: a.name,
      packageCount: a._count.packages,
    }));
  }

  return results;
}
