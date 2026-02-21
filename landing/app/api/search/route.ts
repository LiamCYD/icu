import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/queries/search";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const type = (sp.get("type") as "packages" | "authors" | "all") || "all";
  const limit = Math.min(parseInt(sp.get("limit") || "10", 10) || 10, 50);

  const results = await search({ q, type, limit });

  return NextResponse.json({ data: results });
}
