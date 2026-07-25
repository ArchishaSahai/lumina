import type { ChunkMetadata, ParsedDocument, TextChunk, TextSegment } from "../types";

export type ChunkerConfig = { targetTokens: number; minTokens: number; maxTokens: number; overlapTokens: number };
export const defaultChunkerConfig: ChunkerConfig = { targetTokens: 650, minTokens: 500, maxTokens: 800, overlapTokens: 100 };

type Unit = TextSegment & { tokens: number };

export function chunkDocument(document: ParsedDocument, metadata: Omit<ChunkMetadata, "chunkIndex" | "timestampStartMs" | "timestampEndMs">, config: ChunkerConfig = defaultChunkerConfig): TextChunk[] {
  validateConfig(config);
  const units = document.segments.flatMap((segment) => semanticUnits(segment, config.maxTokens - config.overlapTokens));
  const groups: Unit[][] = [];
  let current: Unit[] = [];
  let tokens = 0;

  for (const unit of units) {
    if (current.length && ((tokens >= config.minTokens && tokens + unit.tokens > config.targetTokens) || tokens + unit.tokens > config.maxTokens)) {
      groups.push(current);
      current = overlapFrom(current, config.overlapTokens);
      tokens = current.reduce((sum, item) => sum + item.tokens, 0);
    }
    current.push(unit);
    tokens += unit.tokens;
    if (tokens >= config.maxTokens) { groups.push(current); current = overlapFrom(current, config.overlapTokens); tokens = current.reduce((sum, item) => sum + item.tokens, 0); }
  }
  if (current.length && (!groups.length || current.some((unit) => !groups.at(-1)?.includes(unit)))) groups.push(current);

  return groups.map((group, chunkIndex) => {
    const starts = group.flatMap((unit) => unit.timestampStartMs === undefined ? [] : [unit.timestampStartMs]);
    const ends = group.flatMap((unit) => unit.timestampEndMs === undefined ? [] : [unit.timestampEndMs]);
    return { text: group.map((unit) => unit.text).join(" ").trim(), metadata: { ...metadata, chunkIndex, ...(starts.length && { timestampStartMs: Math.min(...starts) }), ...(ends.length && { timestampEndMs: Math.max(...ends) }) } };
  });
}

export function estimateTokens(text: string) { return Math.max(1, Math.ceil(text.length / 4)); }

function semanticUnits(segment: TextSegment, maxTokens: number): Unit[] {
  const pieces = segment.text.split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/).map((part) => part.trim()).filter(Boolean);
  return pieces.flatMap((piece) => splitOversized(piece, maxTokens).map((text) => ({ ...segment, text, tokens: estimateTokens(text) })));
}

function splitOversized(text: string, maxTokens: number) {
  if (estimateTokens(text) <= maxTokens) return [text];
  const words = text.split(/\s+/); const results: string[] = []; let current: string[] = [];
  for (const word of words) { if (current.length && estimateTokens([...current, word].join(" ")) > maxTokens) { results.push(current.join(" ")); current = []; } current.push(word); }
  if (current.length) results.push(current.join(" "));
  return results;
}

function overlapFrom(units: Unit[], limit: number) { const overlap: Unit[] = []; let tokens = 0; for (let index = units.length - 1; index >= 0; index -= 1) { if (tokens + units[index].tokens > limit && overlap.length) break; overlap.unshift(units[index]); tokens += units[index].tokens; } return overlap; }
function validateConfig(config: ChunkerConfig) { if (config.minTokens <= 0 || config.minTokens > config.targetTokens || config.targetTokens > config.maxTokens || config.overlapTokens >= config.minTokens) throw new Error("Invalid chunker configuration."); }
