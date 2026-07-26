import { existsSync } from "node:fs";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createFileReadStream, resolveStoragePath, statFile } from "@/lib/storage";

function logPodcastAudioRoute(details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") console.info("[podcast-audio:route]", details);
}

function getStoredAudioPath(audioUrl: string) {
  return new URL(audioUrl, "http://localhost").searchParams.get("path");
}

async function resolveAudioPath(request: Request, userId: string, id: string) {
  const { searchParams } = new URL(request.url);
  const requestedPath = searchParams.get("path");

  const podcast = await prisma.podcast.findFirst({ where: { id, notebook: { userId } } });
  logPodcastAudioRoute({
    podcastId: id,
    pathQueryParameter: requestedPath,
    podcastAudioUrlFromDb: podcast?.audioUrl ?? null,
  });
  if (!podcast || !podcast.audioUrl) {
    logPodcastAudioRoute({
      podcastId: id,
      pathQueryParameter: requestedPath,
      podcastAudioUrlFromDb: podcast?.audioUrl ?? null,
      notFoundReason: !podcast ? "Podcast row was not found for this user." : "Podcast row has no audioUrl.",
    });
    return null;
  }

  const storedPath = getStoredAudioPath(podcast.audioUrl);
  if (!requestedPath || requestedPath !== storedPath) {
    logPodcastAudioRoute({
      podcastId: id,
      pathQueryParameter: requestedPath,
      podcastAudioUrlFromDb: podcast.audioUrl,
      notFoundReason: !requestedPath ? "Missing path query parameter." : "Path query parameter does not match podcast.audioUrl path.",
      storedPath,
    });
    return null;
  }

  const resolvedPath = resolveStoragePath(requestedPath);
  logPodcastAudioRoute({
    podcastId: id,
    pathQueryParameter: requestedPath,
    podcastAudioUrlFromDb: podcast.audioUrl,
    resolvedAbsoluteFilePath: resolvedPath,
    existsOnDisk: existsSync(resolvedPath),
  });

  return { filePath: requestedPath, podcast };
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const result = await resolveAudioPath(request, userId, id);
  if (!result)
    return NextResponse.json(
      { error: "Podcast audio not found." },
      { status: 404 },
    );

  const { filePath, podcast } = result;
  let fileSize: number;

  if (podcast.audioData) {
    fileSize = podcast.audioData.length;
  } else {
    try {
      const stats = await statFile(filePath!);
      fileSize = stats.size;
    } catch {
      const resolvedPath = resolveStoragePath(filePath!);
      logPodcastAudioRoute({
        podcastId: id,
        pathQueryParameter: filePath,
        podcastAudioUrlFromDb: podcast.audioUrl,
        resolvedAbsoluteFilePath: resolvedPath,
        existsOnDisk: existsSync(resolvedPath),
        notFoundReason: "Audio file stat failed in HEAD handler.",
      });
      return NextResponse.json(
        { error: "Audio file not found on disk." },
        { status: 404 },
      );
    }
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

  const { id } = await params;

  const result = await resolveAudioPath(request, userId, id);
  if (!result)
    return NextResponse.json(
      { error: "Podcast audio not found." },
      { status: 404 },
    );

  const { filePath, podcast } = result;

  let fileSize: number;
  let audioBuffer: Buffer | null = null;

  if (podcast.audioData) {
    audioBuffer = Buffer.from(podcast.audioData);
    fileSize = audioBuffer.length;
  } else {
    try {
      const stats = await statFile(filePath!);
      fileSize = stats.size;
    } catch {
      const resolvedPath = resolveStoragePath(filePath!);
      logPodcastAudioRoute({
        podcastId: id,
        pathQueryParameter: filePath,
        podcastAudioUrlFromDb: podcast.audioUrl,
        resolvedAbsoluteFilePath: resolvedPath,
        existsOnDisk: existsSync(resolvedPath),
        notFoundReason: "Audio file stat failed in GET handler.",
      });
      return NextResponse.json(
        { error: "Audio file not found on disk." },
        { status: 404 },
      );
    }
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

    if (audioBuffer) {
      const chunk = audioBuffer.subarray(start, end + 1);
      return new Response(new Uint8Array(chunk), {
        status: 206,
        headers: {
          ...commonHeaders,
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        },
      });
    } else {
      const nodeStream = createFileReadStream(filePath!, { start, end });
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
  }

  // --- Full request (200 OK) ---
  if (audioBuffer) {
    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        ...commonHeaders,
        "Content-Length": String(fileSize),
      },
    });
  } else {
    const nodeStream = createFileReadStream(filePath!);
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
}
