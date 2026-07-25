import type { Source as PrismaSource, SourceStatus, SourceType } from "@/lib/generated/prisma/client";

export type NotebookSource = {
  id: string;
  notebookId: string;
  title: string;
  type: SourceType;
  status: SourceStatus;
  filePath: string | null;
  url: string | null;
  createdAt: string;
  processedAt: string | null;
  processingError: string | null;
};

export function serializeSource(source: PrismaSource): NotebookSource {
  return { ...source, createdAt: source.createdAt.toISOString(), processedAt: source.processedAt?.toISOString() ?? null };
}

export function sourceTypeLabel(type: SourceType) {
  return { PDF: "PDF", YOUTUBE: "YouTube", WEBSITE: "Website", MARKDOWN: "Markdown", TEXT: "TXT", VTT: "VTT" }[type];
}
