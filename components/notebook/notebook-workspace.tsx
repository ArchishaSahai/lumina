"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ContextPanel } from "./context-panel";
import { NotebookChat } from "./notebook-chat";
import { NotebookSidebar } from "./notebook-sidebar";
import { conversations, messagesByConversation } from "./notebook-workspace-data";
import type { NotebookSource } from "@/lib/sources";

type Props = { notebookId: string; title: string; description: string; sources: NotebookSource[]; updatedAt: string };

export function NotebookWorkspace({ notebookId, title, description, sources, updatedAt }: Props) {
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const filteredConversations = useMemo(() => conversations.filter((conversation) => conversation.title.toLowerCase().includes(search.toLowerCase())), [search]);
  const hasSources = sources.length > 0;
  const messages = hasSources && activeConversation ? (messagesByConversation[activeConversation] ?? []) : [];

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="min-h-svh bg-black text-white"><div className="mx-auto flex min-h-svh max-w-[1800px] flex-col lg:h-svh lg:max-h-svh lg:grid lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_330px]"><NotebookSidebar title={title} conversations={filteredConversations} activeConversation={activeConversation} search={search} onSearch={setSearch} onSelect={setActiveConversation} onNewChat={() => setActiveConversation(null)} /><NotebookChat messages={messages} hasSources={hasSources} /><ContextPanel notebookId={notebookId} title={title} description={description} sources={sources} updatedAt={updatedAt} /></div></motion.div>;
}
