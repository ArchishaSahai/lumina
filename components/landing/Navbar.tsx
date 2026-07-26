"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#timeline" },
  { label: "Demo", href: "#demo" },
  { label: "Contact", href: "#footer" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const getStarted = () => router.push(isSignedIn ? "/dashboard" : "/sign-up");
  return <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
    <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/[.1] bg-black/55 px-4 py-3 backdrop-blur-xl sm:px-5">
      <a href="#top" className="cursor-pointer text-lg font-semibold tracking-[-.04em] outline-none transition-colors hover:text-violet-200 focus-visible:text-violet-200 focus-visible:ring-2 focus-visible:ring-violet-400/70" aria-label="Lumina home">Lumina</a>
      <div className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">{links.map((link) => <a className="cursor-pointer rounded-sm outline-none transition-colors hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-violet-400/70" href={link.href} key={link.label}>{link.label}</a>)}</div>
      <div className="hidden items-center gap-2 sm:flex">{isSignedIn ? <Button onClick={getStarted} className="bg-violet-500 px-4 text-white shadow-[0_0_18px_rgba(139,92,246,.24)] hover:bg-violet-400">Get started</Button> : <><SignInButton mode="modal" fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard"><Button variant="ghost" className="text-zinc-300 hover:bg-white/[.07] hover:text-white">Log in</Button></SignInButton><SignUpButton mode="modal" fallbackRedirectUrl="/dashboard" signInFallbackRedirectUrl="/dashboard"><Button className="bg-violet-500 px-4 text-white shadow-[0_0_18px_rgba(139,92,246,.24)] hover:bg-violet-400">Get started</Button></SignUpButton></>}</div>
      <button className="grid size-9 cursor-pointer place-items-center rounded-lg text-zinc-300 outline-none transition-colors hover:bg-white/[.07] hover:text-white focus-visible:ring-2 focus-visible:ring-violet-400/70 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
    </nav>
    {open && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-2 max-w-6xl rounded-2xl border border-white/[.1] bg-zinc-950/95 p-3 backdrop-blur-xl md:hidden">{links.map((link) => <a onClick={() => setOpen(false)} className="block cursor-pointer rounded-lg px-3 py-2.5 text-sm text-zinc-300 outline-none transition-colors hover:bg-white/[.06] hover:text-white focus-visible:ring-2 focus-visible:ring-violet-400/70" href={link.href} key={link.label}>{link.label}</a>)}<div className="mt-2 grid gap-2 border-t border-white/[.08] pt-2 sm:hidden">{isSignedIn ? <Button onClick={getStarted} className="bg-violet-500 text-white hover:bg-violet-400">Get started</Button> : <><SignInButton mode="modal" fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard"><Button variant="ghost" className="justify-start text-zinc-300">Log in</Button></SignInButton><SignUpButton mode="modal" fallbackRedirectUrl="/dashboard" signInFallbackRedirectUrl="/dashboard"><Button className="bg-violet-500 text-white hover:bg-violet-400">Get started</Button></SignUpButton></>}</div></motion.div>}
  </header>;
}
