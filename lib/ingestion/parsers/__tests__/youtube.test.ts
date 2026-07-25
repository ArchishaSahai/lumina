import { describe, expect, test } from "bun:test";
import {
  classifyError,
  dedupeTracks,
  detectOriginalLanguage,
  extractVideoId,
  orderTracks,
  parseJson3Transcript,
  parseTranscriptXml,
  parseVttTranscript,
  validatePlayable,
  type CaptionTrack,
} from "../youtube";

describe("YouTube Transcript Extractor", () => {
  describe("1 & 3: Video ID and Track Discovery / Normalization", () => {
    test("extracts YouTube video IDs correctly from various URL formats", () => {
      expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    test("deduplicates tracks while preserving language and kind", () => {
      const tracks: CaptionTrack[] = [
        { baseUrl: "http://test/1", languageCode: "hi", vssId: "a.hi", kind: "asr" },
        { baseUrl: "http://test/1", languageCode: "hi", vssId: "a.hi", kind: "asr" },
        { baseUrl: "http://test/2", languageCode: "hi", vssId: ".hi" },
        { baseUrl: "http://test/3", languageCode: "en", vssId: ".en" },
      ];
      const deduped = dedupeTracks(tracks);
      expect(deduped).toHaveLength(3);
    });

    test("detects original language from microformat, defaults, or auto tracks", () => {
      const hiAutoTrack: CaptionTrack = { baseUrl: "http://t/1", languageCode: "hi", vssId: "a.hi", kind: "asr" };
      const enManualTrack: CaptionTrack = { baseUrl: "http://t/2", languageCode: "en", vssId: ".en" };
      expect(detectOriginalLanguage([hiAutoTrack, enManualTrack])).toBe("hi");

      const frDefaultTrack: CaptionTrack = { baseUrl: "http://t/3", languageCode: "fr", isDefault: true };
      expect(detectOriginalLanguage([frDefaultTrack, enManualTrack])).toBe("fr");
    });
  });

  describe("2 & 6: Track Selection Priority", () => {
    test("prioritizes Manual English > Auto English > Manual Original > Auto Original > Remaining", () => {
      const manualEn: CaptionTrack = { baseUrl: "http://t/en-manual", languageCode: "en", vssId: ".en" };
      const autoEn: CaptionTrack = { baseUrl: "http://t/en-auto", languageCode: "en", vssId: "a.en", kind: "asr" };
      const manualHi: CaptionTrack = { baseUrl: "http://t/hi-manual", languageCode: "hi", vssId: ".hi" };
      const autoHi: CaptionTrack = { baseUrl: "http://t/hi-auto", languageCode: "hi", vssId: "a.hi", kind: "asr" };
      const manualEs: CaptionTrack = { baseUrl: "http://t/es-manual", languageCode: "es", vssId: ".es" };

      // Original language is Hindi
      const tracks = [autoHi, manualEs, autoEn, manualHi, manualEn];
      const ordered = orderTracks(tracks, "hi");

      expect(ordered[0].reason).toBe("manual English captions");
      expect(ordered[0].track.baseUrl).toBe("http://t/en-manual");

      expect(ordered[1].reason).toBe("auto-generated English captions");
      expect(ordered[1].track.baseUrl).toBe("http://t/en-auto");

      expect(ordered[2].reason).toBe("manual captions in original language");
      expect(ordered[2].track.baseUrl).toBe("http://t/hi-manual");

      expect(ordered[3].reason).toBe("auto-generated captions in original language");
      expect(ordered[3].track.baseUrl).toBe("http://t/hi-auto");

      expect(ordered[4].reason).toBe("remaining available transcript");
      expect(ordered[4].track.baseUrl).toBe("http://t/es-manual");
    });

    test("selects Hindi captions when English captions are unavailable", () => {
      const autoHi: CaptionTrack = { baseUrl: "http://t/hi-auto", languageCode: "hi", vssId: "a.hi", kind: "asr" };
      const ordered = orderTracks([autoHi], "hi");

      expect(ordered).toHaveLength(1);
      expect(ordered[0].reason).toBe("auto-generated captions in original language");
      expect(ordered[0].track.languageCode).toBe("hi");
    });
  });

  describe("3 & 4: Multilingual, Hindi, Hinglish, Punctuation & Timestamps Preservation", () => {
    test("parses XML captions preserving Devanagari Unicode, Hinglish, punctuation, and timestamps", () => {
      const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0.5" dur="2.1">नमस्ते दोस्तों! Welcome to this tutorial.</text>
  <text start="2.6" dur="3.0">आज हम सीखेंगे React Hooks &#x26; Next.js &#x0905;&#x092D;&#x0940;&#x0964;</text>
</transcript>`;

      const segments = parseTranscriptXml(xml);
      expect(segments).toHaveLength(2);

      expect(segments[0].timestampStartMs).toBe(500);
      expect(segments[0].timestampEndMs).toBe(2600);
      expect(segments[0].text).toBe("नमस्ते दोस्तों! Welcome to this tutorial.");

      expect(segments[1].timestampStartMs).toBe(2600);
      expect(segments[1].timestampEndMs).toBe(5600);
      expect(segments[1].text).toBe("आज हम सीखेंगे React Hooks & Next.js अभी।");
    });

    test("parses srv3 XML (<p t=\"...\" d=\"...\">) with non-English text", () => {
      const srv3Xml = `
<timedtext format="3">
  <body>
    <p t="1000" d="2500">हाइ दोस्तों, <s>यह</s> एक टेस्ट है&#39;s clear!</p>
  </body>
</timedtext>`;
      const segments = parseTranscriptXml(srv3Xml);
      expect(segments).toHaveLength(1);
      expect(segments[0].timestampStartMs).toBe(1000);
      expect(segments[0].timestampEndMs).toBe(3500);
      expect(segments[0].text).toBe("हाइ दोस्तों, यह एक टेस्ट है's clear!");
    });

    test("parses json3 transcript format", () => {
      const json3 = JSON.stringify({
        events: [
          { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: "Hello " }, { utf8: "world &amp; नमस्ते" }] },
        ],
      });
      const segments = parseJson3Transcript(json3);
      expect(segments).toHaveLength(1);
      expect(segments[0].text).toBe("Hello world & नमस्ते");
      expect(segments[0].timestampStartMs).toBe(0);
      expect(segments[0].timestampEndMs).toBe(2000);
    });

    test("parses WebVTT format with Unicode text", () => {
      const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
<b>नमस्ते</b>! This is Hinglish code.`;

      const segments = parseVttTranscript(vtt);
      expect(segments).toHaveLength(1);
      expect(segments[0].timestampStartMs).toBe(1000);
      expect(segments[0].timestampEndMs).toBe(4000);
      expect(segments[0].text).toBe("नमस्ते! This is Hinglish code.");
    });
  });

  describe("7 & 8: Diagnostic Error Classification", () => {
    test("classifies private videos", () => {
      expect(() => validatePlayable({ playabilityStatus: { status: "ERROR", reason: "This video is private" } })).toThrow("private video");
      expect(classifyError(new Error("This video is private"))).toBe("private video");
    });

    test("classifies age restricted videos", () => {
      expect(() => validatePlayable({ playabilityStatus: { status: "LOGIN_REQUIRED", reason: "Sign in to confirm your age" } })).toThrow("age restricted");
      expect(classifyError(new Error("Sign in to confirm your age"))).toBe("age restricted");
    });

    test("classifies members only videos", () => {
      expect(() => validatePlayable({ playabilityStatus: { status: "UNPLAYABLE", reason: "Join this channel to get access to members only content" } })).toThrow("members only");
      expect(classifyError(new Error("Join this channel for members only"))).toBe("members only");
    });

    test("classifies region blocked videos", () => {
      expect(() => validatePlayable({ playabilityStatus: { status: "UNPLAYABLE", reason: "The uploader has not made this video available in your country" } })).toThrow("region blocked");
      expect(classifyError(new Error("Not available in your country"))).toBe("region blocked");
    });

    test("classifies captions disabled", () => {
      expect(classifyError(new Error("Subtitles are disabled for this video"))).toBe("captions disabled");
    });

    test("classifies network timeout", () => {
      expect(classifyError(new Error("network timeout"))).toBe("network timeout");
    });

    test("classifies no transcript available", () => {
      expect(classifyError(new Error("No transcript available"))).toBe("No transcript available");
    });

    test("classifies API failure with detailed reason", () => {
      expect(classifyError(new Error("YouTube server error 503"))).toBe("transcript API failure: YouTube server error 503");
    });
  });
});
