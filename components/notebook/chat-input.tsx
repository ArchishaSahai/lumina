"use client";

import { Paperclip, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatInput() {
  return (
    <div className="rounded-2xl border border-white/[.1] bg-zinc-950/85 p-2 shadow-[0_-12px_40px_rgba(0,0,0,.2)] backdrop-blur-xl">
      <textarea className="min-h-20 w-full resize-none bg-transparent px-3 pt-2 text-sm text-white outline-none placeholder:text-zinc-600" placeholder="Ask anything about this notebook..." aria-label="Ask a question" />
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <Button variant="ghost" size="icon-sm" aria-label="Attach source" className="text-zinc-400 hover:bg-white/[.07] hover:text-white"><Paperclip className="size-4" /></Button>
        <div className="flex items-center gap-2"><Button variant="ghost" size="sm" disabled className="text-zinc-600"><Square className="size-3" /> Stop</Button><Button size="icon-sm" aria-label="Send message" className="bg-violet-500 text-white hover:bg-violet-400"><Send className="size-4" /></Button></div>
      </div>
    </div>
  );
}
