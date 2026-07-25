import { prisma } from "@/lib/prisma";
import type { SourceChunk, SourceType } from "@/lib/generated/prisma/client";
import { formatMediaTimestamp } from "@/lib/formatters";
import { embedText } from "./embeddings";
import { getPineconeIndex } from "./pinecone";

export type RetrievedChunk = SourceChunk & { score: number; source: { id: string; type: SourceType; url: string | null; filePath: string | null } };
export type QueryIntent = "overview" | "summarization" | "specific" | "comparison" | "follow_up" | "explanation" | "study_guide" | "list_sources";
export type RetrievalPlan = { intent: QueryIntent; query: string; limit: number; topK: number; broad: boolean };
type SearchDb = {
  source: { findMany(args: { where: { notebookId: string }; orderBy?: { createdAt: "asc" | "desc" }; select: { id: true; title: true; type: true; status: true; url: true; createdAt: true } }): Promise<Array<{ id: string; title: string; type: SourceType; status: string; url: string | null; createdAt: Date }>> };
  sourceChunk: { findMany(args: { where: { id?: { in: string[] }; notebookId?: string }; include: { source: true }; orderBy?: { chunkIndex: "asc" }; take?: number }): Promise<RetrievedChunk[]> };
};
const db = prisma as unknown as SearchDb;

export function formatChunkCitation(chunk: { title: string; timestampStartMs: number | null }) {
  const ts = formatMediaTimestamp(chunk.timestampStartMs);
  return ts ? `${chunk.title} @ ${ts}` : chunk.title;
}

export function formatTimestamp(milliseconds: number | null | undefined) {
  return formatMediaTimestamp(milliseconds);
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

export function classifyQueryIntent(question: string, history: Array<{ role: string; content: string }> = []): QueryIntent {
  const normalized = question.toLowerCase().trim();
  if (/\b(what (have|did) i upload|uploaded resources?|list (my |the )?(sources|resources|uploads)|show (my |the )?(sources|resources|uploads))\b/.test(normalized)) return "list_sources";
  if (/\b(compare|contrast|versus| vs\.? |differences?|similarities?|which is better|pros and cons)\b/.test(normalized)) return "comparison";
  if (/\b(study guide|study notes|revision notes|flashcards?|outline|quiz me|key takeaways|important concepts?)\b/.test(normalized)) return "study_guide";
  if (/\b(summarize|summary|tl;?dr|recap|condense|main points?)\b/.test(normalized)) return "summarization";
  if (
    /\b(overview|gist|everything|notebook-wide|what topics)\b/.test(normalized) ||
    /\b(wha[it]|wht|what) (is|are|was|were) (being )?(discussed|talked about|covered|explained|mentioned|shown)\b/.test(normalized) ||
    /\b(wha[it]|wht|what) (is|are) (this|the|my) (video|videos|pdf|pdfs|document|documents|source|sources|notebook|file|files) (about|discussing|covering|talking about)\b/.test(normalized) ||
    /\bwhat do (these|the|my) (resources|notes|uploads|documents|video|videos|files) (tell|say|discuss|cover)\b/.test(normalized) ||
    /\b(tell|explain) (me )?about (this|the|my) (video|videos|pdf|document|source|notebook)\b/.test(normalized)
  ) return "overview";
  if (/\b(explain|why|how does|walk me through|teach me)\b/.test(normalized)) return "explanation";
  if (history.length && /^(it|that|this|they|those|them|he|she|and|also|what about|how about|why|how|where|when)\b/.test(normalized)) return "follow_up";
  return "specific";
}

export function buildRetrievalPlan(question: string, history: Array<{ role: string; content: string }> = []): RetrievalPlan {
  const intent = classifyQueryIntent(question, history);
  const historyContext = history.slice(-6).map((message) => `${message.role}: ${message.content}`).join("\n");
  const query = intent === "follow_up" && historyContext ? `${historyContext}\nuser: ${question}` : question.trim();
  const broad = ["overview", "summarization", "study_guide", "list_sources"].includes(intent);
  const limitByIntent: Record<QueryIntent, number> = { overview: 10, summarization: 10, specific: 5, comparison: 8, follow_up: 6, explanation: 6, study_guide: 10, list_sources: 0 };
  const limit = limitByIntent[intent];
  return { intent, query, limit, topK: broad ? 40 : Math.max(limit * 4, 12), broad };
}

const minimumSimilarity = 0.45;

const stopwords = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there",
  "their", "what", "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no",
  "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then",
  "now", "look", "only", "come", "its", "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first",
  "है", "हैं", "था", "थी", "थे", "एक", "और", "में", "पर", "से", "का", "के", "की", "को", "यह", "वह", "ये", "वे", "जो", "कि",
  "ने", "भी", "तो", "ही", "क्या", "हो", "हुआ", "हुए", "होने", "कर", "करने", "करता", "करती", "करते", "करत", "अपने", "अपनी", "अपना",
  "साथ", "तक", "दिया", "लिया", "गया", "नही", "नहीं", "दिस", "डेट", "इस", "उस", "बात", "आज", "हम", "आप", "दोस्तों", "वीडियो",
  "होता", "होते", "होती", "होना", "रहा", "रहे", "रही", "जाता", "जाते", "जाती", "दिए", "दिये", "लिए", "लिये", "अलग", "तरह", "काम",
  "hai", "hain", "tha", "thi", "the", "ek", "aur", "mein", "par", "se", "ka", "ke", "ki", "ko", "yeh", "woh", "kya", "bhi",
  "kar", "karna", "karte", "aap", "hum", "dosto", "video", "baat", "aaj", "is", "us"
]);

