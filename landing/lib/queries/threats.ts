import { prisma } from "@/lib/db";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { Prisma } from "@/lib/generated/prisma/client";

interface ThreatListParams {
  page?: number;
  limit?: number;
  risk?: string;
  category?: string;
  marketplace?: string;
  q?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export async function getThreats({
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  risk,
  category,
  marketplace,
  q,
  sort = "firstSeen",
  order = "desc",
}: ThreatListParams = {}) {
  const where: Prisma.PackageWhereInput = {};

  if (risk) where.riskLevel = risk;
  if (marketplace) where.marketplace = { name: { equals: marketplace, mode: "insensitive" } };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) {
    where.scans = {
      some: { findings: { some: { category } } },
    };
  }

  const allowedSorts = ["firstSeen", "lastScanned", "name", "riskLevel"];
  const sortField = allowedSorts.includes(sort) ? sort : "firstSeen";

  const [packages, total] = await Promise.all([
    prisma.package.findMany({
      where,
      include: {
        marketplace: { select: { name: true } },
        author: { select: { name: true, id: true } },
        _count: { select: { scans: true } },
      },
      orderBy: { [sortField]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.package.count({ where }),
  ]);

  return { packages, total };
}

export async function getThreatById(id: string) {
  return prisma.package.findUnique({
    where: { id },
    include: {
      marketplace: true,
      author: true,
      scans: {
        include: {
          findings: {
            orderBy: [{ severity: "asc" }, { lineNumber: "asc" }],
          },
        },
        orderBy: { scanDate: "desc" },
      },
    },
  });
}

export async function getRecentThreats(limit = 10) {
  return prisma.package.findMany({
    where: { riskLevel: { not: "clean" } },
    include: {
      marketplace: { select: { name: true } },
      author: { select: { name: true, id: true } },
    },
    orderBy: { firstSeen: "desc" },
    take: limit,
  });
}
