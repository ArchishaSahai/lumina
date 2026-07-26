"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock3, Files, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotebookSource } from "@/lib/sources";
import { AddSourceDialog } from "./add-source-dialog";
import { QuickActions } from "./quick-actions";
import { SourceCard } from "./source-card";
import { formatUpdatedAt } from "@/lib/formatters";
import { getNotebookSources } from "@/app/actions/sources";

type Props = { notebookId: string; title: string; description: string; sources: NotebookSource[]; updatedAt: string; highlightedSourceIds: string[]; onGenerateSummary?: () => void; onGenerateRoadmap?: () => void; onOpenRoadmap?: () => void; onGeneratePodcast?: () => void };

export function ContextPanel({ notebookId, title, description, sources, updatedAt, highlightedSourceIds, onGenerateSummary, onGenerateRoadmap, onOpenRoadmap, onGeneratePodcast }: Props) {
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [sourceList, setSourceList] = useState(sources);
  const hasSources = sourceList.length > 0;

  useEffect(() => {
    if (!sourceList.some((source) => source.status === "UPLOADING" || source.status === "PROCESSING")) return;
    const interval = window.setInterval(() => {
      void getNotebookSources(notebookId).then(setSourceList).catch(() => undefined);
    }, 3_000);
    return () => window.clearInterval(interval);
  }, [notebookId, sourceList]);

  return (
    <aside className="min-h-0 overflow-y-auto border-t border-white/[.08] bg-zinc-950/65 p-4 xl:border-t-0 xl:border-l">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-300">Notebook context</p>
        <h2 className="mt-2 font-heading text-xl font-semibold tracking-[-.04em]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-500"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/[.08] px-2.5 py-1"><Files className="size-3.5 text-violet-300" /> {sourceList.length} sources</span><span className="inline-flex items-center gap-1.5 rounded-full border border-white/[.08] px-2.5 py-1"><Clock3 className="size-3.5" /> {formatUpdatedAt(updatedAt)}</span></div>
      </motion.div>
      <section className="mt-7">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xs font-semibold uppercase tracking-[.16em] text-zinc-500">Uploaded files</h2><Button type="button" size="sm" onClick={() => setAddSourceOpen(true)} className="bg-violet-500 text-white hover:bg-violet-400"><Plus className="size-3.5" /> Add source</Button></div>
        {hasSources ? (
          <div className="mt-3 space-y-2">
            {sourceList.map((source, index) => (
              <SourceCard
                key={source.id}
                source={source}
                index={index}
                highlighted={highlightedSourceIds.includes(source.id)}
                onDeleted={(sourceId) => setSourceList((current) => current.filter((item) => item.id !== sourceId))}
                onRenamed={(updated) => setSourceList((current) => current.map((item) => item.id === updated.id ? updated : item))}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-white/[.12] bg-white/[.02] px-4 py-8 text-center"><FolderOpen className="mx-auto size-5 text-violet-300" /><p className="mt-3 text-sm font-medium text-zinc-300">No sources yet</p><p className="mt-1 text-xs leading-5 text-zinc-500">Add files to give your chats grounded context.</p></div>
        )}
      </section>
      <QuickActions onGenerateSummary={onGenerateSummary} onGenerateRoadmap={onGenerateRoadmap} onOpenRoadmap={onOpenRoadmap} onGeneratePodcast={onGeneratePodcast} />
      <AddSourceDialog notebookId={notebookId} open={addSourceOpen} onOpenChange={setAddSourceOpen} onSourceAdded={(source) => setSourceList((current) => [source, ...current])} />
    </aside>
  );
}
