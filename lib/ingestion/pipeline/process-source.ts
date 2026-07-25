import { SourceStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { chunkDocument, type ChunkerConfig, defaultChunkerConfig } from "../chunker/semantic";
import { detectSourceType, getParser } from "../parsers";
import type { TextChunk } from "../types";
import { upsertChunksToPinecone } from "@/lib/ai/rag";

export type ProcessSourceOptions = { chunker?: ChunkerConfig };
export type ProcessSourceResult = { parsedText: string; chunks: TextChunk[] };

async function updateProcessingStage(sourceId: string, stage: string) {
  await prisma.source.update({ where: { id: sourceId }, data: { status: SourceStatus.PROCESSING, processingError: `stage:${stage}` } });
}

export async function processSource(sourceId: string, options: ProcessSourceOptions = {}): Promise<ProcessSourceResult> {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("Source not found.");

  await updateProcessingStage(source.id, "EXTRACTING");

  try {
    const type = detectSourceType(source);
    const parsed = await getParser(type).parse({ title: source.title, type, filePath: source.filePath, url: source.url });
    await updateProcessingStage(source.id, "CHUNKING");
    const chunks = chunkDocument(parsed, { sourceId: source.id, notebookId: source.notebookId, sourceType: type, title: source.title }, options.chunker ?? defaultChunkerConfig);
    if (!chunks.length) throw new Error("No chunks could be created from this source.");

    const createdChunks = await prisma.$transaction(async (transaction) => {
      await transaction.sourceChunk.deleteMany({ where: { sourceId: source.id } });
      const newChunks = await transaction.sourceChunk.createManyAndReturn({ data: chunks.map(({ text, metadata }) => ({
        sourceId: metadata.sourceId,
        notebookId: metadata.notebookId,
        chunkIndex: metadata.chunkIndex,
        sourceType: metadata.sourceType,
        title: metadata.title,
        text,
        timestampStartMs: metadata.timestampStartMs,
        timestampEndMs: metadata.timestampEndMs,
      })) });
      await transaction.source.update({
        where: { id: source.id },
        data: { type, parsedText: parsed.text, processingError: "stage:EMBEDDING" },
      });
      return newChunks;
    }, { maxWait: 15000, timeout: 60000 });

    await updateProcessingStage(source.id, "EMBEDDING");
    await upsertChunksToPinecone(createdChunks);
    await prisma.source.update({
      where: { id: source.id },
      data: { status: SourceStatus.READY, processedAt: new Date(), processingError: null },
    });
    return { parsedText: parsed.text, chunks };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Source processing failed.";
    await prisma.source.update({ where: { id: source.id }, data: { status: SourceStatus.FAILED, processingError: message.slice(0, 1000) } });
    throw cause;
  }
}
