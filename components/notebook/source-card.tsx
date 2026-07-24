import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import type { NotebookSource } from "./notebook-workspace-data";

export function SourceCard({ source, index }: { source: NotebookSource; index: number }) {
  const Icon = source.icon;
  return <motion.article initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -2 }} className="group flex items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.035] p-3 transition-colors hover:border-violet-300/25 hover:bg-violet-400/[.06]"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-400/[.1] text-violet-300"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-zinc-200">{source.name}</span><span className="mt-0.5 block text-xs text-zinc-500">{source.meta}</span></span><button type="button" aria-label={`More options for ${source.name}`} className="cursor-pointer rounded-md p-1 text-zinc-600 transition-colors hover:bg-white/[.08] hover:text-white"><MoreHorizontal className="size-4" /></button></motion.article>;
}
