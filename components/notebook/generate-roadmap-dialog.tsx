"use client";

import { useState } from "react";
import { Compass, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type RoadmapPreviewData = {
  primarySkill: string;
  excludedTopics: string[];
  goal: string;
  timeline: string;
  dailyTime: string;
  usedSources: { id: string; title: string }[];
  ignoredSources: { id: string; title: string }[];
  insufficientContent: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreview: (prompt: string) => Promise<RoadmapPreviewData>;
  onSubmit: (data: RoadmapPreviewData) => void;
};

export function GenerateRoadmapDialog({ open, onOpenChange, onPreview, onSubmit }: Props) {
  const [prompt, setPrompt] = useState("");
  const [previewData, setPreviewData] = useState<RoadmapPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const data = await onPreview(prompt);
      setPreviewData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (previewData) {
      onSubmit(previewData);
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    setPreviewData(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[.12] bg-zinc-950 p-6 text-white sm:max-w-lg">
        {!previewData ? (
          <form onSubmit={handlePreview} className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl border border-violet-400/30 bg-violet-400/10 text-violet-300 shadow-[0_0_20px_rgba(167,139,250,0.2)]">
                  <Compass className="size-5" />
                </span>
                <div>
                  <DialogTitle className="font-heading text-lg font-semibold text-white">Generate Personal Roadmap</DialogTitle>
                  <DialogDescription className="text-xs text-zinc-400">
                    Tell me what you want to learn. E.g. &quot;Teach me JavaScript only&quot; or &quot;I want interview prep for DSA in 2 weeks&quot;.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-2">
              <Textarea
                placeholder="What do you want to learn?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] resize-none border-white/[.12] bg-white/[.04] text-sm text-white placeholder:text-zinc-500"
                autoFocus
              />
            </div>

            <DialogFooter className="-mx-6 -mb-6 rounded-b-2xl border-t border-white/[.08] bg-zinc-950 p-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-zinc-300 hover:bg-white/[.08] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                className="bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-violet-400 disabled:opacity-50"
              >
                {isLoading ? <span className="animate-spin mr-2">⏳</span> : <Sparkles className="mr-2 size-4" />}
                {isLoading ? "Analyzing..." : "Preview Focus"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                  <CheckCircle2 className="size-5" />
                </span>
                <div>
                  <DialogTitle className="font-heading text-lg font-semibold text-white">Learning Focus Preview</DialogTitle>
                  <DialogDescription className="text-xs text-zinc-400">
                    Here is what we extracted from your request.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-sm bg-white/[.03] border border-white/[.08] rounded-xl p-4">
              {previewData.insufficientContent ? (
                <div className="text-rose-400 flex flex-col gap-2">
                  <p className="font-semibold flex items-center gap-2">
                    <XCircle className="size-4" /> Insufficient Content
                  </p>
                  <p className="text-xs text-zinc-300">
                    We couldn&apos;t find enough material in your notebook for <strong>{previewData.primarySkill}</strong>. Please try another topic or upload more sources.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 font-semibold text-emerald-300">
                    <CheckCircle2 className="size-4" /> {previewData.primarySkill}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-zinc-400 mb-1">Goal:</p>
                      <p className="text-zinc-200 text-xs">{previewData.goal}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-400 mb-1">Timeline:</p>
                      <p className="text-zinc-200 text-xs">{previewData.timeline} ({previewData.dailyTime}/day)</p>
                    </div>
                  </div>

                  {previewData.usedSources.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-400 mb-1">Using:</p>
                      <ul className="text-xs text-zinc-300 space-y-1">
                        {previewData.usedSources.map(s => (
                          <li key={s.id} className="flex items-center gap-1.5">
                            <span className="size-1 rounded-full bg-emerald-400" /> {s.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(previewData.ignoredSources.length > 0 || previewData.excludedTopics.length > 0) && (
                    <div className="pt-2 border-t border-white/[.08]">
                      <p className="text-xs font-semibold text-zinc-400 mb-1">Ignored:</p>
                      <ul className="text-xs text-zinc-500 space-y-1">
                        {previewData.excludedTopics.map((t, idx) => (
                          <li key={`topic-${idx}`} className="flex items-center gap-1.5">
                            <span className="size-1 rounded-full bg-zinc-600" /> {t}
                          </li>
                        ))}
                        {previewData.ignoredSources.map(s => (
                          <li key={s.id} className="flex items-center gap-1.5">
                            <span className="size-1 rounded-full bg-zinc-600" /> {s.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="-mx-6 -mb-6 rounded-b-2xl border-t border-white/[.08] bg-zinc-950 p-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                className="text-zinc-300 hover:bg-white/[.08] hover:text-white"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={previewData.insufficientContent}
                className="bg-emerald-600 text-white shadow-[0_0_20px_rgba(5,150,105,0.3)] hover:bg-emerald-500 disabled:opacity-50"
              >
                <Compass className="mr-2 size-4" />
                Generate Roadmap
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
