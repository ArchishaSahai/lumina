import { readFile } from "@/lib/storage";
import type { SourceParser, TextSegment } from "../types";
import { decodeEntities, normalizeText } from "./normalize";

const timingPattern = /^(\d{2}:)?\d{2}:\d{2}[.,]\d{3}\s+-->\s+(\d{2}:)?\d{2}:\d{2}[.,]\d{3}/;

export const vttParser: SourceParser = {
  async parse(input) {
    if (!input.filePath) throw new Error("VTT source has no stored file.");
    const blocks = (await readFile(input.filePath)).toString("utf8").replace(/^\uFEFF?WEBVTT[^\n]*\n/i, "").split(/\r?\n\s*\r?\n/);
    const segments: TextSegment[] = [];
    for (const block of blocks) {
      const lines = block.split(/\r?\n/).filter(Boolean);
      const timingIndex = lines.findIndex((line) => timingPattern.test(line.trim()));
      if (timingIndex < 0) continue;
      const [start, end] = lines[timingIndex].split("-->").map((part) => part.trim().split(/\s/)[0]);
      const text = normalizeText(decodeEntities(lines.slice(timingIndex + 1).join(" ").replace(/<[^>]+>/g, "")));
      if (text) segments.push({ text, timestampStartMs: timestampToMs(start), timestampEndMs: timestampToMs(end) });
    }
    const text = normalizeText(segments.map((segment) => segment.text).join(" "));
    if (!text) throw new Error("No transcript cues were found in this VTT file.");
    return { text, segments };
  },
};

function timestampToMs(value: string) {
  const parts = value.replace(",", ".").split(":").map(Number);
  const seconds = parts.pop() ?? 0;
  const minutes = parts.pop() ?? 0;
  const hours = parts.pop() ?? 0;
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}
