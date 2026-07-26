"use client";

import { useMemo, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { ArrowRight, BookOpen, Compass, LogOut, MoreVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteRoadmap, renameRoadmap, type SerializedRoadmap } from "@/app/actions/roadmaps";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatUpdatedAt } from "@/lib/formatters";

export function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative grid size-14 place-items-center">
      <svg className="size-14 -rotate-90">
        <circle cx="28" cy="28" r={radius} className="stroke-white/10" strokeWidth="4" fill="transparent" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="stroke-violet-400 transition-all duration-500 ease-out"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <span className="absolute font-heading text-xs font-bold text-white">{percentage}%</span>
    </div>
  );
}

export function RoadmapsClient({ roadmaps }: { roadmaps: SerializedRoadmap[] }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [roadmapList, setRoadmapList] = useState(roadmaps);
  const [query, setQuery] = useState("");

  const [renameTarget, setRenameTarget] = useState<SerializedRoadmap | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<SerializedRoadmap | null>(null);

  const visibleRoadmaps = useMemo(
    () => roadmapList.filter((r) => `${r.title} ${r.notebookTitle} ${r.goal}`.toLowerCase().includes(query.toLowerCase())),
    [roadmapList, query]
  );

  const hasRoadmaps = roadmapList.length > 0;
  const name = user?.firstName ?? user?.fullName ?? "there";
  const initials = (user?.firstName?.[0] ?? user?.lastName?.[0] ?? "L").toUpperCase();

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !newTitle.trim()) return;
    const previous = roadmapList;
    setRoadmapList((current) => current.map((r) => (r.id === renameTarget.id ? { ...r, title: newTitle.trim() } : r)));
    try {
      await renameRoadmap(renameTarget.id, newTitle);
      toast.success("Roadmap renamed");
      setRenameTarget(null);
      router.refresh();
    } catch {
      setRoadmapList(previous);
      toast.error("Unable to rename roadmap");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const previous = roadmapList;
    setRoadmapList((current) => current.filter((r) => r.id !== deleteTarget.id));
    try {
      await deleteRoadmap(deleteTarget.id);
      toast.success("Roadmap deleted");
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setRoadmapList(previous);
      toast.error("Unable to delete roadmap");
    }
  };

  return (
    <main className="min-h-svh bg-black text-white">
      {/* Navigation Header */}
      <header className="border-b border-white/[.08] bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="cursor-pointer text-lg font-semibold tracking-[-.04em] text-white hover:text-violet-200">
              Lumina
            </Link>
            <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 text-xs">
              <Link
                href="/dashboard"
                className="rounded-full px-3 py-1.5 font-medium text-zinc-400 transition-colors hover:text-white"
              >
                Notebooks
              </Link>
              <Link
                href="/dashboard/roadmaps"
                className="rounded-full bg-violet-500/20 px-3 py-1.5 font-medium text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]"
              >
                Roadmaps
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.fullName ?? "Lumina member"}</p>
              <p className="text-xs text-zinc-500">Learning Hub</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Open account menu" className="cursor-pointer rounded-full outline-none hover:scale-105">
                  <Avatar>
                    <AvatarImage src={user?.imageUrl} alt="Your profile" />
                    <AvatarFallback className="bg-violet-500/20 text-violet-200">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44 border border-white/[.1] bg-zinc-950 p-1 text-white shadow-xl">
                <DropdownMenuLabel className="px-2 py-1.5 text-zinc-400">{user?.fullName ?? "Lumina member"}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[.08]" />
                <DropdownMenuItem onSelect={() => signOut({ redirectUrl: "/" })} className="cursor-pointer px-2 py-2 text-zinc-300 focus:bg-white/[.08] focus:text-white">
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Learning Hub</p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-.055em] sm:text-5xl">Personalized Roadmaps</h1>
          <p className="mt-3 max-w-xl text-zinc-400">Track your progress and continue learning across all your study plans.</p>
        </div>

        {hasRoadmaps ? (
          <>
            <div className="relative mt-10 max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search roadmaps by title, notebook, or goal..."
                className="h-11 border-white/[.12] bg-white/[.045] pl-10 text-white placeholder:text-zinc-600 focus-visible:border-violet-400"
              />
            </div>

            {visibleRoadmaps.length > 0 ? (
              <div className="mt-10 grid gap-4 md:grid-cols-2">
                {visibleRoadmaps.map((roadmap) => (
                  <RoadmapCard
                    key={roadmap.id}
                    roadmap={roadmap}
                    onRename={() => {
                      setRenameTarget(roadmap);
                      setNewTitle(roadmap.title);
                    }}
                    onDelete={() => setDeleteTarget(roadmap)}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-14 rounded-2xl border border-dashed border-white/[.12] px-5 py-10 text-sm text-zinc-500">
                No roadmaps match your search filter.
              </p>
            )}
          </>
        ) : (
          <EmptyRoadmapsState />
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="border-white/[.12] bg-zinc-950 text-white">
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>Rename Roadmap</DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">Update the title of your learning plan.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Roadmap title"
                className="border-white/[.12] bg-white/[.045] text-white"
                autoFocus
              />
            </div>
            <DialogFooter className="bg-zinc-950">
              <Button type="button" variant="ghost" onClick={() => setRenameTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-violet-500 text-white hover:bg-violet-400">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="border-white/[.12] bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Delete Roadmap</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-zinc-950">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete Roadmap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function RoadmapCard({
  roadmap,
  onRename,
  onDelete,
}: {
  roadmap: SerializedRoadmap;
  onRename: () => void;
  onDelete: () => void;
}) {
  const targetUrl = `/dashboard/notebooks/${roadmap.notebookId}/roadmap/${roadmap.id}`;

  return (
    <Link
      href={targetUrl}
      className="group relative block overflow-hidden rounded-2xl border border-white/[.09] bg-gradient-to-br from-zinc-950 via-zinc-900/40 to-zinc-950 p-5 transition-all duration-300 hover:border-violet-400/30 hover:shadow-[0_8px_32px_rgba(139,92,246,0.12)] cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ProgressRing percentage={roadmap.progressPercentage} />
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-300">
              <BookOpen className="size-3" /> {roadmap.notebookTitle}
            </span>
            <h3 className="mt-0.5 font-heading text-lg font-semibold tracking-tight text-white group-hover:text-violet-100">
              {roadmap.title}
            </h3>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
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
        <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-0.5 font-medium text-violet-200">
          🎯 {roadmap.goal}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-zinc-400">
          📅 {roadmap.timeline}
        </span>
        {roadmap.currentPhaseTitle && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-zinc-300">
            Current: {roadmap.currentPhaseTitle}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/[.08] pt-3 text-xs text-zinc-500">
        <span>{formatUpdatedAt(roadmap.updatedAt)}</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-violet-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-200">
          Continue <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

function EmptyRoadmapsState() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center py-20 text-center sm:py-28">
      <div className="grid size-24 place-items-center rounded-[2rem] border border-violet-300/15 bg-violet-400/[.1] text-violet-300 shadow-[0_0_56px_rgba(139,92,246,.2)]">
        <Compass className="size-11" strokeWidth={1.5} />
      </div>
      <h2 className="mt-8 font-heading text-2xl font-medium tracking-[-.04em]">🗺️ No roadmaps yet</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
        Generate your first personalized learning roadmap from any notebook context.
      </p>
      <Link href="/dashboard">
        <Button size="lg" className="mt-8 bg-violet-500 text-white shadow-[0_0_28px_rgba(139,92,246,.28)] hover:bg-violet-400">
          <BookOpen className="size-4" /> Browse Notebooks
        </Button>
      </Link>
    </section>
  );
}
