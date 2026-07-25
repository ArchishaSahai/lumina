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
};

export function serializeSource(source: PrismaSource): NotebookSource {
  return { ...source, createdAt: source.createdAt.toISOString() };
}

export function sourceTypeLabel(type: SourceType) {
  return { PDF: "PDF", YOUTUBE: "YouTube", WEBSITE: "Website", MARKDOWN: "Markdown", TEXT: "Text", VTT: "Transcript" }[type];
}
