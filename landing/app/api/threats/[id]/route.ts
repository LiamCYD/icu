import { NextRequest, NextResponse } from "next/server";
import { getThreatById } from "@/lib/queries/threats";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const threat = await getThreatById(id);

  if (!threat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: threat });
}
