import { auth } from "@clerk/nextjs/server";
import { stat as fsStat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const storageRoot =
  process.env.UPLOAD_STORAGE_DIR ??
  (process.env.VERCEL
    ? path.join(os.tmpdir(), "lumina", "uploads")
    : path.join(process.cwd(), ".data", "uploads"));

function resolveStoragePath(filePath: string) {
  const destination = path.resolve(storageRoot, filePath);
  const relative = path.relative(storageRoot, destination);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("Invalid storage path.");
  return destination;
}

async function resolveAudioPath(request: Request, userId: string) {
  const { searchParams } = new URL(request.url);
  const id = request.url.split("/api/podcasts/")[1]?.split("/audio")[0];
  if (!id) return null;

  const requestedPath = searchParams.get("path");

  const podcast = await prisma.podcast.findFirst({ where: { id, userId } });
  if (!podcast || !podcast.audioUrl) return null;

  const storedPath = podcast.audioUrl.includes("path=")
    ? decodeURIComponent(podcast.audioUrl.split("path=")[1])
    : null;
  if (!requestedPath || requestedPath !== storedPath) return null;

  return { filePath: resolveStoragePath(requestedPath), podcast };
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Consume the params to satisfy Next.js dynamic-route contract
  await params;

  const result = await resolveAudioPath(request, userId);
  if (!result)
    return NextResponse.json(
      { error: "Podcast audio not found." },
      { status: 404 },
    );

  const { filePath, podcast } = result;
  let fileSize: number;
  try {
    const stats = await fsStat(filePath);
    fileSize = stats.size;
  } catch {
    return NextResponse.json(
      { error: "Audio file not found on disk." },
      { status: 404 },
    );
  }

  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Content-Disposition": `inline; filename="${podcast.title.replace(/["\\]/g, "")}.mp3"`,
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Consume the params to satisfy Next.js dynamic-route contract
  await params;

  const result = await resolveAudioPath(request, userId);
  if (!result)
    return NextResponse.json(
      { error: "Podcast audio not found." },
      { status: 404 },
    );

  const { filePath, podcast } = result;

  let fileSize: number;
  try {
    const stats = await fsStat(filePath);
    fileSize = stats.size;
  } catch {
    return NextResponse.json(
      { error: "Audio file not found on disk." },
      { status: 404 },
    );
  }

  const rangeHeader = request.headers.get("range");

  const commonHeaders: Record<string, string> = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Content-Disposition": `inline; filename="${podcast.title.replace(/["\\]/g, "")}.mp3"`,
    "Cache-Control": "private, max-age=3600",
  };

  // --- Range request (206 Partial Content) ---
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return new Response("Invalid Range header", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const chunkSize = end - start + 1;

    const nodeStream = createReadStream(filePath, { start, end });
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer | string) => {
          controller.enqueue(new Uint8Array(typeof chunk === "string" ? Buffer.from(chunk) : chunk));
        });
        nodeStream.on("end", () => {
          controller.close();
        });
        nodeStream.on("error", (err) => {
          controller.error(err);
        });
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    return new Response(webStream, {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      },
    });
  }

  // --- Full request (200 OK) ---
  const nodeStream = createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) => {
        controller.enqueue(new Uint8Array(typeof chunk === "string" ? Buffer.from(chunk) : chunk));
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new Response(webStream, {
    status: 200,
    headers: {
      ...commonHeaders,
      "Content-Length": String(fileSize),
    },
  });
}
