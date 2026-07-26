"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Calendar, Clock, Copy, Download, FileText, Headphones, Loader2, Mic, RefreshCw, Settings2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SerializedPodcast } from "@/app/actions/podcasts";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/formatters";

const toneLabels: Record<string, string> = {
  conversational: "Conversational",
  professor: "Professor",
  beginner_friendly: "Beginner Friendly",
  interview_prep: "Interview Prep",
  storytelling: "Storytelling",
};

const genreLabels: Record<string, string> = {
  educational: "Educational",
  interview: "Interview",
  debate: "Debate",
  news_style: "News Style",
  casual_conversation: "Casual Conversation",
};

const audienceLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const waveformBars = Array.from({ length: 44 }, (_, index) => {
  const value = Math.sin(index * 0.9) * 18 + Math.cos(index * 0.37) * 12 + 42;
  return Math.max(18, Math.min(74, Math.round(value)));
});

function parseTranscriptLine(line: string) {
  const trimmed = line.trim();
  const timestampMatch = trimmed.match(/^(\[?\d{1,2}:\d{2}(?::\d{2})?\]?)/);
  const timestamp = timestampMatch?.[1]?.replace(/^\[|\]$/g, "");
  const withoutTimestamp = timestampMatch ? trimmed.slice(timestampMatch[0].length).trim() : trimmed;
  const speakerMatch = withoutTimestamp.match(/^([A-Za-z][A-Za-z ]{0,30}:)/);
  const speaker = speakerMatch?.[1]?.replace(":", "");
  const text = speakerMatch ? withoutTimestamp.slice(speakerMatch[0].length).trim() : withoutTimestamp;
  return { timestamp, speaker, text };
}

