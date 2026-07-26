import type { SourceParser, TextSegment } from "../types";
import { decodeEntities, normalizeText } from "./normalize";

export type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
  vssId?: string;
  isDefault?: boolean;
  name?: { simpleText?: string; runs?: Array<{ text: string }> };
};

export type PlayerResponse = {
  playabilityStatus?: { status?: string; reason?: string; errorScreen?: unknown };
  captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
  microformat?: { playerMicroformatRenderer?: { defaultAudioLanguage?: string } };
  videoDetails?: { defaultAudioLanguage?: string };
};

export type TrackAttempt = {
  track: CaptionTrack;
  priority: number;
  reason: string;
};

const youtubeIdPattern = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36";
const androidUserAgent = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";
const transcriptUnavailableMessage = "No transcript available";

export const youtubeParser: SourceParser = {
  async parse(input) {
    if (!input.url) throw new Error("YouTube source has no URL.");
    const videoId = extractVideoId(input.url);

    let tracks: CaptionTrack[] = [];
    let originalLanguage: string | null = null;

    try {
      const fetched = await fetchCaptionTracks(videoId);
      tracks = fetched.tracks;
      originalLanguage = fetched.originalLanguage;
    } catch (cause) {
      const reason = classifyError(cause);
      console.warn("YouTube transcript discovery failed", { videoId, reason, cause });
      throw new Error(reason);
    }

    if (!tracks.length) {
      const reason = transcriptUnavailableMessage;
      console.warn("YouTube transcript discovery found no tracks", { videoId, reason });
      throw new Error(reason);
    }

    const attempts = orderTracks(tracks, originalLanguage);
    const parsedTracks: Array<{ attempt: TrackAttempt; segments: TextSegment[]; textLength: number }> = [];
    const failures: string[] = [];

    for (const attempt of attempts) {
      const segments = await retry(() => fetchTrackSegments(attempt.track, videoId), 2).catch((cause) => {
        const reason = classifyError(cause);
        failures.push(`${describeTrack(attempt.track)}: ${reason}`);
        console.warn("YouTube transcript track failed", {
          videoId,
          selectedFor: attempt.reason,
          track: describeTrack(attempt.track),
          reason,
          cause,
        });
        return [];
      });
      const textLength = segments.reduce((sum, segment) => sum + segment.text.length, 0);
      if (segments.length && textLength > 0) {
        parsedTracks.push({ attempt, segments, textLength });
        break;
      }
    }

    const best = parsedTracks[0];
    if (!best) {
      console.warn("YouTube transcript extraction found no usable tracks", {
        videoId,
        availableTracks: tracks.map(describeTrack),
        failures,
      });
      const reason = failures.some((f) => f.includes("network timeout"))
        ? "network timeout"
        : failures.length
        ? `transcript API failure: ${failures.join("; ")}`
        : transcriptUnavailableMessage;
      throw new Error(reason);
    }

    console.info("YouTube transcript selected", {
      videoId,
      track: describeTrack(best.attempt.track),
      priority: best.attempt.reason,
      originalLanguage,
      textLength: best.textLength,
    });

    const text = normalizeText(best.segments.map((segment) => segment.text).join(" "));
    if (!text) {
      const reason = transcriptUnavailableMessage;
      console.warn("YouTube transcript content was empty after normalization", { videoId, reason });
      throw new Error(reason);
    }

    return { text, segments: best.segments };
  },
};

export function extractVideoId(url: string) {
  if (/^[\w-]{11}$/.test(url)) return url;
  const match = url.match(youtubeIdPattern);
  if (!match) throw new Error("Unable to read the YouTube video ID.");
  return match[1];
}

