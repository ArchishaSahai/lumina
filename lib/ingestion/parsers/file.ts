import { extractText } from "unpdf";
import { readFile } from "@/lib/storage";
import type { ParsedDocument, ParserInput, SourceParser } from "../types";
import { decodeEntities, normalizeText } from "./normalize";

async function read(input: ParserInput) {
  if (!input.filePath) throw new Error(`${input.type} source has no stored file.`);
  return readFile(input.filePath);
}

export const pdfParser: SourceParser = {
  async parse(input) {
    const { text } = await extractText(new Uint8Array(await read(input)), { mergePages: false });
    const segments = text.map((pageText, index) => ({
      text: normalizeText(pageText),
      timestampStartMs: index + 1,
      timestampEndMs: index + 1,
    })).filter((seg) => seg.text.length > 0);

    const fullText = segments.map((seg) => seg.text).join("\n");
    if (!fullText) throw new Error("No readable text was found in this source.");
    return { text: fullText, segments };
  },
};

export const textParser: SourceParser = {
  async parse(input) { return documentFromText((await read(input)).toString("utf8")); },
};

export const markdownParser: SourceParser = {
  async parse(input) {
    const markdown = (await read(input)).toString("utf8");
    const plainText = markdown
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/^```[^\n]*|```$/g, ""))
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*>\s?/gm, "")
      .replace(/[*_~`]/g, "");
    return documentFromText(decodeEntities(plainText));
  },
};

function documentFromText(value: string): ParsedDocument {
  const text = normalizeText(value);
  if (!text) throw new Error("No readable text was found in this source.");
  return { text, segments: [{ text }] };
}
