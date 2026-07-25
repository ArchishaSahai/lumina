import { YoutubeTranscript } from "youtube-transcript";
import type { SourceParser } from "../types";
import { normalizeText } from "./normalize";

export const youtubeParser: SourceParser = {
  async parse(input) {
    if (!input.url) throw new Error("YouTube source has no URL.");
    const transcript = await YoutubeTranscript.fetchTranscript(input.url);
    if (!transcript.length) throw new Error("No transcript is available for this YouTube video.");
    const valuesAreMilliseconds = transcript.some((cue) => cue.duration > 100);
    const scale = valuesAreMilliseconds ? 1 : 1000;
    const segments = transcript.map((cue) => ({
      text: normalizeText(cue.text),
      timestampStartMs: Math.round(cue.offset * scale),
      timestampEndMs: Math.round((cue.offset + cue.duration) * scale),
    })).filter((cue) => cue.text);
    const text = normalizeText(segments.map((segment) => segment.text).join(" "));
    if (!text) throw new Error("The YouTube transcript did not contain readable text.");
    return { text, segments };
  },
};