export async function fetchCaptionTracks(videoId: string): Promise<{ tracks: CaptionTrack[]; originalLanguage: string | null; playerResponse: PlayerResponse | null }> {
  let webPlayerResponse: PlayerResponse | null = null;
  let webBody = "";
  let webError: unknown = null;

  const androidTracks = await fetchInnerTubeCaptionTracks(videoId, "ANDROID", "20.10.38").catch((cause) => {
    console.warn("YouTube Android caption discovery failed", { videoId, reason: classifyError(cause), cause });
    return [];
  });

  try {
    const res = await fetchWebPlayerResponse(videoId);
    webPlayerResponse = res.playerResponse;
    webBody = res.body;
    validatePlayable(webPlayerResponse);
  } catch (cause) {
    webError = cause;
  }

  const webTracks = webPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.filter((t) => t.baseUrl) ?? [];

  let webClientTracks: CaptionTrack[] = [];
  if (!androidTracks.length && !webTracks.length) {
    webClientTracks = await fetchInnerTubeCaptionTracks(videoId, "WEB", "2.20240308.00.00").catch(() => []);
  }

  let timedTextTracks: CaptionTrack[] = [];
  if (!androidTracks.length && !webTracks.length && !webClientTracks.length) {
    timedTextTracks = await fetchTimedTextCaptionTracks(videoId);
  }

  const allTracks = dedupeTracks([...androidTracks, ...webTracks, ...webClientTracks, ...timedTextTracks]);

  if (!allTracks.length) {
    if (webError) throw webError;
    if (/caption|transcript|subtitle/i.test(webBody) && /disabled|unavailable|turned off/i.test(webBody)) {
      throw new Error("captions disabled");
    }
    throw new Error(transcriptUnavailableMessage);
  }

  const originalLanguage = detectOriginalLanguage(allTracks, webPlayerResponse);
  return { tracks: allTracks, originalLanguage, playerResponse: webPlayerResponse };
}

async function fetchWebPlayerResponse(videoId: string): Promise<{ playerResponse: PlayerResponse; body: string }> {
  const response = await retry(
    () =>
      fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { "Accept-Language": "en-US,en;q=0.9,hi;q=0.8,*;q=0.5", "User-Agent": userAgent },
      }),
    3
  );
  if (!response.ok) throw new Error(`transcript API failure: video page request failed with ${response.status}`);
  const body = await response.text();
  if (body.includes('class="g-recaptcha"')) throw new Error("transcript API failure: YouTube is rate limiting transcript retrieval");
  const playerResponse = parseInlineJson(body, "ytInitialPlayerResponse") ?? parseInlineJson(body, "window[\"ytInitialPlayerResponse\"]");
  if (!playerResponse) throw new Error("transcript API failure: unable to read YouTube player response");
  return { playerResponse: playerResponse as PlayerResponse, body };
}

async function fetchInnerTubeCaptionTracks(videoId: string, clientName: string, clientVersion: string): Promise<CaptionTrack[]> {
  const response = await retry(
    () =>
      fetchWithTimeout("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": androidUserAgent,
          "Accept-Language": "en-US,en;q=0.9,hi;q=0.8,*;q=0.5",
        },
        body: JSON.stringify({
          context: { client: { clientName, clientVersion, hl: "en", gl: "US" } },
          videoId,
        }),
      }),
    2
  );
  if (!response.ok) return [];
  const playerResponse = (await response.json()) as PlayerResponse;
  validatePlayable(playerResponse);
  return playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks?.filter((track) => track.baseUrl) ?? [];
}

