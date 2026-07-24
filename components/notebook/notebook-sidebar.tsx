"use client";

import { motion } from "framer-motion";
import { ChevronLeft, MessageSquare, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Conversation } from "./notebook-workspace-data";

type Props = { title: string; conversations: Conversation[]; activeConversation: string | null; search: string; onSearch: (value: string) => void; onSelect: (id: string) => void; onNewChat: () => void };

export function NotebookSidebar({ title, conversations, activeConversation, search, onSearch, onSelect, onNewChat }: Props) {
  return <aside className="flex min-h-0 flex-col border-b border-white/[.08] bg-zinc-950/65 p-4 lg:border-r lg:border-b-0"><Link href="/dashboard" className="inline-flex w-fit items-center gap-1 rounded-md text-xs text-zinc-500 transition-colors hover:text-white"><ChevronLeft className="size-3.5" /> All notebooks</Link><h1 className="mt-4 truncate font-heading text-lg font-semibold tracking-[-.035em]">{title}</h1><Button onClick={onNewChat} className="mt-5 bg-violet-500 text-white shadow-[0_0_22px_rgba(139,92,246,.22)] hover:bg-violet-400"><Plus className="size-4" /> New chat</Button><div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" /><Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search conversations" className="h-9 border-white/[.09] bg-white/[.04] pl-9 text-xs text-white placeholder:text-zinc-600" /></div><p className="mt-6 text-[11px] font-semibold uppercase tracking-[.16em] text-zinc-500">Recent conversations</p><nav className="mt-2 min-h-0 space-y-1 overflow-y-auto pr-1">{conversations.map((conversation, index) => <motion.button key={conversation.id} type="button" onClick={() => onSelect(conversation.id)} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className={`group flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${activeConversation === conversation.id ? "bg-violet-400/[.12] text-white" : "text-zinc-400 hover:bg-white/[.05] hover:text-zinc-200"}`}><MessageSquare className={`mt-0.5 size-4 shrink-0 ${activeConversation === conversation.id ? "text-violet-300" : "text-zinc-600 group-hover:text-violet-300"}`} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{conversation.title}</span><span className="mt-1 block truncate text-xs text-zinc-500">{conversation.preview}</span></span><span className="pt-0.5 text-[10px] text-zinc-600">{conversation.updatedAt}</span></motion.button>)}</nav></aside>;
}
