"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = ["Features", "How it works", "Pricing", "GitHub"];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
    <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/[.1] bg-black/55 px-4 py-3 backdrop-blur-xl sm:px-5">
      <a href="#top" className="text-lg font-semibold tracking-[-.04em]" aria-label="Lumina home">Lumina</a>
      <div className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">{links.map((link) => <a className="transition-colors hover:text-white" href={link === "How it works" ? "#how-it-works" : `#${link.toLowerCase()}`} key={link}>{link}</a>)}</div>
      <div className="hidden items-center gap-2 sm:flex"><Button variant="ghost" className="text-zinc-300 hover:bg-white/[.07] hover:text-white">Login</Button><Button className="bg-violet-500 px-4 text-white shadow-[0_0_24px_rgba(139,92,246,.3)] hover:bg-violet-400">Get started</Button></div>
      <button className="grid size-9 place-items-center rounded-lg text-zinc-300 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
    </nav>
    {open && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-2 max-w-6xl rounded-2xl border border-white/[.1] bg-zinc-950/95 p-3 backdrop-blur-xl md:hidden">{links.map((link) => <a onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/[.06]" href={link === "How it works" ? "#how-it-works" : `#${link.toLowerCase()}`} key={link}>{link}</a>)}</motion.div>}
  </header>;
}