async function fetchTimedTextCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  const listUrls = [
    `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&type=list`,
  ];
  for (const listUrl of listUrls) {
    try {
      const response = await fetchWithTimeout(listUrl, {
        headers: { "User-Agent": userAgent, "Accept-Language": "en-US,en;q=0.9,hi;q=0.8,*;q=0.5" },
      });
      if (!response.ok) continue;
      const xml = await response.text();
      if (!xml.includes("<track")) continue;

      const trackMatches = [...xml.matchAll(/<track\s+([^>]*?)\/?>/gi)];
      const tracks: CaptionTrack[] = [];

      for (const match of trackMatches) {
        const attrs = match[1];
        const langCodeMatch = attrs.match(/lang_code="([^"]+)"/i);
        if (!langCodeMatch) continue;
        const langCode = langCodeMatch[1];
        const kindMatch = attrs.match(/kind="([^"]+)"/i);
        const kind = kindMatch ? kindMatch[1] : undefined;
        const nameMatch = attrs.match(/name="([^"]+)"/i);
        const nameVal = nameMatch ? nameMatch[1] : undefined;
        const defaultMatch = attrs.match(/lang_default="true"/i);
        const isDefault = !!defaultMatch;
        const langOriginalMatch = attrs.match(/lang_original="([^"]+)"/i);
        const simpleText = nameVal || (langOriginalMatch ? langOriginalMatch[1] : langCode);

        const baseUrlParams = new URLSearchParams();
        baseUrlParams.set("v", videoId);
        baseUrlParams.set("lang", langCode);
        if (kind) baseUrlParams.set("kind", kind);
        if (nameVal) baseUrlParams.set("name", nameVal);

        tracks.push({
          baseUrl: `https://www.youtube.com/api/timedtext?${baseUrlParams.toString()}`,
          languageCode: langCode,
          kind,
          vssId: kind === "asr" ? `a.${langCode}` : `.${langCode}`,
          isDefault,
          name: { simpleText },
        });
      }

      if (tracks.length) return tracks;
    } catch {
      // continue
    }
  }
  return [];
}

