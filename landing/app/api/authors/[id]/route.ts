import { NextRequest, NextResponse } from "next/server";
import { getAuthorById } from "@/lib/queries/authors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const author = await getAuthorById(id);

  if (!author) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: author });
}
