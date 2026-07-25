import { prisma } from "@/lib/prisma";
import type { SourceChunk, SourceType } from "@/lib/generated/prisma/client";
import { embedText } from "./embeddings";
import { getPineconeIndex } from "./pinecone";

export type RetrievedChunk = SourceChunk & { score: number; source: { id: string; type: SourceType; url: string | null; filePath: string | null } };
type SearchDb = { sourceChunk: { findMany(args: { where: { id: { in: string[] } }; include: { source: true } }): Promise<RetrievedChunk[]> } };
const db = prisma as unknown as SearchDb;

export function formatChunkCitation(chunk: { title: string; timestampStartMs: number | null }) {
  return chunk.timestampStartMs == null ? chunk.title : `${chunk.title} @ ${formatTimestamp(chunk.timestampStartMs)}`;
}

export function formatTimestamp(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export async function upsertChunksToPinecone(chunks: Array<{ id: string; notebookId: string; sourceId: string; chunkIndex: number; text: string; title: string; sourceType: SourceType; timestampStartMs?: number | null; timestampEndMs?: number | null }>) {
  if (!chunks.length) return;
  const index = getPineconeIndex();
  const vectors: Array<{ id: string; values: number[]; metadata: { notebookId: string; sourceId: string; chunkIndex: number; title: string; sourceType: string; timestampStartMs: number; timestampEndMs: number; text: string } }> = [];
  for (const chunk of chunks) {
    vectors.push({ id: chunk.id, values: await embedText(chunk.text), metadata: { notebookId: chunk.notebookId, sourceId: chunk.sourceId, chunkIndex: chunk.chunkIndex, title: chunk.title, sourceType: chunk.sourceType, timestampStartMs: chunk.timestampStartMs ?? -1, timestampEndMs: chunk.timestampEndMs ?? -1, text: chunk.text.slice(0, 4096) } });
  }
  const namespacedIndex = index.namespace("chunks") as { upsert(input: { records: typeof vectors }): Promise<void> };
  await namespacedIndex.upsert({ records: vectors });
}

export async function removeChunksFromPinecone(sourceId: string) {
  await getPineconeIndex().namespace("chunks").deleteMany({ filter: { sourceId: { $eq: sourceId } } });
}

export async function rewriteQuery(question: string) {
  return question.trim();
}

const minimumSimilarity = 0.45;

function termOverlap(left: string, right: string) {
  const leftTerms = new Set(left.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
  const rightTerms = new Set(right.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
  const shared = [...leftTerms].filter((term) => rightTerms.has(term)).length;
  return shared / Math.max(1, Math.min(leftTerms.size, rightTerms.size));
}

function rerankChunks(chunks: RetrievedChunk[], limit: number) {
  const selected: RetrievedChunk[] = [];
  const remaining = [...chunks];
  while (selected.length < limit && remaining.length) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    remaining.forEach((chunk, index) => {
      const redundancy = selected.length ? Math.max(...selected.map((selectedChunk) => termOverlap(chunk.text, selectedChunk.text))) : 0;
      const sourcePenalty = selected.some((selectedChunk) => selectedChunk.sourceId === chunk.sourceId) ? 0.08 : 0;
      const mmrScore = 0.78 * chunk.score - 0.22 * redundancy - sourcePenalty;
      if (mmrScore > bestScore) { bestScore = mmrScore; bestIndex = index; }
    });
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }
  return selected;
}

export async function searchNotebookChunks(notebookId: string, query: string, limit = 5) {
  const index = getPineconeIndex();
  const embedding = await embedText(query);
  const result = await index.namespace("chunks").query({ vector: embedding, topK: Math.max(limit * 3, 10), includeMetadata: true, filter: { notebookId: { $eq: notebookId } } });
  const matches = result.matches.filter((match) => (match.score ?? 0) >= minimumSimilarity);
  const chunkIds = matches.map((match) => match.id);
  const chunks = await db.sourceChunk.findMany({ where: { id: { in: chunkIds } }, include: { source: true } });
  const candidates = chunkIds.map((id, position) => {
    const chunk = chunks.find((item: { id: string }) => item.id === id);
    if (!chunk) return null;
    return { ...chunk, score: matches[position]?.score ?? 0 };
  }).filter(Boolean) as RetrievedChunk[];
  return rerankChunks(candidates, limit);
}

export function buildGroundedPrompt(question: string, chunks: RetrievedChunk[]) {
  const context = chunks.map((chunk) => `${chunk.title}${chunk.timestampStartMs != null ? ` (${formatTimestamp(chunk.timestampStartMs)})` : ""}\n${chunk.text}`).join("\n\n");
  return `Answer the question using only the context below. Do not mention source labels, citation markers, or references; Lumina renders supporting sources separately. If the context does not answer the question, say so plainly.\n\nContext:\n${context}\n\nQuestion: ${question}`;
}

export function selectCitationsForAnswer(answer: string, chunks: RetrievedChunk[]) {
  const usedChunks = chunks.filter((chunk) => termOverlap(answer, chunk.text) >= 0.08);
  return usedChunks.slice(0, 3);
}
