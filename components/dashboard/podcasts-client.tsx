"use client";

import { useMemo, useState } from "react";
import { BookOpen, Clock, Headphones, MoreVertical, Pencil, Play, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePodcast, renamePodcast, type SerializedPodcast } from "@/app/actions/podcasts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatUpdatedAt } from "@/lib/formatters";
import { DashboardHeader } from "./dashboard-header";

export function PodcastsClient({ podcasts }: { podcasts: SerializedPodcast[] }) {
  const router = useRouter();

  const [podcastList, setPodcastList] = useState(podcasts);
  const [query, setQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<SerializedPodcast | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SerializedPodcast | null>(null);

  const visiblePodcasts = useMemo(
    () => podcastList.filter((p) => `${p.title} ${p.notebookTitle}`.toLowerCase().includes(query.toLowerCase())),
    [podcastList, query]
  );

  const hasPodcasts = podcastList.length > 0;

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !newTitle.trim()) return;
    const previous = podcastList;
    setPodcastList((current) => current.map((p) => (p.id === renameTarget.id ? { ...p, title: newTitle.trim() } : p)));
    try {
      await renamePodcast(renameTarget.id, newTitle);
      toast.success("Podcast renamed");
      setRenameTarget(null);
      router.refresh();
    } catch {
      setPodcastList(previous);
      toast.error("Unable to rename podcast");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const previous = podcastList;
    setPodcastList((current) => current.filter((p) => p.id !== deleteTarget.id));
    try {
      await deletePodcast(deleteTarget.id);
      toast.success("Podcast deleted");
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setPodcastList(previous);
      toast.error("Unable to delete podcast");
    }
  };

  return (
    <main className="min-h-svh bg-black text-white">
      <DashboardHeader activeTab="podcasts" contextLabel="Podcast Studio" />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Podcast Studio</p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-.055em] sm:text-5xl">Your Podcasts</h1>
          <p className="mt-3 max-w-xl text-zinc-400">AI-generated podcast episodes from your notebook content.</p>
        </div>

        {hasPodcasts ? (
          <>
            <div className="relative mt-10 max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search podcasts by title or notebook..."
                className="h-11 border-white/[.12] bg-white/[.045] pl-10 text-white placeholder:text-zinc-600 focus-visible:border-violet-400"
              />
            </div>

            {visiblePodcasts.length > 0 ? (
              <div className="mt-10 grid gap-4 md:grid-cols-2">
                {visiblePodcasts.map((podcast) => (
                  <PodcastCard
                    key={podcast.id}
                    podcast={podcast}
                    onRename={() => { setRenameTarget(podcast); setNewTitle(podcast.title); }}
                    onDelete={() => setDeleteTarget(podcast)}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-14 rounded-2xl border border-dashed border-white/[.12] px-5 py-10 text-sm text-zinc-500">
                No podcasts match your search filter.
              </p>
            )}
          </>
        ) : (
          <EmptyPodcastsState />
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="border-white/[.12] bg-zinc-950 text-white">
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>Rename Podcast</DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">Update the title of your podcast episode.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Podcast title"
                className="border-white/[.12] bg-white/[.045] text-white"
                autoFocus
              />
            </div>
            <DialogFooter className="bg-zinc-950">
              <Button type="button" variant="ghost" onClick={() => setRenameTarget(null)}>Cancel</Button>
              <Button type="submit" className="bg-violet-500 text-white hover:bg-violet-400">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="border-white/[.12] bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Delete Podcast</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-zinc-950">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>Delete Podcast</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function PodcastCard({ podcast, onRename, onDelete }: { podcast: SerializedPodcast; onRename: () => void; onDelete: () => void }) {
  const isGenerating = podcast.status === "GENERATING";
  const isFailed = podcast.status === "FAILED";
  const generationStage = podcast.generationStage || (podcast.status === "READY" ? "Ready" : isFailed ? "Failed" : "Preparing Sources");

  return (
    <Link
      href={`/dashboard/podcasts/${podcast.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-white/[.09] bg-gradient-to-br from-zinc-950 via-zinc-900/40 to-zinc-950 p-5 transition-all duration-300 hover:border-violet-400/30 hover:shadow-[0_8px_32px_rgba(139,92,246,0.12)] cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`grid size-12 shrink-0 place-items-center rounded-xl border ${
            isGenerating ? "animate-pulse border-amber-400/20 bg-amber-400/10" :
            isFailed ? "border-rose-400/20 bg-rose-400/10" :
            "border-violet-400/20 bg-violet-400/10"
          }`}>
            <Headphones className={`size-5 ${
              isGenerating ? "text-amber-300" :
              isFailed ? "text-rose-300" :
              "text-violet-300"
            }`} />
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-300">
              <BookOpen className="size-3" /> {podcast.notebookTitle}
            </span>
            <h3 className="mt-0.5 font-heading text-lg font-semibold tracking-tight text-white group-hover:text-violet-100 line-clamp-2">
              {podcast.title}
            </h3>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
                <MoreVertical className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-white/10 bg-zinc-950 p-1 text-white">
              <DropdownMenuItem onClick={onRename} className="cursor-pointer text-xs">
                <Pencil className="size-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-xs text-rose-400 focus:bg-rose-500/10 focus:text-rose-300">
                <Trash2 className="size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-0.5 font-medium text-violet-200">
          <Clock className="size-3" /> {podcast.duration} min
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-zinc-400">
          🎙️ {podcast.speakers} {podcast.speakers === 1 ? "speaker" : "speakers"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-zinc-400">
          {podcast.status === "READY" ? "Ready" : generationStage}
        </span>
        {isGenerating && (
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 font-medium text-amber-200">
            ⏳ Generating...
          </span>
        )}
        {isFailed && (
          <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-0.5 font-medium text-rose-200">
            ❌ Failed
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/[.08] pt-3 text-xs text-zinc-500">
        <span>{formatUpdatedAt(podcast.updatedAt)}</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-violet-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-200">
          {isGenerating ? "View" : <><Play className="size-3" /> Play</>}
        </span>
      </div>
    </Link>
  );
}

function EmptyPodcastsState() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center py-20 text-center sm:py-28">
      <div className="grid size-24 place-items-center rounded-[2rem] border border-violet-300/15 bg-violet-400/[.1] text-violet-300 shadow-[0_0_56px_rgba(139,92,246,.2)]">
        <Headphones className="size-11" strokeWidth={1.5} />
      </div>
      <h2 className="mt-8 font-heading text-2xl font-medium tracking-[-.04em]">🎙️ No podcasts yet</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
        Generate your first AI podcast episode from any notebook.
      </p>
      <Link href="/dashboard">
        <Button size="lg" className="mt-8 bg-violet-500 text-white shadow-[0_0_28px_rgba(139,92,246,.28)] hover:bg-violet-400">
          <BookOpen className="size-4" /> Browse Notebooks
        </Button>
      </Link>
    </section>
  );
}
