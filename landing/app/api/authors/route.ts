import { NextRequest, NextResponse } from "next/server";
import { getAuthors } from "@/lib/queries/authors";
import { paginationMeta, parsePage } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = parsePage(sp.get("page"));
  const limit = Math.min(parseInt(sp.get("limit") || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE, 100);

  const { authors, total } = await getAuthors({
    page,
    limit,
    q: sp.get("q") || undefined,
    sort: sp.get("sort") || undefined,
    order: sp.get("order") === "asc" || sp.get("order") === "desc" ? sp.get("order") as "asc" | "desc" : undefined,
  });

  return NextResponse.json({
    data: authors,
    pagination: paginationMeta(total, page, limit),
  });
}