export function PodcastWorkspace({ podcast }: { podcast: SerializedPodcast }) {
  const router = useRouter();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isGenerating = podcast.status === "GENERATING";
  const isFailed = podcast.status === "FAILED";
  const isReady = podcast.status === "READY";
  const settings = podcast.settings;
  const generationStage = podcast.generationStage || (isReady ? "Ready" : isFailed ? "Failed" : "Preparing Sources");
  const safeTitle = podcast.title.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "podcast";
  const createdDate = formatDateTime(podcast.createdAt);
  const genreLabel = genreLabels[settings.genre] ?? settings.genre;
  const toneLabel = toneLabels[settings.tone] ?? settings.tone;
  const voiceSummary = podcast.voiceAssignments.length
    ? podcast.voiceAssignments.map((assignment) => `${assignment.speaker}: ${assignment.voice}`).join(", ")
    : podcast.voice;
  const voiceAssignments = podcast.voiceAssignments.length
    ? podcast.voiceAssignments
    : [{ speaker: "Narrator", voice: podcast.voice }];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setAudioError(null);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
    };
    const handleError = () => {
      const err = audio.error;
      const code = err?.code ?? 0;
      const messages: Record<number, string> = {
        1: "Audio loading was aborted.",
        2: "A network error prevented audio from loading.",
        3: "Audio could not be decoded. The file may be corrupt.",
        4: "Audio format is not supported by this browser.",
      };
      setAudioError(messages[code] ?? `Audio failed to load (code ${code}).`);
      setIsPlaying(false);
    };
    const handleCanPlay = () => {
      setAudioError(null);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("loadedmetadata", handleCanPlay);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("loadedmetadata", handleCanPlay);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [podcast.audioUrl]);

  const handleCopyTranscript = () => {
    if (!podcast.transcript) return;
    navigator.clipboard.writeText(podcast.transcript);
    toast.success("Transcript copied to clipboard");
  };

  const handleDownloadTranscript = () => {
    if (!podcast.transcript) return;
    const blob = new Blob([podcast.transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transcript downloaded");
  };

  const handleDownloadAudio = () => {
    if (!podcast.audioUrl) return;
    const a = document.createElement("a");
    a.href = podcast.audioUrl;
    a.download = `${safeTitle}.mp3`;
    a.click();
    toast.success("Audio download started");
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    const loadingToastId = toast.loading("Regenerating podcast...");
    try {
      const response = await fetch("/api/podcasts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebookId: podcast.notebookId,
          podcastId: podcast.id,
          prompt: podcast.prompt,
          duration: podcast.duration,
          voiceAssignments,
          speakers: podcast.speakers,
          settings: podcast.settings,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Regeneration failed");
      toast.success("Podcast regenerated!", { id: loadingToastId });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate podcast.", { id: loadingToastId });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <main className="min-h-svh bg-black text-white">
      <header className="border-b border-white/[.06] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard/podcasts">
              <Button variant="ghost" size="icon" className="size-8 text-zinc-400 transition hover:bg-white/[.04] hover:text-white active:scale-95">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Podcast</p>
              <h1 className="line-clamp-1 text-sm font-medium text-zinc-200">{podcast.title}</h1>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={isRegenerating || isGenerating} className="text-xs text-zinc-400 transition hover:bg-violet-400/10 hover:text-white active:scale-95">
            <RefreshCw className={`size-3.5 ${isRegenerating ? "animate-spin" : ""}`} /> Regenerate
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="space-y-8">
          {isGenerating && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[.05] px-4 py-3 text-sm text-amber-100 shadow-[0_18px_50px_rgba(251,191,36,0.05)]">
              <Loader2 className="size-4 animate-spin text-amber-300" />
              {generationStage}. This may take a minute...
            </div>
          )}
          {isFailed && (
            <div className="rounded-xl border border-rose-400/15 bg-rose-400/[.05] px-4 py-3 text-sm text-rose-100">
              Podcast generation failed. Try regenerating with a different prompt.
              {podcast.generationError && <p className="mt-1 text-xs text-rose-200/80">{podcast.generationError}</p>}
            </div>
          )}

          <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="rounded-2xl border border-violet-500/20 bg-zinc-900/40 p-5 shadow-[0_24px_90px_rgba(124,58,237,0.10)] backdrop-blur-xl sm:p-6">
                <div className="grid gap-6 md:grid-cols-[184px_1fr]">
                  <div className="relative aspect-square overflow-hidden rounded-2xl border border-violet-400/20 bg-zinc-950 shadow-[0_24px_70px_rgba(139,92,246,0.16)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(168,85,247,0.42),transparent_34%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.20),transparent_30%),linear-gradient(145deg,rgba(24,24,27,0.2),rgba(9,9,11,1))]" />
                    <div className="absolute inset-x-8 top-10 h-20 rounded-full bg-violet-400/20 blur-2xl" />
                    <div className="relative grid h-full place-items-center">
                      <div className="grid size-20 place-items-center rounded-2xl border border-white/10 bg-white/[.04] shadow-[0_0_42px_rgba(168,85,247,0.25)]">
                        <Headphones className="size-9 text-violet-200" />
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col justify-center">
                    <div className="mb-4 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${isReady ? "bg-emerald-400/10 text-emerald-200" : isFailed ? "bg-rose-400/10 text-rose-200" : "bg-amber-400/10 text-amber-200"}`}>
                        {generationStage}
                      </span>
                      <span className="text-xs text-zinc-600">From {podcast.notebookTitle}</span>
                    </div>
                    <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">{podcast.title}</h2>
                    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-400">
                      <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5 text-violet-300" /> {podcast.duration} min</span>
                      <span className="text-zinc-700">•</span>
                      <span className="inline-flex items-center gap-1.5"><Users className="size-3.5 text-violet-300" /> {podcast.speakers} {podcast.speakers === 1 ? "speaker" : "speakers"}</span>
                      <span className="text-zinc-700">•</span>
                      <span>{genreLabel}</span>
                      <span className="text-zinc-700">•</span>
                      <span>{toneLabel}</span>
                      <span className="text-zinc-700">•</span>
                      <span className="inline-flex items-center gap-1.5"><Calendar className="size-3.5 text-violet-300" /> {createdDate}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="rounded-2xl border border-violet-500/20 bg-zinc-900/40 p-5 shadow-[0_24px_90px_rgba(124,58,237,0.08)] backdrop-blur-xl sm:p-6">
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300/80">Now Playing</p>
                      <p className="mt-1 line-clamp-1 text-sm text-zinc-400">{voiceSummary}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleDownloadAudio} disabled={!podcast.audioUrl} className="shrink-0 text-xs text-zinc-400 transition hover:bg-violet-400/10 hover:text-white active:scale-95">
                      <Download className="size-3.5" /> Audio
                    </Button>
                  </div>

                  <div className="rounded-xl border border-white/[.06] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <div className="mb-4 flex h-14 items-center gap-1 overflow-hidden rounded-lg bg-black/20 px-3 shadow-[0_0_34px_rgba(139,92,246,0.10)]">
                      {waveformBars.map((height, index) => (
                        <span
                          key={index}
                          className={`flex-1 rounded-full bg-gradient-to-t from-violet-600/30 via-violet-300/50 to-white/60 shadow-[0_0_14px_rgba(168,85,247,0.22)] transition-all duration-500 ease-out ${isPlaying ? "opacity-80" : "opacity-35"}`}
                          style={{ height: `${isPlaying ? Math.min(90, height + (index % 5) * 4) : height}%` }}
                        />
                      ))}
                    </div>
                    {audioError && (
                      <div className="mb-3 rounded-lg border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-xs leading-5 text-rose-200">{audioError}</div>
                    )}
                    {podcast.audioUrl ? (
                      <audio ref={audioRef} controls src={podcast.audioUrl} className="w-full accent-violet-400" />
                    ) : (
                      <p className="py-4 text-center text-sm text-zinc-500">{generationStage}...</p>
                    )}
                  </div>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="rounded-2xl border border-violet-500/20 bg-zinc-900/40 p-5 shadow-[0_24px_90px_rgba(124,58,237,0.07)] sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <BookOpen className="size-4 text-violet-300" /> Transcript
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCopyTranscript} disabled={!podcast.transcript} className="w-fit text-xs text-zinc-400 transition hover:bg-violet-400/10 hover:text-white active:scale-95">
                      <Copy className="size-3.5" /> Copy Transcript
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDownloadTranscript} disabled={!podcast.transcript} className="w-fit text-xs text-zinc-400 transition hover:bg-violet-400/10 hover:text-white active:scale-95">
                      <Download className="size-3.5" /> Transcript
                    </Button>
                  </div>
                </div>
                <Separator className="my-5 bg-white/[.06]" />
                {podcast.transcript ? (
                  <div className="space-y-4 text-sm leading-7 text-zinc-300">
                    {podcast.transcript.split("\n").map((line, i) => {
                      const { timestamp, speaker, text } = parseTranscriptLine(line);
                      if (!text) return null;
                      return (
                        <p key={i} className="flex flex-col gap-2 rounded-xl py-1 transition sm:flex-row sm:items-start sm:gap-3">
                          <span className="flex shrink-0 flex-wrap items-center gap-2">
                            {timestamp && <span className="rounded-full bg-white/[.05] px-2 py-0.5 text-[11px] tabular-nums text-zinc-500">{timestamp}</span>}
                            {speaker && <span className="rounded-full bg-violet-400/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-200">{speaker}</span>}
                          </span>
                          <span className="text-zinc-300">{text}</span>
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">{isGenerating ? "Transcript will appear here once generation completes..." : "No transcript available."}</p>
                )}
              </motion.div>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="rounded-2xl border border-violet-500/20 bg-zinc-950 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.25)]">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  <Settings2 className="size-3.5 text-violet-300" /> Podcast Settings
                </h3>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-zinc-500">Duration</span><span className="text-zinc-200">{podcast.duration} minutes</span></div>
                  <div className="flex justify-between gap-4"><span className="text-zinc-500">Speakers</span><span className="text-zinc-200">{podcast.speakers}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-zinc-500">Genre</span><span className="text-zinc-200">{genreLabel}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-zinc-500">Tone</span><span className="text-zinc-200">{toneLabel}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-zinc-500">Audience</span><span className="text-zinc-200">{audienceLabels[settings.targetAudience] ?? settings.targetAudience}</span></div>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="rounded-2xl border border-violet-500/20 bg-zinc-950 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.25)]">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  <Mic className="size-3.5 text-violet-300" /> Voice Assignments
                </h3>
                <div className="mt-4 space-y-2">
                  {voiceAssignments.map((assignment) => (
                    <div key={assignment.speaker} className="flex items-center justify-between gap-3 rounded-xl bg-white/[.03] px-3 py-2 text-sm transition hover:bg-violet-400/[.06]">
                      <span className="text-zinc-500">{assignment.speaker}</span>
                      <span className="font-medium text-zinc-200">{assignment.voice}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {podcast.sources && podcast.sources.length > 0 && (
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="rounded-2xl border border-violet-500/20 bg-zinc-950 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.25)]">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    <FileText className="size-3.5 text-violet-300" /> Source Files Used
                  </h3>
                  <div className="mt-4 space-y-2">
                    {podcast.sources.map((source, i) => (
                      <div key={`${source.sourceId}-${i}`} className="rounded-xl bg-white/[.03] px-3 py-2 transition hover:bg-violet-400/[.06]">
                        <p className="line-clamp-1 text-sm font-medium text-zinc-200">{source.sourceTitle}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{source.preview}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </aside>
          </section>
        </motion.div>
      </div>
    </main>
  );
}
