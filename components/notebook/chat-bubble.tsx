"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Compass, Copy, Download, RotateCcw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMediaTimestamp } from "@/lib/formatters";
import { MarkdownContent } from "./markdown-content";
import type { ChatCitation, ChatMessage } from "./notebook-workspace-data";

type Props = {
  message: ChatMessage;
  expandedCitations: Record<string, boolean>;
  onToggleCitation?: (citation: ChatCitation) => void;
  onCitationHover?: (citation: ChatCitation) => void;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onExportMarkdown?: () => void;
};

function CompactRoadmapMessage({ content }: { content: string }) {
  let targetUrl = "";
  const linkMatch = content.match(/\[ROADMAP_LINK:([^:]+):([^\]]+)\]/);
  if (linkMatch) {
    targetUrl = `/dashboard/notebooks/${linkMatch[1]}/roadmap/${linkMatch[2]}`;
  } else {
    const mdLinkMatch = content.match(/\/dashboard\/notebooks\/[^\/]+\/roadmap\/[^\s\)]+/);
    if (mdLinkMatch) {
      targetUrl = mdLinkMatch[0];
    }
  }

  const innerContent = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm">
          <span className="grid size-7 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="size-4" />
          </span>
          <span>Roadmap created successfully.</span>
        </div>
        {targetUrl && (
          <span className="text-xs font-medium text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            Click to open <ArrowRight className="size-3.5" />
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-zinc-400 leading-5">
        Your study plan with collapsible phases, lightweight task checklist, and day-by-day planner is ready in its dedicated workspace.
      </p>

      {targetUrl && (
        <div className="mt-3">
          <Button
            type="button"
            className="bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] group-hover:bg-violet-400 text-xs font-semibold gap-2"
          >
            <Compass className="size-4" />
            Open Roadmap
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      )}
    </>
  );

  if (targetUrl) {
    return (
      <Link
        href={targetUrl}
        className="group block rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-zinc-950 p-4 transition-all duration-300 hover:border-emerald-500/40 hover:bg-emerald-950/30 hover:shadow-[0_4px_24px_rgba(16,185,129,0.12)] cursor-pointer"
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-zinc-950 p-4">
      {innerContent}
    </div>
  );
}

function openCitation(citation: ChatCitation) {
  if (citation.sourceType === "WEBSITE" && citation.sourceUrl) {
    const fragment = citation.preview.trim().slice(0, 120);
    window.open(`${citation.sourceUrl}${citation.sourceUrl.includes("#") ? "&" : "#"}:~:text=${encodeURIComponent(fragment)}`, "_blank", "noopener,noreferrer");
    return;
  }
  if (citation.sourceType === "YOUTUBE" && citation.sourceUrl) {
    const seconds = Math.floor((citation.timestampStartMs ?? 0) / 1000);
    window.open(`${citation.sourceUrl}${citation.sourceUrl.includes("?") ? "&" : "?"}t=${seconds}s`, "_blank", "noopener,noreferrer");
    return;
  }
  window.open(`/api/sources/${citation.sourceId}/open${citation.pageNumber ? `#page=${citation.pageNumber}` : ""}`, "_blank", "noopener,noreferrer");
}

function getCitationActionLabel(citation: ChatCitation) {
  if (citation.sourceType === "YOUTUBE") {
    const timestamp = formatMediaTimestamp(citation.timestampStartMs);
    return timestamp ? `Watch from ${timestamp}` : "Open Video";
  }
  return "Open Source";
}

export function ChatBubble({ message, expandedCitations, onToggleCitation, onCitationHover, onCopy, onRegenerate, onExportMarkdown }: Props) {
  const isUser = message.role === "user";
  const isSummary = !isUser && (message.content.includes("# Notebook Summary") || message.content.startsWith("# Notebook Summary"));
  const isRoadmap =
    !isUser &&
    (message.content.includes("# Learning Roadmap") ||
      message.content.startsWith("# Learning Roadmap") ||
      (message.content.includes('"title"') && (message.content.includes('"phases"') || message.content.includes('"dailyPlanner"'))) ||
      /```json\s*\{[\s\S]*"(phases|dailyPlanner|learningStyle)"/i.test(message.content) ||
      /\{\s*"title":\s*"[^"]*Roadmap"/i.test(message.content));

  const summarySourcesMap = new Map<string, ChatCitation[]>();
  if (isSummary && message.citations) {
    for (const citation of message.citations) {
      const key = citation.sourceId || citation.sourceTitle;
      const list = summarySourcesMap.get(key) ?? [];
      list.push(citation);
      summarySourcesMap.set(key, list);
    }
  }

  const handleExport = () => {
    if (onExportMarkdown) {
      onExportMarkdown();
      return;
    }
    try {
      const blob = new Blob([message.content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${isRoadmap ? "learning-roadmap" : isSummary ? "notebook-summary" : "response"}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported Markdown file");
    } catch {
      toast.error("Unable to export file");
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={isUser ? "ml-auto max-w-[85%] sm:max-w-[72%]" : "max-w-3xl"}
    >
      {!isUser && <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-violet-300">Lumina</p>}
      <div
        className={
          isUser
            ? "rounded-2xl rounded-br-md bg-violet-500 px-4.5 py-3.5 text-sm leading-6 text-white shadow-[0_10px_28px_rgba(109,40,217,.25)]"
            : "rounded-2xl rounded-tl-md border border-violet-500/15 bg-gradient-to-b from-violet-950/20 via-zinc-900/40 to-zinc-950/80 px-4.5 py-4 text-sm leading-6 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm"
        }
      >
        {isUser ? (
          message.content
        ) : isRoadmap ? (
          <CompactRoadmapMessage content={message.content} />
        ) : (
          <MarkdownContent content={message.content} />
        )}

        {isSummary && summarySourcesMap.size > 0 && (
          <div className="mt-4 border-t border-white/[.08] pt-3 text-xs">
            <p className="mb-2 font-semibold text-violet-300">Sources Used</p>
            <div className="flex flex-col gap-2">
              {Array.from(summarySourcesMap.entries()).map(([sourceId, sourceCitations]) => {
                const first = sourceCitations[0];
                const icon = first.sourceType === "YOUTUBE" ? "📺" : first.sourceType === "WEBSITE" ? "🌐" : "📄";

                if (first.sourceType === "YOUTUBE") {
                  const nonZeroTimestamps = Array.from(
                    new Set(
                      sourceCitations
                        .map((c) => c.timestampStartMs)
                        .filter((t): t is number => typeof t === "number" && t >= 1000)
                    )
                  ).sort((a, b) => a - b);

                  const timestampChunks = nonZeroTimestamps.length > 0
                    ? nonZeroTimestamps.map((ts) => sourceCitations.find((c) => c.timestampStartMs === ts) ?? first)
                    : [first];

                  return (
                    <div key={sourceId} className="flex flex-wrap items-center gap-1.5 font-medium text-zinc-300">
                      <button
                        type="button"
                        onClick={() => openCitation(first)}
                        className="cursor-pointer text-left transition-colors hover:text-white hover:underline"
                      >
                        <span>{icon} {first.sourceTitle}</span>
                      </button>
                      <span className="text-zinc-500">—</span>
                      {timestampChunks.map((chunk, idx) => {
                        const formatted = formatMediaTimestamp(chunk.timestampStartMs);
                        return (
                          <span key={chunk.chunkId || idx} className="inline-flex items-center gap-1.5">
                            {idx > 0 && <span className="text-zinc-500">•</span>}
                            <button
                              type="button"
                              onClick={() => openCitation(chunk)}
                              className="cursor-pointer font-medium text-violet-300 transition-colors hover:text-violet-100 hover:underline"
                            >
                              {formatted || "Open Video"}
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  );
                }

                const pageNumbers = Array.from(
                  new Set(sourceCitations.map((c) => c.pageNumber).filter((p): p is number => typeof p === "number"))
                ).sort((a, b) => a - b);
                const pageSuffix = pageNumbers.length > 0 ? ` — Page ${pageNumbers.join(", ")}` : "";

                return (
                  <button
                    key={sourceId}
                    type="button"
                    onClick={() => openCitation(first)}
                    className="flex w-fit cursor-pointer items-center gap-2 text-left font-medium text-zinc-300 transition-colors hover:text-white hover:underline"
                  >
                    <span>{icon}</span>
                    <span>{first.sourceTitle}{pageSuffix}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {message.streaming && (
          <span
            className="ml-1.5 inline-block h-4 w-1 animate-pulse rounded-full bg-violet-400 align-[-2px] shadow-[0_0_8px_rgba(167,139,250,0.8)]"
            aria-label="Response streaming"
          />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>{formatDateTime(message.createdAt)}</span>
        {!isUser && !isSummary && !isRoadmap && message.citations?.map((citation) => {
          const expanded = Boolean(expandedCitations[citation.chunkId]);
          const timestamp = formatMediaTimestamp(citation.timestampStartMs);
          return (
            <div key={citation.chunkId} onMouseEnter={() => onCitationHover?.(citation)} className="group/citation relative w-auto">
              <button
                type="button"
                onClick={() => openCitation(citation)}
                className="cursor-pointer rounded-full border border-violet-300/15 bg-violet-400/[.08] px-2.5 py-1 text-violet-200 transition-colors hover:bg-violet-400/[.16]"
              >
                {citation.sourceTitle}{timestamp ? ` • ${timestamp}` : ""}
              </button>
              <div className="absolute bottom-full left-0 z-20 mb-2 hidden w-72 rounded-xl border border-violet-300/20 bg-zinc-950 p-3 text-left shadow-2xl group-hover/citation:block">
                <p className="font-medium text-zinc-100">{citation.sourceTitle}</p>
                <p className="mt-1 line-clamp-3 leading-5 text-zinc-400">{citation.preview}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{citation.pageNumber ? `Page ${citation.pageNumber}` : timestamp ? `Timestamp ${timestamp}` : "Source excerpt"}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCitation(citation);
                    }}
                    className="font-medium text-violet-300 transition-colors hover:text-violet-100 hover:underline"
                  >
                    {getCitationActionLabel(citation)}
                  </button>
                </div>
              </div>
              {expanded && (
                <div className="mt-2 rounded-xl border border-white/[.08] bg-white/[.03] p-3 text-xs text-zinc-300">
                  <p className="font-medium text-zinc-100">{citation.sourceTitle}</p>
                  <p className="mt-1 leading-5 text-zinc-400">{citation.preview}</p>
                  <button type="button" onClick={() => openCitation(citation)} className="mt-3 font-medium text-violet-200 hover:text-violet-100">
                    {getCitationActionLabel(citation)}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!isUser && (
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Copy response"
              aria-label="Copy response"
              onClick={onCopy}
              className="text-zinc-500 hover:bg-white/[.06] hover:text-white"
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Export Markdown"
              aria-label="Export Markdown"
              onClick={handleExport}
              className="text-zinc-500 hover:bg-white/[.06] hover:text-white"
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Regenerate response"
              aria-label="Regenerate response"
              onClick={onRegenerate}
              className="text-zinc-500 hover:bg-white/[.06] hover:text-white"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </motion.article>
  );
}
