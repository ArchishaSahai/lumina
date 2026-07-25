"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { FileCode2, FileText, Film, Globe2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSource } from "@/app/actions/sources";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { NotebookSource } from "@/lib/sources";

const statusStyles = { READY: "bg-emerald-400", UPLOADING: "bg-amber-400", PROCESSING: "bg-sky-400", FAILED: "bg-rose-400" } as const;

export function SourceCard({ source, index, onDeleted }: { source: NotebookSource; index: number; onDeleted: (sourceId: string) => void }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const Icon = source.type === "YOUTUBE" ? Film : source.type === "WEBSITE" ? Globe2 : source.type === "MARKDOWN" || source.type === "TEXT" || source.type === "VTT" ? FileCode2 : FileText;
  const typeLabel = source.type === "VTT" ? "Transcript" : source.type[0] + source.type.slice(1).toLowerCase();
  const statusLabel = source.status[0] + source.status.slice(1).toLowerCase();
  const remove = () => startTransition(async () => { try { await deleteSource(source.id); onDeleted(source.id); setDeleteOpen(false); toast.success("Source deleted"); } catch { toast.error("Unable to delete source"); } });

  return <><motion.article initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -2 }} className="group flex items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.035] p-3 transition-colors hover:border-violet-300/25 hover:bg-violet-400/[.06]"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-400/[.1] text-violet-300"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-zinc-200">{source.title}</span><span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500"><span>{typeLabel} ·</span><span className={`size-1.5 shrink-0 rounded-full ${statusStyles[source.status]}`} /><span>{statusLabel}</span></span></span><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`More options for ${source.title}`} className="cursor-pointer rounded-md p-1 text-zinc-600 transition-colors hover:bg-white/[.08] hover:text-white data-[state=open]:bg-white/[.08] data-[state=open]:text-white"><MoreHorizontal className="size-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="border border-white/[.1] bg-zinc-950 p-1 text-white shadow-xl"><DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)} className="cursor-pointer"><Trash2 className="size-4" /> Delete source</DropdownMenuItem></DropdownMenuContent></DropdownMenu></motion.article><Dialog open={deleteOpen} onOpenChange={(open) => { if (!isPending) setDeleteOpen(open); }}><DialogContent className="border-white/[.12] bg-zinc-950 p-6 text-white sm:max-w-md"><DialogHeader><DialogTitle>Delete source?</DialogTitle><DialogDescription className="leading-6 text-zinc-400">This will permanently delete <span className="font-medium text-zinc-200">{source.title}</span> and its stored file. This cannot be undone.</DialogDescription></DialogHeader><DialogFooter className="-mx-6 -mb-6 border-white/[.08] bg-white/[.025] p-4"><Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} disabled={isPending} className="text-zinc-300 hover:bg-white/[.08] hover:text-white">Cancel</Button><Button type="button" variant="destructive" onClick={remove} disabled={isPending}>{isPending ? "Deleting..." : "Delete source"}</Button></DialogFooter></DialogContent></Dialog></>;
}
