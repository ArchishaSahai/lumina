"use client";

import { useMemo, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { BookOpen, LogOut, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CreateNotebookDialog } from "./create-notebook-dialog";
import { mockNotebooks, type Notebook } from "./notebook-data";
import { NotebookCard } from "./notebook-card";

export function DashboardClient() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [notebooks, setNotebooks] = useState(mockNotebooks);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const visibleNotebooks = useMemo(
    () =>
      notebooks.filter((notebook) =>
        `${notebook.title} ${notebook.description}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [notebooks, query],
  );
  const hasNotebooks = notebooks.length > 0;
  const name = user?.firstName ?? user?.fullName ?? "there";
  const initials = (user?.firstName?.[0] ?? user?.lastName?.[0] ?? "L").toUpperCase();
  const featured = visibleNotebooks.filter((notebook) => notebook.featured);
  const recent = visibleNotebooks.filter((notebook) => !notebook.featured);
  const greeting = hasNotebooks
    ? {
        heading: `Welcome back, ${name}.`,
        subheading: "Pick up where you left off.",
      }
    : {
        heading: `Welcome, ${name}.`,
        subheading: "Let's build your first notebook.",
      };

  const createNotebook = (title: string, description: string) => {
    const notebook = {
      id: crypto.randomUUID(),
      title,
      description,
      sourceCount: 0,
      updatedAt: "Updated just now",
    };

    sessionStorage.setItem(`lumina:notebook:${notebook.id}`, JSON.stringify(notebook));
    setNotebooks((current) => [notebook, ...current]);
    router.push(`/notebook/${notebook.id}`);
  };

  return (
    <main className="min-h-svh bg-black text-white">
      <header className="border-b border-white/[.08] bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a
            href="/dashboard"
            className="cursor-pointer rounded-sm text-lg font-semibold tracking-[-.04em] outline-none transition-colors hover:text-violet-200 focus-visible:ring-2 focus-visible:ring-violet-400/70"
          >
            Lumina
          </a>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.fullName ?? "Lumina member"}</p>
              <p className="text-xs text-zinc-500">Your workspace</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="cursor-pointer rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-violet-400/70"
                >
                  <Avatar>
                    <AvatarImage src={user?.imageUrl} alt="Your profile" />
                    <AvatarFallback className="bg-violet-500/20 text-violet-200">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-44 border border-white/[.1] bg-zinc-950 p-1 text-white shadow-xl"
              >
                <DropdownMenuLabel className="px-2 py-1.5 text-zinc-400">
                  {user?.fullName ?? "Lumina member"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[.08]" />
                <DropdownMenuItem
                  onSelect={() => signOut({ redirectUrl: "/" })}
                  className="cursor-pointer px-2 py-2 text-zinc-300 focus:bg-white/[.08] focus:text-white"
                >
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Your workspace</p>
            <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-.055em] sm:text-5xl">
              {greeting.heading}
            </h1>
            <p className="mt-3 max-w-xl text-zinc-400">{greeting.subheading}</p>
          </div>
          <Button
            size="lg"
            onClick={() => setDialogOpen(true)}
            className="bg-violet-500 text-white shadow-[0_0_28px_rgba(139,92,246,.28)] hover:bg-violet-400"
          >
            <Plus className="size-4" /> Create notebook
          </Button>
        </div>

        {hasNotebooks ? (
          <>
            <div className="relative mt-10 max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notebooks"
                className="h-11 border-white/[.12] bg-white/[.045] pl-10 text-white placeholder:text-zinc-600 focus-visible:border-violet-400"
              />
            </div>

            {featured.length > 0 && <DashboardSection title="Featured notebooks" notebooks={featured} />}
            {recent.length > 0 && <DashboardSection title="Recent notebooks" notebooks={recent} />}
            {visibleNotebooks.length === 0 && (
              <p className="mt-14 rounded-2xl border border-dashed border-white/[.12] px-5 py-10 text-sm text-zinc-500">
                No notebooks match your search.
              </p>
            )}
          </>
        ) : (
          <EmptyState onCreate={() => setDialogOpen(true)} />
        )}

        <CreateNotebookDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={createNotebook} />
      </div>
    </main>
  );
}

function DashboardSection({ title, notebooks }: { title: string; notebooks: Notebook[] }) {
  return (
    <section className="mt-14">
      <h2 className="font-heading text-xl font-medium tracking-[-.03em]">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {notebooks.map((notebook) => (
          <NotebookCard key={notebook.id} notebook={notebook} />
        ))}
      </div>
    </section>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center py-20 text-center sm:py-28">
      <div className="grid size-24 place-items-center rounded-[2rem] border border-violet-300/15 bg-violet-400/[.1] text-violet-300 shadow-[0_0_56px_rgba(139,92,246,.2)]">
        <BookOpen className="size-11" strokeWidth={1.5} />
      </div>
      <h2 className="mt-8 font-heading text-2xl font-medium tracking-[-.04em]">Create your first notebook</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
        Bring your sources, ideas, and notes together in one focused workspace.
      </p>
      <Button
        size="lg"
        onClick={onCreate}
        className="mt-8 bg-violet-500 text-white shadow-[0_0_28px_rgba(139,92,246,.28)] hover:bg-violet-400"
      >
        <Plus className="size-4" /> Create notebook
      </Button>
    </section>
  );
}
