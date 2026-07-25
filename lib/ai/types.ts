export type Citation = {
  sourceId: string;
  sourceTitle: string;
  chunkId: string;
  preview: string;
  timestampStartMs?: number | null;
  timestampEndMs?: number | null;
};
