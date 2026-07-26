"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Headphones, Loader2, Mic, Settings2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPodcast, type PodcastSettings, type VoiceAssignment, type VoiceName } from "@/app/actions/podcasts";

type Props = {
  notebookId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DURATION_OPTIONS = [
  { value: 3, label: "3 min", description: "Quick overview" },
  { value: 5, label: "5 min", description: "Standard" },
  { value: 10, label: "10 min", description: "Deep dive" },
];

const TONE_OPTIONS = [
  { value: "conversational", label: "Conversational", emoji: "💬" },
  { value: "professor", label: "Professor", emoji: "🎓" },
  { value: "beginner_friendly", label: "Beginner Friendly", emoji: "🌱" },
  { value: "interview_prep", label: "Interview Prep", emoji: "💼" },
  { value: "storytelling", label: "Storytelling", emoji: "📖" },
] as const;

const GENRE_OPTIONS = [
  { value: "educational", label: "Educational" },
  { value: "interview", label: "Interview" },
  { value: "debate", label: "Debate" },
  { value: "news_style", label: "News Style" },
  { value: "casual_conversation", label: "Casual" },
] as const;

const AUDIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

const VOICE_OPTIONS = [
  { value: "Atlas", label: "Atlas", gender: "Male" },
  { value: "Orion", label: "Orion", gender: "Male" },
  { value: "Nova", label: "Nova", gender: "Female" },
  { value: "Luna", label: "Luna", gender: "Female" },
] as const;

const speakerNamesByCount: Record<number, string[]> = {
  1: ["Narrator"],
  2: ["Host", "Guest"],
  3: ["Host", "Expert", "Student"],
};

const defaultVoices: VoiceName[] = ["Atlas", "Nova", "Luna"];
const progressSteps = ["Preparing Sources...", "Writing Script...", "Generating Audio...", "Saving Podcast...", "Ready."];

function getDefaultAssignments(count: number): VoiceAssignment[] {
  return (speakerNamesByCount[count] ?? speakerNamesByCount[1]).map((speaker, index) => ({ speaker, voice: defaultVoices[index] ?? "Orion" }));
}

export function GeneratePodcastDialog({ notebookId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSources, setPreviewSources] = useState<Array<{ sourceId: string; sourceTitle: string; preview: string }>>([]);
  const [previewError, setPreviewError] = useState("");

  const [focus, setFocus] = useState<PodcastSettings["focus"]>("entire_notebook");
  const [tone, setTone] = useState<PodcastSettings["tone"]>("conversational");
  const [genre, setGenre] = useState<PodcastSettings["genre"]>("educational");
  const [targetAudience, setTargetAudience] = useState<PodcastSettings["targetAudience"]>("intermediate");
  const [speakers, setSpeakers] = useState(2);
  const [voiceAssignments, setVoiceAssignments] = useState<VoiceAssignment[]>(getDefaultAssignments(2));
  const activeAssignments = useMemo(() => {
    const defaults = getDefaultAssignments(speakers);
    return defaults.map((assignment) => ({ ...assignment, voice: voiceAssignments.find((item) => item.speaker === assignment.speaker)?.voice ?? assignment.voice }));
  }, [speakers, voiceAssignments]);

  const resetForm = () => {
    setPrompt("");
    setDuration(5);
    setShowAdvanced(false);
    setFocus("entire_notebook");
    setTone("conversational");
    setGenre("educational");
    setTargetAudience("intermediate");
    setSpeakers(2);
    setVoiceAssignments(getDefaultAssignments(2));
    setProgressIndex(0);
    setPreviewSources([]);
    setPreviewError("");
  };

  const handleSpeakerCount = (count: number) => {
    setSpeakers(count);
    setVoiceAssignments((current) => {
      const defaults = getDefaultAssignments(count);
      return defaults.map((assignment) => ({ ...assignment, voice: current.find((item) => item.speaker === assignment.speaker)?.voice ?? assignment.voice }));
    });
  };

  const updateSpeakerVoice = (speaker: string, voice: VoiceName) => {
    setVoiceAssignments((current) => {
      const next = activeAssignments.map((assignment) => assignment.speaker === speaker ? { ...assignment, voice } : assignment);
      return next.length ? next : current;
    });
  };

  const handlePreview = async () => {
    if (!prompt.trim()) {
      toast.error("Enter a podcast topic first.");
      return;
    }
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const response = await fetch("/api/podcasts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId, prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to preview sources.");
      setPreviewSources(data.sources ?? []);
    } catch (error) {
      setPreviewSources([]);
      setPreviewError(error instanceof Error ? error.message : "Unable to preview sources.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt for your podcast.");
      return;
    }

    setLoading(true);
    setProgressIndex(0);
    const loadingToastId = toast.loading("Creating your podcast...");

    try {
      await handlePreview();
      setProgressIndex(1);
      const settings: PodcastSettings = { focus, tone, genre, targetAudience };
      const podcastId = await createPodcast({
        notebookId,
        title: prompt.slice(0, 60),
        prompt,
        settings,
        duration,
        voiceAssignments: activeAssignments,
        speakers,
      });

      setProgressIndex(2);
      // Trigger generation in background
      const response = await fetch("/api/podcasts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebookId,
          podcastId,
          prompt,
          duration,
          voiceAssignments: activeAssignments,
          speakers,
          settings,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Generation failed");

      setProgressIndex(3);
      await new Promise((resolve) => setTimeout(resolve, 150));
      setProgressIndex(4);
      toast.success("Podcast generated!", { id: loadingToastId });
      onOpenChange(false);
      resetForm();
      router.push(`/dashboard/podcasts/${podcastId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate podcast. Please try again.", { id: loadingToastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) resetForm(); } }}>
      <DialogContent className="border-white/[.12] bg-zinc-950 p-0 text-white sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 font-heading text-lg tracking-tight">
            <div className="grid size-8 place-items-center rounded-lg bg-violet-500/20">
              <Headphones className="size-4 text-violet-300" />
            </div>
            Generate Podcast
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Create an AI-powered podcast episode from your notebook content.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">What should this podcast cover?</label>
            <Textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setPreviewSources([]); setPreviewError(""); }}
              placeholder="e.g., Explain Operating Systems like a podcast, Create a podcast for DSA interview revision..."
              className="min-h-[80px] resize-none border-white/[.12] bg-white/[.045] text-white placeholder:text-zinc-600 focus-visible:border-violet-400"
              disabled={loading}
            />
          </div>

          {/* Podcast Preview */}
          <div className="mt-5 rounded-xl border border-white/[.08] bg-white/[.025] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Podcast Preview</p>
                <p className="mt-1 text-sm font-medium text-white line-clamp-2">{prompt || "Choose a topic to preview sources"}</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={handlePreview} disabled={loading || previewLoading || !prompt.trim()} className="text-xs text-zinc-300">
                {previewLoading ? "Preparing..." : "Preview"}
              </Button>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
              <span>Estimated Length: <strong className="text-zinc-200">{duration} min</strong></span>
              <span>Speakers: <strong className="text-zinc-200">{speakers}</strong></span>
              <span>Tone: <strong className="text-zinc-200">{tone.replace(/_/g, " ")}</strong></span>
              <span>Genre: <strong className="text-zinc-200">{genre.replace(/_/g, " ")}</strong></span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeAssignments.map((assignment) => (
                <span key={assignment.speaker} className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[11px] text-violet-100">
                  {assignment.speaker}: {assignment.voice}
                </span>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Notebook Sources Selected</p>
              {previewError && <p className="text-xs text-rose-300">{previewError}</p>}
              {!previewError && previewSources.length === 0 && <p className="text-xs text-zinc-600">{previewLoading ? "Preparing sources..." : "Run preview to see retrieved sources."}</p>}
              {previewSources.slice(0, 4).map((source) => (
                <div key={`${source.sourceId}-${source.preview}`} className="rounded-lg border border-white/[.06] bg-black/20 px-3 py-2">
                  <p className="text-xs font-medium text-zinc-200">{source.sourceTitle}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">{source.preview}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="mt-5 space-y-2">
            <label className="text-xs font-medium text-zinc-300">Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={loading}
                  onClick={() => setDuration(opt.value)}
                  className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-3 py-2.5 text-center transition-all ${
                    duration === opt.value
                      ? "border-violet-400/50 bg-violet-500/15 text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                      : "border-white/[.08] bg-white/[.03] text-zinc-400 hover:border-white/[.15] hover:text-zinc-200"
                  }`}
                >
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="text-[10px] text-zinc-500">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-5 flex w-full cursor-pointer items-center gap-2 rounded-lg border border-white/[.06] bg-white/[.02] px-3 py-2.5 text-xs font-medium text-zinc-400 transition-colors hover:border-white/[.12] hover:text-zinc-200"
          >
            <Settings2 className="size-3.5" />
            Advanced Options
            <ChevronDown className={`ml-auto size-3.5 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
          </button>

          {/* Advanced Options Panel */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-4 rounded-xl border border-white/[.06] bg-white/[.015] p-4">
                  {/* Focus */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Focus</label>
                    <Select value={focus} onValueChange={(v) => setFocus(v as PodcastSettings["focus"])} disabled={loading}>
                      <SelectTrigger className="border-white/[.12] bg-white/[.045] text-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-zinc-950 text-white">
                        <SelectItem value="entire_notebook">Entire Notebook</SelectItem>
                        <SelectItem value="current_roadmap">Current Roadmap</SelectItem>
                        <SelectItem value="learning_focus">Current Learning Focus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Tone</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TONE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={loading}
                          onClick={() => setTone(opt.value)}
                          className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                            tone === opt.value
                              ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                              : "border-white/[.08] text-zinc-500 hover:border-white/[.15] hover:text-zinc-300"
                          }`}
                        >
                          {opt.emoji} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Genre */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Genre</label>
                    <Select value={genre} onValueChange={(v) => setGenre(v as PodcastSettings["genre"])} disabled={loading}>
                      <SelectTrigger className="border-white/[.12] bg-white/[.045] text-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-zinc-950 text-white">
                        {GENRE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Target Audience</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {AUDIENCE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={loading}
                          onClick={() => setTargetAudience(opt.value)}
                          className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                            targetAudience === opt.value
                              ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                              : "border-white/[.08] text-zinc-500 hover:border-white/[.15] hover:text-zinc-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Speakers */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                      <Users className="size-3" /> Speakers
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled={loading}
                          onClick={() => handleSpeakerCount(n)}
                          className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                            speakers === n
                              ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                              : "border-white/[.08] text-zinc-500 hover:border-white/[.15] hover:text-zinc-300"
                          }`}
                        >
                          {n} {n === 1 ? "Speaker" : "Speakers"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voices */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                      <Mic className="size-3" /> Voice Assignments
                    </label>
                    {activeAssignments.map((assignment, index) => (
                      <div key={assignment.speaker} className="rounded-lg border border-white/[.06] bg-black/20 p-3">
                        <p className="mb-2 text-xs font-medium text-zinc-300">Speaker {index + 1}: {assignment.speaker}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {VOICE_OPTIONS.map((opt) => (
                            <button
                              key={`${assignment.speaker}-${opt.value}`}
                              type="button"
                              disabled={loading}
                              onClick={() => updateSpeakerVoice(assignment.speaker, opt.value)}
                              className={`cursor-pointer rounded-lg border px-2.5 py-2 text-left transition-all ${
                                assignment.voice === opt.value
                                  ? "border-violet-400/40 bg-violet-500/15"
                                  : "border-white/[.08] hover:border-white/[.15]"
                              }`}
                            >
                              <span className={`text-[11px] font-medium ${assignment.voice === opt.value ? "text-violet-200" : "text-zinc-300"}`}>{opt.label}</span>
                              <span className="block text-[10px] text-zinc-600">{opt.gender}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="-mx-0 rounded-b-2xl border-t border-white/[.08] bg-zinc-950 px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => { onOpenChange(false); resetForm(); }}
            disabled={loading}
            className="text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:bg-violet-400"
          >
            {loading ? (
              <><Loader2 className="size-4 animate-spin" /> {progressSteps[progressIndex]}</>
            ) : (
              <><Sparkles className="size-4" /> Generate Podcast</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
