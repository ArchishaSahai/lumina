import { BookOpen, Clock3, Files } from "lucide-react";
import Link from "next/link";
import type { Notebook } from "./notebook-data";

export function NotebookCard({ notebook }: { notebook: Notebook }) {
  return <Link href={`/dashboard/notebooks/${notebook.id}`} className="group relative block cursor-pointer overflow-hidden rounded-2xl border border-white/[.1] bg-white/[.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] outline-none transition-all duration-500 hover:-translate-y-1.5 hover:border-violet-400/40 hover:bg-violet-500/[.07] hover:shadow-[0_18px_50px_rgba(91,33,182,.16)] focus-visible:-translate-y-1.5 focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400/70">
    <div className="absolute -right-12 -top-12 size-32 rounded-full bg-violet-500/0 blur-3xl transition-colors duration-500 group-hover:bg-violet-500/25" />
    <div className="relative"><span className="grid size-10 place-items-center rounded-xl border border-violet-300/15 bg-violet-400/[.1] text-violet-300 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"><BookOpen className="size-5" /></span><h3 className="mt-7 text-base font-medium tracking-tight text-white">{notebook.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{notebook.description}</p><div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[.08] pt-4 text-xs text-zinc-500"><span className="flex items-center gap-1.5"><Files className="size-3.5 text-violet-300" />{notebook.sourceCount} sources</span><span className="flex items-center gap-1.5 whitespace-nowrap"><Clock3 className="size-3.5" />{notebook.updatedAt.replace("Updated ", "")}</span></div></div>
  </Link>;
}
