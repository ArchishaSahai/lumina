"use client";

import { motion } from "framer-motion";
import { Clock3, MessageSquareText, MoreHorizontal, Paperclip } from "lucide-react";
import { SectionHeading, fadeUp, glass } from "./shared";

const notebooks = [
 { title: "Machine Learning Crash Course", sources: "12 sources", chats: "36 chats", updated: "Updated 2h ago", style: "from-violet-500/85 via-fuchsia-700/50 to-zinc-900", mark: "∿" },
 { title: "System Design Interview", sources: "18 sources", chats: "24 chats", updated: "Updated yesterday", style: "from-blue-500/75 via-violet-700/60 to-zinc-900", mark: "◫" },
 { title: "Operating Systems", sources: "9 sources", chats: "17 chats", updated: "Updated 3d ago", style: "from-fuchsia-500/70 via-purple-800/55 to-zinc-900", mark: "◌" },
];
export function FeaturedNotebooks() { return <section className="relative px-4 py-24 sm:px-6 sm:py-32"><div className="absolute right-0 top-0 -z-10 h-80 w-1/3 bg-fuchsia-600/[.08] blur-[100px]" /><SectionHeading eyebrow="A place for every rabbit hole" title="Your knowledge, beautifully organized." />
 <motion.div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3" initial="hidden" whileInView="visible" viewport={{once:true,amount:.15}} variants={{visible:{transition:{delayChildren:.14,staggerChildren:.2}}}}>{notebooks.map((notebook) => <motion.article key={notebook.title} variants={fadeUp} whileHover={{ y: -7 }} className={`${glass} group overflow-hidden rounded-2xl transition-colors hover:border-violet-400/45`}><div className={`relative h-44 overflow-hidden bg-gradient-to-br ${notebook.style} p-5`}><div className="absolute -bottom-9 -right-4 text-[150px] leading-none text-white/[.09] transition-transform duration-500 group-hover:scale-110">{notebook.mark}</div><div className="relative flex justify-between"><span className="rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-[10px] font-medium text-white/80">NOTEBOOK</span><MoreHorizontal className="size-5 text-white/70" /></div><h3 className="relative mt-12 max-w-[12rem] text-xl font-medium tracking-[-.04em]">{notebook.title}</h3></div><div className="p-5"><div className="flex gap-4 text-xs text-zinc-400"><span className="flex items-center gap-1.5"><Paperclip className="size-3.5" />{notebook.sources}</span><span className="flex items-center gap-1.5"><MessageSquareText className="size-3.5" />{notebook.chats}</span></div><p className="mt-5 flex items-center gap-1.5 text-xs text-zinc-500"><Clock3 className="size-3.5" />{notebook.updated}</p></div></motion.article>)}</motion.div>
 </section>; }
