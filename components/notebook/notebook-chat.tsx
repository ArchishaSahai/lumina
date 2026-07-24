"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ChatBubble } from "./chat-bubble";
import { ChatInput } from "./chat-input";
import type { ChatMessage } from "./notebook-workspace-data";
import { TypingIndicator } from "./typing-indicator";

type Props = { messages: ChatMessage[]; hasSources: boolean };

export function NotebookChat({ messages, hasSources }: Props) {
  const isEmpty = messages.length === 0;

  return (
    <main className="flex min-h-[580px] min-w-0 flex-col bg-black/35">
      <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-300">Chat</p>
          <p className="mt-1 text-sm text-zinc-500">
            {hasSources ? "Grounded in your notebook sources" : "Add sources to ground your responses"}
          </p>
        </div>
        <span className="rounded-full border border-violet-300/15 bg-violet-400/[.08] px-2.5 py-1 text-xs text-violet-200">
          {isEmpty ? "Ready" : "In context"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.section key="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
              <div className="grid size-16 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/[.1] text-violet-300 shadow-[0_0_40px_rgba(139,92,246,.16)]"><Sparkles className="size-7" /></div>
              <h2 className="mt-6 font-heading text-2xl font-semibold tracking-[-.04em]">{hasSources ? "What would you like to explore?" : "Add sources to begin exploring"}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{hasSources ? "Ask a question, compare ideas across your sources, or start outlining your next insight." : "Upload a document, video, or note from the source panel to give this conversation context."}</p>
              {hasSources && <div className="mt-7 flex flex-wrap justify-center gap-2">{["Summarize key concepts", "Find related ideas", "Create a study guide"].map((prompt) => <button type="button" key={prompt} className="cursor-pointer rounded-full border border-white/[.1] bg-white/[.035] px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-violet-300/30 hover:bg-violet-400/[.08] hover:text-white">{prompt}</button>)}</div>}
            </motion.section>
          ) : (
            <motion.div key="messages" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }} className="mx-auto flex max-w-3xl flex-col gap-7">
              {messages.map((message) => <ChatBubble key={message.id} message={message} />)}
              {messages.some((message) => message.streaming) && <TypingIndicator />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="px-5 pb-5 sm:px-8 sm:pb-7"><div className="mx-auto max-w-3xl"><ChatInput /><p className="mt-3 text-center text-[11px] text-zinc-600">Lumina can make mistakes. Review important details against your sources.</p></div></div>
    </main>
  );
}
