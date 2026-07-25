"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Check, FileCode2, FileText, Film, Globe2, LoaderCircle, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSource, retrySource } from "@/app/actions/sources";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { NotebookSource } from "@/lib/sources";

const stages = ["Uploading", "Extracting text", "Creating chunks", "Generating embeddings", "Indexing in Pinecone", "Ready"];
const typeStyles = "bg-violet-400/[.08] text-violet-200";

export function SourceCard({ source, index, highlighted = false, onDeleted }: { source: NotebookSource; index: number; highlighted?: boolean; onDeleted: (sourceId: string) => void }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const Icon = source.type === "YOUTUBE" ? Film : source.type === "WEBSITE" ? Globe2 : source.type === "MARKDOWN" || source.type === "TEXT" || source.type === "VTT" ? FileCode2 : FileText;
  const typeLabel = source.type === "VTT" ? "Transcript" : source.type[0] + source.type.slice(1).toLowerCase();
  const statusLabel = source.status[0] + source.status.slice(1).toLowerCase();
  const remove = () => startTransition(async () => { try { await deleteSource(source.id); onDeleted(source.id); setDeleteOpen(false); toast.success("Source deleted"); } catch { toast.error("Unable to delete source"); } });
  const retry = () => startTransition(async () => { try { await retrySource(source.id); toast.success("Retrying source processing"); } catch { toast.error("Unable to retry source"); } });
  const openSource = () => { if (source.status === "PROCESSING" || source.status === "FAILED") { setDetailsOpen(true); return; } if (!source.url && source.type !== "PDF") return; const target = source.url ?? `/api/sources/${source.id}/open`; window.open(target, "_blank", "noopener,noreferrer"); };
  const currentStage = source.processingError?.startsWith("stage:") ? source.processingError.slice(6) : "EXTRACTING";
  const stageIndex = { UPLOADING: 0, EXTRACTING: 1, CHUNKING: 2, EMBEDDING: 3, INDEXING: 4 }[currentStage] ?? 0;

  useEffect(() => {
    if (highlighted) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [highlighted]);

  return <><motion.article ref={cardRef} onClick={openSource} title={source.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -2 }} className={`group cursor-pointer rounded-xl border p-3 transition-colors hover:border-violet-300/25 hover:bg-violet-400/[.06] ${highlighted ? "border-violet-300/50 bg-violet-400/[.12] shadow-[0_0_24px_rgba(167,139,250,.22)]" : "border-white/[.08] bg-white/[.035]"}`}><div className="flex items-center gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${typeStyles}`}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-zinc-200">{source.title}</span><span className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500"><span className={`rounded-full px-1.5 py-0.5 font-medium ${typeStyles}`}>{typeLabel}</span><span>·</span><span className={source.status === "FAILED" ? "text-rose-300" : source.status === "READY" ? "text-emerald-300" : "text-sky-300"}>{statusLabel}</span></span></span><DropdownMenu><DropdownMenuTrigger asChild><button type="button" onClick={(event) => event.stopPropagation()} aria-label={`More options for ${source.title}`} className="cursor-pointer rounded-md p-1 text-zinc-600 transition-colors hover:bg-white/[.08] hover:text-white"><MoreHorizontal className="size-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="border border-white/[.1] bg-zinc-950 p-1 text-white shadow-xl"><DropdownMenuItem onSelect={() => toast.info("Rename is available from source settings") } className="cursor-pointer">Rename</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)} className="cursor-pointer"><Trash2 className="size-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>{source.status === "PROCESSING" && <div className="mt-3 flex items-center gap-2 text-[11px] text-sky-200"><LoaderCircle className="size-3 animate-spin" /> {stages[stageIndex]}</div>}</motion.article><Dialog open={detailsOpen} onOpenChange={setDetailsOpen}><DialogContent className="border-white/[.12] bg-zinc-950 p-6 text-white sm:max-w-md"><DialogHeader><DialogTitle>{source.status === "FAILED" ? "Processing failed" : "Processing source"}</DialogTitle><DialogDescription className="truncate text-zinc-400">{source.title}</DialogDescription></DialogHeader><div className="space-y-2">{stages.map((stage, itemIndex) => { const done = source.status === "READY" || itemIndex < stageIndex; const active = source.status === "PROCESSING" && itemIndex === stageIndex; return <div key={stage} className="flex items-center gap-3 rounded-lg bg-white/[.03] px-3 py-2 text-sm"><span className={done ? "text-emerald-300" : active ? "text-sky-300" : "text-zinc-600"}>{done ? <Check className="size-4" /> : active ? <LoaderCircle className="size-4 animate-spin" /> : <span className="block size-4 rounded-full border border-current" />}</span><span className={done || active ? "text-zinc-200" : "text-zinc-500"}>{stage}</span></div>})}</div>{source.status === "FAILED" && <p className="text-sm text-rose-300">{source.processingError?.replace(/^stage:[A-Z]+\s*/, "") || "Unable to process this source."}</p>}<DialogFooter><Button type="button" onClick={retry} disabled={isPending} className="bg-violet-500 text-white hover:bg-violet-400"><RefreshCw className="size-4" /> Retry</Button></DialogFooter></DialogContent></Dialog><Dialog open={deleteOpen} onOpenChange={(open) => { if (!isPending) setDeleteOpen(open); }}><DialogContent className="border-white/[.12] bg-zinc-950 p-6 text-white sm:max-w-md"><DialogHeader><DialogTitle>Delete source?</DialogTitle><DialogDescription className="leading-6 text-zinc-400">This will permanently delete <span className="font-medium text-zinc-200">{source.title}</span> and its stored file. This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button type="button" variant="destructive" onClick={remove} disabled={isPending}>{isPending ? "Deleting..." : "Delete source"}</Button></DialogFooter></DialogContent></Dialog></>;
}
