import { prisma } from "@/lib/db";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { Prisma } from "@/lib/generated/prisma/client";

interface AuthorListParams {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export async function getAuthors({
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  q,
  sort = "lastSeen",
  order = "desc",
}: AuthorListParams = {}) {
  const where: Prisma.AuthorWhereInput = {};

  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }

  const allowedSorts = ["lastSeen", "firstSeen", "name"];
  const sortField = allowedSorts.includes(sort) ? sort : "lastSeen";

  const [authors, total] = await Promise.all([
    prisma.author.findMany({
      where,
      include: {
        _count: { select: { packages: true } },
        packages: {
          select: { riskLevel: true },
        },
      },
      orderBy: { [sortField]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.author.count({ where }),
  ]);

  return { authors, total };
}

export async function getAuthorById(id: string) {
  return prisma.author.findUnique({
    where: { id },
    include: {
      packages: {
        include: {
          marketplace: { select: { name: true } },
          _count: { select: { scans: true } },
        },
        orderBy: { firstSeen: "desc" },
      },
    },
  });
}
