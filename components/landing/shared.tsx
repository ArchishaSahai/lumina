"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 68, damping: 18, mass: 1 } },
};

export function SectionHeading({ eyebrow, title, copy, className }: { eyebrow: string; title: string; copy?: string; className?: string }) {
  return <motion.div className={cn("mx-auto max-w-2xl text-center", className)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}>
    <p className="mb-4 text-xs font-semibold uppercase tracking-[.22em] text-violet-300">{eyebrow}</p>
    <h2 className="font-heading text-balance text-3xl font-semibold tracking-[-.045em] text-white sm:text-5xl">{title}</h2>
    {copy && <p className="mt-5 text-pretty text-base leading-7 text-zinc-400 sm:text-lg">{copy}</p>}
  </motion.div>;
}

export const glass = "border border-white/[.10] bg-white/[.045] shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl";
