"use client";

import { motion } from "framer-motion";
import { Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "./notebook-workspace-data";

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={isUser ? "ml-auto max-w-[85%] sm:max-w-[72%]" : "max-w-3xl"}
    >
      {!isUser && <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-violet-300">Lumina</p>}
      <div className={isUser ? "rounded-2xl rounded-br-md bg-violet-500 px-4 py-3 text-sm leading-6 text-white shadow-[0_10px_28px_rgba(109,40,217,.2)]" : "rounded-2xl rounded-tl-md border border-white/[.08] bg-white/[.045] px-4 py-3 text-sm leading-6 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]"}>
        {message.content}
        {message.streaming && <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-violet-300 align-[-3px]" aria-label="Response streaming" />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>{message.timestamp}</span>
        {!isUser && message.citations?.map((citation) => <button type="button" className="cursor-pointer rounded-full border border-violet-300/15 bg-violet-400/[.08] px-2 py-1 text-violet-200 transition-colors hover:bg-violet-400/[.16]" key={citation}>{citation}</button>)}
        {!isUser && <div className="ml-auto flex items-center gap-1"><Button variant="ghost" size="icon-xs" aria-label="Copy response" className="text-zinc-500 hover:bg-white/[.06] hover:text-white"><Copy className="size-3.5" /></Button><Button variant="ghost" size="icon-xs" aria-label="Regenerate response" className="text-zinc-500 hover:bg-white/[.06] hover:text-white"><RotateCcw className="size-3.5" /></Button></div>}
      </div>
    </motion.article>
  );
}
