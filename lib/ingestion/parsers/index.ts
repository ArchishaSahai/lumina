import path from "node:path";
import { SourceType } from "@/lib/generated/prisma/client";
import type { ParserInput, SourceParser } from "../types";
import { markdownParser, pdfParser, textParser } from "./file";
import { vttParser } from "./vtt";
import { websiteParser } from "./web";
import { youtubeParser } from "./youtube";

const parsers: Record<SourceType, SourceParser> = {
  PDF: pdfParser,
  MARKDOWN: markdownParser,
  TEXT: textParser,
  VTT: vttParser,
  WEBSITE: websiteParser,
  YOUTUBE: youtubeParser,
};

export function detectSourceType(input: Pick<ParserInput, "title" | "filePath" | "url">): SourceType {
  if (input.url) {
    const hostname = new URL(input.url).hostname.toLowerCase();
    return /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(hostname) ? SourceType.YOUTUBE : SourceType.WEBSITE;
  }
  const extension = path.extname(input.filePath ?? input.title).toLowerCase();
  const type = ({ ".pdf": SourceType.PDF, ".md": SourceType.MARKDOWN, ".markdown": SourceType.MARKDOWN, ".txt": SourceType.TEXT, ".vtt": SourceType.VTT } as Record<string, SourceType>)[extension];
  if (!type) throw new Error(`Unsupported source extension: ${extension || "unknown"}.`);
  return type;
}

export function getParser(type: SourceType) { return parsers[type]; }
