import { motion } from "framer-motion";
import { Clock3, Files, FolderOpen } from "lucide-react";
import { QuickActions } from "./quick-actions";
import { SourceCard } from "./source-card";
import { sources } from "./notebook-workspace-data";

type Props = { title: string; description: string; sourceCount: number; updatedAt: string };

export function ContextPanel({ title, description, sourceCount, updatedAt }: Props) {
  const hasSources = sourceCount > 0;

  return (
    <aside className="min-h-0 overflow-y-auto border-t border-white/[.08] bg-zinc-950/65 p-4 xl:border-t-0 xl:border-l">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-300">Notebook context</p>
        <h2 className="mt-2 font-heading text-xl font-semibold tracking-[-.04em]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-500"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/[.08] px-2.5 py-1"><Files className="size-3.5 text-violet-300" /> {sourceCount} sources</span><span className="inline-flex items-center gap-1.5 rounded-full border border-white/[.08] px-2.5 py-1"><Clock3 className="size-3.5" /> {updatedAt}</span></div>
      </motion.div>
      <section className="mt-7">
        <h2 className="text-xs font-semibold uppercase tracking-[.16em] text-zinc-500">Uploaded files</h2>
        {hasSources ? <div className="mt-3 space-y-2">{sources.slice(0, sourceCount).map((source, index) => <SourceCard key={source.name} source={source} index={index} />)}</div> : <div className="mt-3 rounded-xl border border-dashed border-white/[.12] bg-white/[.02] px-4 py-8 text-center"><FolderOpen className="mx-auto size-5 text-violet-300" /><p className="mt-3 text-sm font-medium text-zinc-300">No sources yet</p><p className="mt-1 text-xs leading-5 text-zinc-500">Add files to give your chats grounded context.</p></div>}
      </section>
      <QuickActions />
    </aside>
  );
}
