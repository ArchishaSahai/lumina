"use client";

import { motion } from "framer-motion";
import { FileText, Code2, Globe2, Type, Video, Captions } from "lucide-react";
import { SectionHeading, fadeUp, glass } from "./shared";

const sources = [
  { title: "PDF", detail: "Research papers & notes", icon: FileText }, { title: "Website", detail: "Articles & saved links", icon: Globe2 },
  { title: "YouTube", detail: "Lectures & explainers", icon: Video }, { title: "Transcript", detail: "Meetings & recordings", icon: Captions },
  { title: "Plain text", detail: "Ideas & quick notes", icon: Type }, { title: "GitHub repo", detail: "Codebases & docs", icon: Code2 },
];

export function UploadSection() {
 return <section id="pricing" className="relative px-4 py-24 sm:px-6 sm:py-32"><div className="absolute inset-x-0 top-1/2 -z-10 mx-auto h-80 max-w-3xl bg-violet-600/[.08] blur-[120px]" />
  <SectionHeading eyebrow="Bring your own context" title="Upload anything worth remembering." copy="Every source becomes part of a connected, searchable workspace that gets smarter as you add to it." />
  <motion.div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" initial="hidden" whileInView="visible" viewport={{ once: true, amount: .15 }} variants={{ visible: { transition: { delayChildren: .12, staggerChildren: .16 } } }}>
    {sources.map(({ title, detail, icon: Icon }) => <motion.div key={title} variants={fadeUp} whileHover={{ y: -5 }} className={`${glass} group rounded-2xl p-4 transition-colors hover:border-violet-400/40 hover:bg-violet-400/[.08] sm:p-5`}><span className="mb-8 grid size-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300 transition-all group-hover:bg-violet-500 group-hover:text-white group-hover:shadow-[0_0_22px_rgba(139,92,246,.5)]"><Icon className="size-5" /></span><h3 className="text-sm font-medium text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p></motion.div>)}
  </motion.div>
 </section>;
}
