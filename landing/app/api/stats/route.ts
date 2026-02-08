import { NextResponse } from "next/server";
import { getDashboardStats, getMarketplaceStats } from "@/lib/queries/stats";

export async function GET() {
  const [stats, marketplaces] = await Promise.all([
    getDashboardStats(),
    getMarketplaceStats(),
  ]);

  return NextResponse.json({ data: { stats, marketplaces } });
}
