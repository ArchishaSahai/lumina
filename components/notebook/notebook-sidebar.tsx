"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, MessageSquare, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { NotebookConversation } from "./notebook-workspace-data";

type Props = {
  title: string;
  conversations: NotebookConversation[];
  activeConversation: string;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (conversationId: string, title: string) => Promise<void>;
  onDelete: (conversationId: string) => Promise<void>;
};

export function NotebookSidebar({ title, conversations, activeConversation, search, onSearch, onSelect, onNewChat, onRename, onDelete }: Props) {
  const [renameTarget, setRenameTarget] = useState<NotebookConversation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotebookConversation | null>(null);
  const [nextTitle, setNextTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const rename = () => {
    if (!renameTarget || !nextTitle.trim()) return;
    startTransition(async () => {
      await onRename(renameTarget.id, nextTitle);
      setRenameTarget(null);
    });
  };

  const remove = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    });
  };

  return (
    <aside className="flex min-h-0 flex-col border-b border-white/[.08] bg-zinc-950/65 p-4 lg:border-r lg:border-b-0">
      <Link href="/dashboard" className="inline-flex w-fit items-center gap-1 rounded-md text-xs text-zinc-500 transition-colors hover:text-white">
        <ChevronLeft className="size-3.5" /> All notebooks
      </Link>
      <h1 className="mt-4 line-clamp-2 font-heading text-lg font-semibold leading-snug tracking-[-.035em] text-white" title={title}>{title}</h1>
      <Button onClick={onNewChat} className="mt-5 bg-violet-500 text-white shadow-[0_0_22px_rgba(139,92,246,.22)] transition-all duration-200 hover:scale-[1.02] hover:bg-violet-400 active:scale-[0.98]">
        <Plus className="size-4" /> New chat
      </Button>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
        <Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search conversations" className="h-9 border-white/[.09] bg-white/[.04] pl-9 text-xs text-white placeholder:text-zinc-600" />
      </div>
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[.16em] text-zinc-500">Recent conversations</p>
      <nav className="mt-2 min-h-0 space-y-1.5 overflow-y-auto pr-1">
        {conversations.map((conversation, index) => (
          <motion.div
            key={conversation.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`group flex items-start gap-1 rounded-xl border px-1 transition-all duration-300 ${
              activeConversation === conversation.id
                ? "border-violet-400/30 bg-violet-500/15 text-white shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                : "border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[.04] hover:text-zinc-200"
            }`}
          >
            <button type="button" onClick={() => onSelect(conversation.id)} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-2 py-3 text-left">
              <MessageSquare className={`mt-0.5 size-4 shrink-0 transition-colors ${activeConversation === conversation.id ? "text-violet-300" : "text-zinc-600 group-hover:text-violet-300"}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{conversation.title}</span>
                <span className="mt-1 block truncate text-xs text-zinc-500">{conversation.messages[0]?.content ?? "Start a new thread"}</span>
              </span>
              <span className="pt-0.5 text-[10px] text-zinc-600">{new Date(conversation.updatedAt).toLocaleDateString()}</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label={`Manage ${conversation.title}`} className="mt-2 cursor-pointer rounded-md p-1 text-zinc-600 opacity-0 transition-colors hover:bg-white/[.08] hover:text-white focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100">
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border border-white/[.1] bg-zinc-950 p-1 text-white shadow-xl">
                <DropdownMenuItem onSelect={() => { setNextTitle(conversation.title); setRenameTarget(conversation); }} className="cursor-pointer text-zinc-300 focus:bg-white/[.08] focus:text-white">
                  <Pencil className="size-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[.08]" />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(conversation)} className="cursor-pointer">
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        ))}
      </nav>
      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => { if (!open && !isPending) setRenameTarget(null); }}>
        <DialogContent className="border-white/[.12] bg-zinc-950 p-6 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription className="text-zinc-400">Choose a clear title for this chat.</DialogDescription>
          </DialogHeader>
          <Input value={nextTitle} onChange={(event) => setNextTitle(event.target.value)} className="h-10 border-white/[.12] bg-white/[.04] text-white" autoFocus maxLength={120} />
          <DialogFooter className="-mx-6 -mb-6 rounded-b-2xl border-t border-white/[.08] bg-zinc-950 p-4">
            <Button type="button" variant="ghost" onClick={() => setRenameTarget(null)} disabled={isPending} className="text-zinc-300 hover:bg-white/[.08] hover:text-white">Cancel</Button>
            <Button type="button" onClick={rename} disabled={!nextTitle.trim() || isPending} className="bg-violet-500 text-white hover:bg-violet-400">{isPending ? "Saving..." : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !isPending) setDeleteTarget(null); }}>
        <DialogContent className="border-white/[.12] bg-zinc-950 p-6 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription className="leading-6 text-zinc-400">This permanently deletes <span className="font-medium text-zinc-200">{deleteTarget?.title}</span> and its messages. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-6 -mb-6 rounded-b-2xl border-t border-white/[.08] bg-zinc-950 p-4">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isPending} className="text-zinc-300 hover:bg-white/[.08] hover:text-white">Cancel</Button>
            <Button type="button" variant="destructive" onClick={remove} disabled={isPending}>{isPending ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
