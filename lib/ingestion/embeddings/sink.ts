import type { TextChunk } from "../types";

// Sprint 7 can implement this boundary without changing parsing or chunking.
export interface EmbeddingSink {
  index(chunks: TextChunk[]): Promise<void>;
  remove(sourceId: string): Promise<void>;
}
