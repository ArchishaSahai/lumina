"use client";

import { useState } from "react";
import { motion, useSpring } from "framer-motion";
import { ArrowRight, Code2, FileText, Globe2, Mic2, Play, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

const cards = [
  { name: "Research.pdf", type: "PDF", icon: FileText, pos: "left-[5%] top-[22%] sm:left-[16%]", delay: 0, duration: 17, amplitude: 18, drift: 10, rotation: -3, parallax: .2 },
  { name: "Design systems", type: "Website", icon: Globe2, pos: "right-[4%] top-[20%] sm:right-[15%]", delay: 2.1, duration: 19, amplitude: 16, drift: -12, rotation: 3, parallax: -.16 },
  { name: "Lecture 08", type: "YouTube", icon: Video, pos: "bottom-[14%] left-[12%] sm:left-[22%]", delay: 3.3, duration: 16.2, amplitude: 21, drift: 11, rotation: 2, parallax: .12 },
  { name: "lumina/core", type: "GitHub", icon: Code2, pos: "bottom-[12%] right-[12%] sm:right-[21%]", delay: .9, duration: 21.5, amplitude: 18, drift: -10, rotation: -2, parallax: -.13 },
  { name: "Weekly brief", type: "Podcast", icon: Mic2, pos: "right-[23%] top-[55%] hidden sm:flex", delay: 4.4, duration: 18.3, amplitude: 14, drift: 9, rotation: 2, parallax: -.09 },
];

export function Hero() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const x = useSpring(pointer.x, { stiffness: 45, damping: 18 });
  const y = useSpring(pointer.y, { stiffness: 45, damping: 18 });
  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({ x: (event.clientX - rect.left - rect.width / 2) / 34, y: (event.clientY - rect.top - rect.height / 2) / 34 });
  };

  return <section id="top" onPointerMove={handlePointerMove} onPointerLeave={() => setPointer({ x: 0, y: 0 })} className="relative isolate flex min-h-svh items-center overflow-visible px-4 pb-7 pt-28 sm:px-6 lg:pt-30">
    <div className="grid-fade absolute inset-0 -z-30 opacity-70" />
    <div className="hero-noise pointer-events-none absolute inset-0 -z-20" />
    <div className="hero-atmosphere absolute left-1/2 top-[46%] -z-20 -translate-x-1/2 -translate-y-1/2" />
    <div className="mx-auto w-full max-w-6xl text-center">
      <motion.div initial={{ opacity: 0, y: 14, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: .65 }} className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[.09] px-3 py-1.5 text-xs text-violet-200"><span className="size-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_#c4b5fd]" /> A calmer way to learn</motion.div>
      <motion.h1 initial={{ opacity: 0, y: 22, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: .8, delay: .1 }} className="font-heading mx-auto max-w-4xl text-balance text-4xl font-semibold tracking-[-.065em] sm:text-6xl lg:text-7xl lg:leading-[.98]">Your second brain for <span className="bg-gradient-to-b from-violet-100 to-violet-500 bg-clip-text text-transparent">everything you learn.</span></motion.h1>
      <motion.p initial={{ opacity: 0, y: 18, filter: "blur(5px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: .7, delay: .22 }} className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">Upload PDFs, YouTube videos, websites, GitHub repositories, transcripts and documents. Chat with your knowledge, create study roadmaps and understand everything faster with AI.</motion.p>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 160, damping: 19, delay: .35 }} className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Button size="lg" className="h-11 bg-violet-500 px-6 text-white shadow-[0_0_32px_rgba(139,92,246,.35)] transition-all hover:-translate-y-1 hover:bg-violet-400 hover:shadow-[0_14px_36px_rgba(139,92,246,.4)]">Start free <ArrowRight className="ml-2 size-4" /></Button><Button size="lg" variant="outline" className="h-11 border-white/[.15] bg-white/[.04] px-6 text-white transition-all hover:-translate-y-1 hover:bg-white/[.09]"><Play className="mr-2 size-4 fill-current" /> Watch demo</Button></motion.div>
      <motion.div style={{ x, y }} className="relative mx-auto mt-8 h-[230px] max-w-5xl sm:mt-10 sm:h-[270px]" aria-label="Lumina AI core surrounded by knowledge sources">
        <div className="core-aura absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(237,233,254,.3)_0%,rgba(167,139,250,.18)_25%,rgba(109,40,217,.08)_48%,transparent_72%)] blur-3xl sm:size-80" />
        <div className="core-breathe absolute left-1/2 top-1/2 size-52 rounded-full bg-[radial-gradient(circle,rgba(221,214,254,.5)_0%,rgba(139,92,246,.23)_30%,rgba(91,33,182,.08)_50%,transparent_70%)] blur-2xl sm:size-64" />
        <div className="core-haze absolute left-1/2 top-1/2 size-44 rounded-full bg-[linear-gradient(229deg,rgba(223,122,254,.42)_13%,transparent_35%,transparent_64%,rgba(129,74,200,.4)_88%)] blur-[10px] sm:size-52" />
        <div className="core-haze-reverse absolute left-1/2 top-1/2 size-36 rounded-full bg-[linear-gradient(141deg,rgba(223,122,254,.35)_13%,transparent_35%,transparent_64%,rgba(129,74,200,.35)_88%)] blur-[8px] sm:size-44" />
        <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center"><div className="core-ring size-44 rounded-full border border-dashed border-violet-300/30 sm:size-52" /></div>
        <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center"><div className="core-ring-reverse size-34 rounded-full border border-violet-200/30 sm:size-42" /></div>
        <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center"><div className="core-ring size-60 rounded-[48%] border border-violet-300/15 sm:size-72" /></div>
        {["left-1/2 top-[5%]", "left-[34%] top-[58%]", "right-[31%] top-[62%]", "right-[34%] top-[16%]", "left-[38%] top-[19%]", "right-[40%] top-[79%]", "left-[28%] top-[37%]", "right-[26%] top-[40%]"].map((position, index) => <motion.span key={position} className={`absolute ${position} size-1.5 rounded-full bg-violet-200 shadow-[0_0_13px_#c4b5fd]`} animate={{ y: [0, -8 - index % 4, 0], x: [0, index % 2 ? 5 : -5, 0], opacity: [.3, 1, .3] }} transition={{ duration: 8 + index * .75, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }} />)}
        <div className="core-pulse absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-100/25 sm:size-28" />
        <div className="absolute left-1/2 top-1/2 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-violet-200/35 bg-violet-400/15 shadow-[0_0_105px_rgba(139,92,246,.64),inset_0_0_42px_rgba(255,255,255,.16)] backdrop-blur-xl sm:size-28"><div className="grid size-16 place-items-center rounded-full bg-[conic-gradient(from_220deg,#3b0764,#7c3aed,#ddd6fe,#6d28d9,#3b0764)] p-px shadow-[0_0_54px_rgba(192,132,252,.82)] sm:size-[4.5rem]"><div className="grid size-full place-items-center rounded-full bg-[radial-gradient(circle_at_32%_25%,#ede9fe_0%,#a78bfa_23%,#6d28d9_66%,#21013b_100%)]"><span className="font-heading text-2xl font-semibold tracking-[-.15em] text-white">L</span></div></div></div>
        {cards.map(({ name, type, icon: Icon, pos, delay, duration, amplitude, drift, rotation, parallax }) => <motion.div key={type} className={`absolute ${pos}`} style={{ x: pointer.x * parallax, y: pointer.y * parallax }} transition={{ type: "spring", stiffness: 36, damping: 20 }}><motion.div className="rounded-xl border border-white/[.14] bg-zinc-950/70 p-2 text-left shadow-xl backdrop-blur-xl sm:p-2.5" initial={{ opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1, x: [0, drift, 0, -drift * .45, 0], y: [0, -amplitude, -amplitude * .35, amplitude * .3, 0], rotate: [rotation, rotation * -.25, rotation * .55, rotation * -.5, rotation] }} transition={{ opacity: { delay: .45 + delay * .08, duration: .7 }, scale: { delay: .45 + delay * .08, duration: .7 }, x: { delay, duration, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }, y: { delay, duration, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }, rotate: { delay, duration: duration * 1.18, repeat: Infinity, ease: "easeInOut" } }}><div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-md bg-violet-400/15 text-violet-300"><Icon className="size-3.5" /></span><div><p className="text-[10px] font-medium text-white sm:text-xs">{name}</p><p className="text-[9px] text-zinc-500">{type}</p></div></div></motion.div></motion.div>)}
      </motion.div>
    </div>
  </section>;
}
