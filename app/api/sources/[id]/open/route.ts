import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const source = await prisma.source.findFirst({ where: { id, notebook: { userId } } });
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  if (source.url) return NextResponse.redirect(source.url);
  if (!source.filePath) return NextResponse.json({ error: "Source file is unavailable" }, { status: 404 });
  const file = await readFile(source.filePath);
  const contentType = source.type === "PDF" ? "application/pdf" : "text/plain; charset=utf-8";
  return new Response(new Uint8Array(file), { headers: { "Content-Type": contentType, "Content-Disposition": `inline; filename="${source.title.replace(/["\\]/g, "")}"` } });
}
