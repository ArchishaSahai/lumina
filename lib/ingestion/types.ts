import type { SourceType } from "@/lib/generated/prisma/client";

export type TextSegment = {
  text: string;
  timestampStartMs?: number;
  timestampEndMs?: number;
};

export type ParsedDocument = {
  text: string;
  segments: TextSegment[];
};

export type ParserInput = {
  title: string;
  type: SourceType;
  filePath: string | null;
  url: string | null;
  fileData?: Buffer | Uint8Array | null;
};

export interface SourceParser {
  parse(input: ParserInput): Promise<ParsedDocument>;
}

export type ChunkMetadata = {
  sourceId: string;
  notebookId: string;
  chunkIndex: number;
  sourceType: SourceType;
  title: string;
  timestampStartMs?: number;
  timestampEndMs?: number;
};

export type TextChunk = { text: string; metadata: ChunkMetadata };
