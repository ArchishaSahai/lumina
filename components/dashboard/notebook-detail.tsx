"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Files } from "lucide-react";
import { mockNotebooks, type Notebook } from "./notebook-data";

export function NotebookDetail({ id }: { id: string }) {
  const [notebook] = useState<Notebook | undefined>(() => {
    const mockNotebook = mockNotebooks.find((item) => item.id === id);
    if (mockNotebook || typeof window === "undefined") return mockNotebook;

    const stored = sessionStorage.getItem(`lumina:notebook:${id}`);
    return stored ? (JSON.parse(stored) as Notebook) : undefined;
  });
  return <main className="min-h-svh bg-black px-4 py-10 text-white sm:px-6"><div className="mx-auto max-w-3xl"><Link href="/dashboard" className="inline-flex cursor-pointer items-center gap-2 rounded-lg text-sm text-zinc-400 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-violet-400/70"><ArrowLeft className="size-4" /> Back to notebooks</Link><div className="mt-14 rounded-3xl border border-white/[.1] bg-white/[.045] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] sm:p-10"><span className="grid size-12 place-items-center rounded-2xl bg-violet-400/[.12] text-violet-300"><Files className="size-6" /></span><p className="mt-8 text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Notebook</p><h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-.055em] sm:text-5xl">{notebook?.title ?? "Notebook"}</h1><p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">{notebook?.description ?? "This mock notebook is ready for sources and notes."}</p><div className="mt-10 border-t border-white/[.08] pt-5 text-sm text-zinc-500">{notebook?.sourceCount ?? 0} sources · {notebook?.updatedAt ?? "Updated just now"}</div></div></div></main>;
}
