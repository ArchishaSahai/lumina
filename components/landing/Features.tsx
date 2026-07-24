"use client";

import { motion } from "framer-motion";
import { BookOpen, FileUp, GitFork, MessageSquareText, Quote, Search, Sparkles } from "lucide-react";
import { SectionHeading, fadeUp, glass } from "./shared";

const features = [
 { name: "AI chat", copy: "Ask, explore, and think out loud with every source in view.", icon: MessageSquareText, span: "md:col-span-2" },
 { name: "Source citations", copy: "Answers grounded in the exact moment that matters.", icon: Quote },
 { name: "Notebook workspace", copy: "A focused home for every subject and project.", icon: BookOpen },
 { name: "Podcast generator", copy: "Turn long reads into a private audio briefing.", icon: Sparkles },
 { name: "Roadmaps", copy: "Turn a knowledge gap into a path forward.", icon: GitFork },
 { name: "Semantic search", copy: "Find ideas, not just keywords.", icon: Search, span: "md:col-span-2" },
 { name: "Multi-source upload", copy: "Bring PDFs, videos, links, and repositories into one place.", icon: FileUp },
];

export function Features() { return <section id="features" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32"><SectionHeading eyebrow="Made for curious minds" title="Tools that meet you at the speed of thought." copy="Lumina turns a pile of material into an active learning system—without losing the trail back to the source." />
 <motion.div className="mx-auto mt-12 grid max-w-5xl gap-3 md:grid-cols-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: .1 }} variants={{ visible: { transition: { delayChildren: .12, staggerChildren: .16 } } }}>{features.map(({name,copy,icon:Icon,span}) => <motion.article key={name} variants={fadeUp} whileHover={{ y: -4 }} className={`${glass} ${span ?? ""} group relative overflow-hidden rounded-2xl p-5 transition-colors hover:border-violet-400/35 sm:p-6`}><div className="absolute -right-12 -top-12 size-28 rounded-full bg-violet-500/0 blur-3xl transition-colors group-hover:bg-violet-500/20" /><span className="grid size-10 place-items-center rounded-xl border border-violet-300/10 bg-violet-400/[.09] text-violet-300"><Icon className="size-5" /></span><h3 className="mt-7 text-base font-medium tracking-tight">{name}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-zinc-400">{copy}</p></motion.article>)}</motion.div>
 </section>; }