export function dedupeTracks(tracks: CaptionTrack[]) {
  const seen = new Set<string>();
  const results: CaptionTrack[] = [];
  for (const track of tracks) {
    const lang = (track.languageCode || track.vssId?.replace(/^a\./, "").replace(/^\./, "") || "").toLowerCase();
    const kind = isAutoGenerated(track) ? "asr" : "manual";
    const key = `${lang}:${kind}:${track.vssId ?? track.name?.simpleText ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(track);
  }
  return results;
}

export function validatePlayable(playerResponse: PlayerResponse) {
  const status = playerResponse.playabilityStatus?.status?.toLowerCase();
  const reason = playerResponse.playabilityStatus?.reason ?? "";
  const normalizedReason = reason.toLowerCase();

  if (!status || status === "ok") return;
  if (normalizedReason.includes("private") || (status === "login_required" && normalizedReason.includes("private"))) {
    throw new Error("private video");
  }
  if (normalizedReason.includes("age") || normalizedReason.includes("verify your age")) {
    throw new Error("age restricted");
  }
  if (normalizedReason.includes("member")) {
    throw new Error("members only");
  }
  if (normalizedReason.includes("country") || normalizedReason.includes("region") || normalizedReason.includes("location") || normalizedReason.includes("geo")) {
    throw new Error("region blocked");
  }
  if (normalizedReason.includes("disabled") || normalizedReason.includes("turned off")) {
    throw new Error("captions disabled");
  }
  if (normalizedReason.includes("unavailable") || status === "error") {
    throw new Error(transcriptUnavailableMessage);
  }
  throw new Error(`transcript API failure: YouTube returned ${playerResponse.playabilityStatus?.status}${reason ? `: ${reason}` : ""}`);
}

function parseInlineJson(html: string, globalName: string) {
  const tokens = [`var ${globalName} = `, `${globalName} = `];
  const start = tokens.map((token) => ({ token, index: html.indexOf(token) })).find((item) => item.index !== -1);
  if (!start) return null;
  const jsonStart = start.index + start.token.length;
  let depth = 0;
  for (let index = jsonStart; index < html.length; index += 1) {
    if (html[index] === "{") depth += 1;
    if (html[index] === "}") depth -= 1;
    if (depth === 0) return JSON.parse(html.slice(jsonStart, index + 1));
  }
  return null;
}

export function detectOriginalLanguage(tracks: CaptionTrack[], playerResponse?: PlayerResponse | null): string | null {
  const audioLang = playerResponse?.microformat?.playerMicroformatRenderer?.defaultAudioLanguage ||
                    playerResponse?.videoDetails?.defaultAudioLanguage;
  if (audioLang) {
    const norm = normalizeLanguage(audioLang);
    if (norm) return norm;
  }

  const defaultTrack = tracks.find((track) => track.isDefault);
  if (defaultTrack?.languageCode) {
    const norm = normalizeLanguage(defaultTrack.languageCode);
    if (norm) return norm;
  }

  const asrTrack = tracks.find((track) => isAutoGenerated(track));
  if (asrTrack?.languageCode) {
    const norm = normalizeLanguage(asrTrack.languageCode);
    if (norm) return norm;
  }

  const manualNonEnglish = tracks.find((track) => !isAutoGenerated(track) && !isEnglish(track));
  if (manualNonEnglish?.languageCode) {
    const norm = normalizeLanguage(manualNonEnglish.languageCode);
    if (norm) return norm;
  }

  const firstNonEnglish = tracks.find((track) => !isEnglish(track));
  if (firstNonEnglish?.languageCode) {
    const norm = normalizeLanguage(firstNonEnglish.languageCode);
    if (norm) return norm;
  }

  return tracks[0]?.languageCode ? normalizeLanguage(tracks[0].languageCode) : null;
}

export function orderTracks(tracks: CaptionTrack[], originalLanguage: string | null): TrackAttempt[] {
  return tracks
    .map((track) => {
      const language = normalizeLanguage(track.languageCode || track.vssId?.replace(/^a\./, "").replace(/^\./, ""));
      const manual = !isAutoGenerated(track);
      const isEng = isEnglish(track);
      const isOrig = originalLanguage && language === normalizeLanguage(originalLanguage);

      if (isEng && manual) return { track, priority: 500, reason: "manual English captions" };
      if (isEng) return { track, priority: 400, reason: "auto-generated English captions" };
      if (isOrig && manual) return { track, priority: 300, reason: "manual captions in original language" };
      if (isOrig) return { track, priority: 200, reason: "auto-generated captions in original language" };
      return { track, priority: manual ? 100 : 50, reason: "remaining available transcript" };
    })
    .sort((left, right) => right.priority - left.priority);
}

export function normalizeLanguage(languageCode?: string): string | null {
  if (!languageCode) return null;
  const clean = languageCode.trim().toLowerCase();
  return clean.split("-")[0] || null;
}

export function isEnglish(track: CaptionTrack): boolean {
  const lang = (track.languageCode ?? "").toLowerCase();
  const vss = (track.vssId ?? "").toLowerCase();
  return lang.startsWith("en") || vss.endsWith(".en") || vss === "en" || vss.startsWith("a.en");
}

export function isAutoGenerated(track: CaptionTrack): boolean {
  return track.kind === "asr" || track.vssId?.startsWith("a.") === true;
}

export function describeTrack(track: CaptionTrack): string {
  const label = track.name?.simpleText ?? track.name?.runs?.map((run) => run.text).join("") ?? "unnamed";
  return `${track.languageCode ?? "unknown"} ${isAutoGenerated(track) ? "auto" : "manual"} (${label})`;
}

export function detectBodyFormat(body: string, status: number): string {
  if (status === 403) return "403";
  if (status === 404) return "404";
  const trimmed = body.trim();
  if (!trimmed) return "empty body";
  if (/class="g-recaptcha"|consent\.youtube|cookie/i.test(trimmed)) return "consent page";
  if (/^<!DOCTYPE html|<html/i.test(trimmed)) return "HTML";
  if (trimmed.startsWith("WEBVTT") || trimmed.includes("-->")) return "WebVTT";
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || trimmed.includes('"events"')) return "JSON3";
  if (trimmed.includes("<transcript") || trimmed.includes("<timedtext") || trimmed.includes("<text") || trimmed.includes("<p ")) return "transcript XML";
  return "unknown format";
}

export async function fetchTrackSegments(track: CaptionTrack, videoId?: string): Promise<TextSegment[]> {
  console.info("YouTube downloading caption track metadata:", {
    baseUrl: track.baseUrl,
    languageCode: track.languageCode,
    kind: track.kind,
    vssId: track.vssId,
    name: track.name?.simpleText ?? track.name,
    isTranslatable: (track as Record<string, unknown>).isTranslatable ?? false,
  });

  const candidateUrls: Array<{ url: string; fmtLabel: string }> = [];
  const rawUrl = new URL(track.baseUrl);
  candidateUrls.push({ url: rawUrl.toString(), fmtLabel: rawUrl.searchParams.get("fmt") || "as-is" });

  for (const fmt of ["srv3", "json3", "vtt"]) {
    if (rawUrl.searchParams.get("fmt") !== fmt) {
      const u = new URL(track.baseUrl);
      u.searchParams.set("fmt", fmt);
      candidateUrls.push({ url: u.toString(), fmtLabel: fmt });
    }
  }

  let lastError: unknown = null;

  for (const candidate of candidateUrls) {
    try {
      const sanitizedUrl = candidate.url.replace(/&key=[^&]+/g, "&key=[REDACTED]").replace(/&signature=[^&]+/g, "&signature=[REDACTED]");
      console.info(`Requesting caption URL (${candidate.fmtLabel}):`, sanitizedUrl);

      const response = await fetchWithTimeout(candidate.url, {
        headers: {
          "User-Agent": userAgent,
          "Accept-Language": track.languageCode ?? "en",
        },
      });

      const contentType = response.headers.get("content-type") ?? "";
      const headersObj = Object.fromEntries(response.headers.entries());
      const body = await response.text();
      const formatDetected = detectBodyFormat(body, response.status);

      console.info("Caption response received:", {
        httpStatus: `${response.status} ${response.statusText}`,
        contentType,
        headers: headersObj,
        formatDetected,
        first500Chars: body.slice(0, 500),
      });

      if (!response.ok) {
        if (response.status === 403) throw new Error("403");
        if (response.status === 404) throw new Error("404");
        throw new Error(`transcript API failure: caption request failed with status ${response.status}`);
      }

      if (formatDetected === "empty body" || formatDetected === "HTML" || formatDetected === "consent page") {
        continue;
      }

      let segments: TextSegment[] = [];
      if (formatDetected === "JSON3") {
        segments = parseJson3Transcript(body);
      } else if (formatDetected === "WebVTT") {
        segments = parseVttTranscript(body);
      } else if (formatDetected === "transcript XML") {
        segments = parseTranscriptXml(body);
      } else {
        segments = parseTranscriptXml(body);
        if (!segments.length) segments = parseJson3Transcript(body);
        if (!segments.length) segments = parseVttTranscript(body);
      }

      if (segments.length) {
        return segments;
      }
    } catch (cause) {
      lastError = cause;
    }
  }

  const vId = videoId || (track.baseUrl.includes("v=") ? extractVideoId(track.baseUrl) : undefined);
  if (vId) {
    try {
      console.info("Attempting fallback download via YoutubeTranscript helper for videoId:", vId);
      const { YoutubeTranscript } = await import("youtube-transcript");
      const items = await YoutubeTranscript.fetchTranscript(vId, { lang: track.languageCode });
      if (items && items.length > 0) {
        console.info(`YoutubeTranscript fallback succeeded with ${items.length} items.`);
        return items.map((item: { text: string; offset: number; duration: number }) => ({
          text: normalizeText(decodeEntities(item.text)),
          timestampStartMs: Math.round(item.offset),
          timestampEndMs: Math.round(item.offset + item.duration),
        })).filter((s: TextSegment) => s.text);
      }
    } catch (cause) {
      console.warn("YoutubeTranscript fallback failed:", cause);
    }
  }

  throw lastError || new Error(transcriptUnavailableMessage);
}

export function parseTranscriptXml(xml: string): TextSegment[] {
  const pMatches = [...xml.matchAll(/<p\s+([^>]*?)>([\s\S]*?)<\/p>/gi)];
  if (pMatches.length) {
    const srv3Segments: TextSegment[] = [];
    for (const match of pMatches) {
      const attrString = match[1];
      const content = match[2];
      const tMatch = attrString.match(/t="(\d+)"/i);
      if (!tMatch) continue;
      const dMatch = attrString.match(/d="(\d+)"/i);
      const start = Number.parseInt(tMatch[1], 10);
      const duration = dMatch ? Number.parseInt(dMatch[1], 10) : 0;
      const text = normalizeText(decodeEntities(content.replace(/<[^>]+>/g, "")));
      if (text) {
        srv3Segments.push({ text, timestampStartMs: start, timestampEndMs: start + duration });
      }
    }
    if (srv3Segments.length) return srv3Segments;
  }

  const textMatches = [...xml.matchAll(/<text\s+([^>]*?)>([\s\S]*?)<\/text>/gi)];
  if (textMatches.length) {
    const segments: TextSegment[] = [];
    for (const match of textMatches) {
      const attrString = match[1];
      const content = match[2];
      const startMatch = attrString.match(/start="([^"]+)"/i);
      if (!startMatch) continue;
      const durMatch = attrString.match(/dur="([^"]+)"/i);
      const startSec = Number.parseFloat(startMatch[1]);
      const durSec = durMatch ? Number.parseFloat(durMatch[1]) : 0;
      if (Number.isNaN(startSec)) continue;
      const start = Math.round(startSec * 1000);
      const duration = Number.isNaN(durSec) ? 0 : Math.round(durSec * 1000);
      const text = normalizeText(decodeEntities(content.replace(/<[^>]+>/g, "")));
      if (text) {
        segments.push({ text, timestampStartMs: start, timestampEndMs: start + duration });
      }
    }
    if (segments.length) return segments;
  }

  return [];
}

export function parseJson3Transcript(body: string): TextSegment[] {
  if (!body.trim()) return [];
  try {
    const data = JSON.parse(body) as { events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }> };
    return (
      data.events
        ?.map((event) => {
          const rawText = event.segs?.map((segment) => segment.utf8 ?? "").join("") ?? "";
          const text = normalizeText(decodeEntities(rawText.replace(/<[^>]+>/g, "")));
          const start = event.tStartMs ?? 0;
          const duration = event.dDurationMs ?? 0;
          return { text, timestampStartMs: start, timestampEndMs: start + duration };
        })
        .filter((segment) => segment.text) ?? []
    );
  } catch {
    return [];
  }
}

export function parseVttTranscript(body: string): TextSegment[] {
  if (!body.trim()) return [];
  const blocks = body.split(/\n{2,}/).filter((block) => block.includes("-->"));
  return blocks
    .map((block) => {
      const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const timing = lines.find((line) => line.includes("-->"));
      if (!timing) return null;
      const [startValue, endValue] = timing.split("-->").map((part) => part.trim().split(/\s+/)[0]);
      const rawText = lines
        .filter((line) => !line.includes("-->") && !line.startsWith("WEBVTT") && !/^\d+$/.test(line))
        .join(" ");
      const text = normalizeText(decodeEntities(rawText.replace(/<[^>]+>/g, "")));
      return text ? { text, timestampStartMs: parseVttTimestamp(startValue), timestampEndMs: parseVttTimestamp(endValue) } : null;
    })
    .filter(Boolean) as TextSegment[];
}

function parseVttTimestamp(value: string) {
  if (!value) return 0;
  const parts = value.split(":");
  const seconds = Number.parseFloat(parts.pop() ?? "0") || 0;
  const minutes = Number.parseInt(parts.pop() ?? "0", 10) || 0;
  const hours = Number.parseInt(parts.pop() ?? "0", 10) || 0;
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

async function fetchWithTimeout(input: URL | string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw new Error("network timeout");
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}

export function classifyError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  const normalized = message.toLowerCase();

  if (normalized.includes("network timeout") || normalized.includes("aborterror")) {
    return "network timeout";
  }
  if (normalized.includes("private")) {
    return "private video";
  }
  if (normalized.includes("age")) {
    return "age restricted";
  }
  if (normalized.includes("member")) {
    return "members only";
  }
  if (normalized.includes("region") || normalized.includes("country") || normalized.includes("location") || normalized.includes("geo")) {
    return "region blocked";
  }
  if (normalized.includes("disabled") || normalized.includes("turned off")) {
    return "captions disabled";
  }
  if (normalized.includes("no transcript") || normalized.includes("not available") || normalized.includes("no caption")) {
    return transcriptUnavailableMessage;
  }
  if (normalized.startsWith("transcript api failure")) {
    return message;
  }
  return `transcript API failure: ${message}`;
}

async function retry<T>(operation: () => Promise<T>, attempts: number) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (cause) {
      lastError = cause;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
  throw lastError;
}