function termOverlap(left: string, right: string) {
  const leftTerms = new Set(
    (left.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((term) => !stopwords.has(term))
  );
  const rightTerms = new Set(
    (right.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((term) => !stopwords.has(term))
  );
  if (!leftTerms.size || !rightTerms.size) return 0;
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

function sourceDiverseChunks(chunks: RetrievedChunk[], limit: number) {
  const bySource = new Map<string, RetrievedChunk[]>();
  for (const chunk of chunks) {
    const sourceChunks = bySource.get(chunk.sourceId) ?? [];
    sourceChunks.push(chunk);
    bySource.set(chunk.sourceId, sourceChunks);
  }
  const selected: RetrievedChunk[] = [];
  while (selected.length < limit && [...bySource.values()].some((items) => items.length)) {
    for (const items of bySource.values()) {
      const next = items.shift();
      if (next) selected.push(next);
      if (selected.length >= limit) break;
    }
  }
  return rerankChunks(selected, limit);
}

async function representativeNotebookChunks(notebookId: string, limit: number) {
  const allChunks = await db.sourceChunk.findMany({
    where: { notebookId },
    include: { source: true },
    orderBy: { chunkIndex: "asc" },
    take: 200,
  });

  if (allChunks.length === 0) return [];

  const bySource = new Map<string, RetrievedChunk[]>();
  for (const raw of allChunks) {
    const chunk = { ...raw, score: 0.5 };
    const list = bySource.get(chunk.sourceId) ?? [];
    list.push(chunk);
    bySource.set(chunk.sourceId, list);
  }

  const numSources = bySource.size;
  const chunksPerSource = Math.max(2, Math.floor(limit / Math.max(1, numSources)));
  const selected: RetrievedChunk[] = [];

  for (const [, sourceChunks] of bySource.entries()) {
    const count = sourceChunks.length;
    if (count <= chunksPerSource) {
      selected.push(...sourceChunks);
    } else {
      const step = (count - 1) / (chunksPerSource - 1);
      for (let i = 0; i < chunksPerSource; i++) {
        const idx = Math.min(count - 1, Math.round(i * step));
        const candidate = sourceChunks[idx];
        if (candidate.source.type === "YOUTUBE" && (candidate.timestampStartMs ?? 0) === 0 && count > 1) {
          const nonZero = sourceChunks.find((c) => (c.timestampStartMs ?? 0) > 0);
          if (nonZero && !selected.some((s) => s.id === nonZero.id)) {
            selected.push(nonZero);
            continue;
          }
        }
        if (!selected.some((s) => s.id === candidate.id)) {
          selected.push(candidate);
        }
      }
    }
  }

  return rerankChunks(selected.slice(0, limit), limit);
}

export async function searchNotebookChunks(notebookId: string, query: string, planOrLimit: RetrievalPlan | number = 5) {
  const plan = typeof planOrLimit === "number" ? { intent: "specific" as const, query, limit: planOrLimit, topK: Math.max(planOrLimit * 3, 10), broad: false } : planOrLimit;
  if (plan.limit <= 0) return [];

  if (plan.intent === "summarization") {
    const representative = await representativeNotebookChunks(notebookId, plan.limit);
    if (representative.length > 0) return representative;
  }

  const index = getPineconeIndex();
  const embedding = await embedText(query);
  const result = await index.namespace("chunks").query({ vector: embedding, topK: plan.topK, includeMetadata: true, filter: { notebookId: { $eq: notebookId } } });
  const threshold = plan.broad ? 0.25 : minimumSimilarity;
  const matches = result.matches.filter((match) => (match.score ?? 0) >= threshold);
  const chunkIds = matches.map((match) => match.id);
  const chunks = await db.sourceChunk.findMany({ where: { id: { in: chunkIds } }, include: { source: true } });
  const candidates = chunkIds.map((id, position) => {
    const chunk = chunks.find((item: { id: string }) => item.id === id);
    if (!chunk) return null;
    return { ...chunk, score: matches[position]?.score ?? 0 };
  }).filter(Boolean) as RetrievedChunk[];
  const ranked = plan.broad ? sourceDiverseChunks(candidates, plan.limit) : rerankChunks(candidates, plan.limit);
  if (ranked.length >= Math.min(3, plan.limit) || (!plan.broad && ranked.length > 0)) return ranked;
  const fallbacks = await representativeNotebookChunks(notebookId, plan.limit);
  return sourceDiverseChunks([...ranked, ...fallbacks], plan.limit);
}

export function buildGroundedPrompt(question: string, chunks: RetrievedChunk[], intent: QueryIntent = "specific") {
  const context = chunks
    .map((chunk) => {
      const ts = formatTimestamp(chunk.timestampStartMs);
      return `[Source: ${chunk.title}${ts ? ` (${ts})` : ""}]\n${chunk.text}`;
    })
    .join("\n\n");
  const isHindiOrHinglish = /[\u0900-\u097F]|\b(kya|hai|kaise|ko|ka|ke|ki|batao|matlab|mein|se|ye|woh|kab|kahan|kyun|bhi|hain|kisi|par)\b/i.test(question);
  const languageGuidance = isHindiOrHinglish
    ? "\nIMPORTANT: Respond in Hinglish (Hindi in Roman/Latin script, e.g., 'ARP networking mein use hone wala protocol hai...'). Do NOT use Devanagari script."
    : "";

  if (intent === "summarization" || /\b(summary|summarize)\b/i.test(question)) {
    return `Notebook Content Context:
${context}

Synthesize the provided notebook content context above into a detailed, comprehensive summary.

For each section below, write 2-4 detailed sentences or bullet points based on the notebook context. Every section heading MUST be followed by content. Do not leave any heading empty.${languageGuidance}

1. Start with a "# Notebook Summary" title.
2. Under "## Overview", write a 2-3 sentence overview of all the materials.
3. Under "## Main Topics", list and describe the key topics covered.
4. Under "## Key Concepts", explain the core technical concepts and ideas.
5. Under "## Important Definitions", define key terms, acronyms, and terminology.
6. Under "## Relationships Between Topics", explain how the topics in the notebook connect.
7. Under "## Important Examples", describe specific examples or scenarios from the text.
8. Under "## Key Takeaways", provide 4 bullet points summarizing key lessons.
9. Under "## Suggested Next Steps", provide 3 practical next steps for learning.

Generate the full summary now.`;
  }

  return `Notebook Content Context:
${context}

${languageGuidance}Answer the question using only the context above. Do not mention source labels or citation markers; Lumina renders supporting sources separately. If the context does not answer the question, say so plainly.

Question: ${question}`;
}

export function isNegativeResponse(answer: string): boolean {
  const normalized = answer.toLowerCase();
  return (
    /does not (contain|provide|mention|have|specify)|no (information|mention|context|data)|cannot (be )?answer|not mentioned|not provided|unclear from context|plainly/i.test(normalized) ||
    /jankari (nahi|nhi)|pata (nahi|nhi)|kuch (nahi|nhi)|zikr (nahi|nhi)|context (mein|me).*nahi|di gayi/i.test(normalized)
  );
}

export function selectCitationsForAnswer(answer: string, chunks: RetrievedChunk[]) {
  if (isNegativeResponse(answer)) return [];

  const candidates = chunks
    .map((chunk) => {
      const overlap = termOverlap(answer, chunk.text);
      const isVectorMatch = chunk.score >= 0.50;
      const isOverlapMatch = overlap >= 0.18;
      const hasValidTimestamp = typeof chunk.timestampStartMs === "number" && chunk.timestampStartMs >= 1000;
      const timestampBonus = hasValidTimestamp ? 0.05 : 0;
      const relevanceScore = (isVectorMatch ? chunk.score + overlap : isOverlapMatch ? overlap : 0) + timestampBonus;
      return { chunk, isRelevant: isVectorMatch || isOverlapMatch, relevanceScore };
    })
    .filter((item) => item.isRelevant);

  const bySource = new Map<string, typeof candidates>();
  for (const item of candidates) {
    const list = bySource.get(item.chunk.sourceId) ?? [];
    list.push(item);
    bySource.set(item.chunk.sourceId, list);
  }

  const resultCitations: RetrievedChunk[] = [];
  for (const [, items] of bySource.entries()) {
    const isYouTube = items.some((it) => it.chunk.source.type === "YOUTUBE");
    if (isYouTube) {
      const validTsItems = items.filter((it) => typeof it.chunk.timestampStartMs === "number" && it.chunk.timestampStartMs >= 1000);
      if (validTsItems.length > 0) {
        validTsItems.sort((a, b) => (a.chunk.timestampStartMs as number) - (b.chunk.timestampStartMs as number));
        resultCitations.push(...validTsItems.map((it) => it.chunk));
      } else {
        items.sort((a, b) => b.relevanceScore - a.relevanceScore);
        resultCitations.push(items[0].chunk);
      }
    } else {
      items.sort((a, b) => b.relevanceScore - a.relevanceScore);
      resultCitations.push(items[0].chunk);
    }
  }

  if (resultCitations.length === 0 && chunks.length > 0) {
    return chunks.slice(0, 10);
  }

  return resultCitations.slice(0, 10);
}

export async function listNotebookSources(notebookId: string) {
  return db.source.findMany({ where: { notebookId }, orderBy: { createdAt: "asc" }, select: { id: true, title: true, type: true, status: true, url: true, createdAt: true } });
}
