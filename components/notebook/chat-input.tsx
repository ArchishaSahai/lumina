"use client";

import { Send, Square } from "lucide-react";
import type { ChangeEvent, KeyboardEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  input: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  isGenerating: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
};

export function ChatInput({ input, onChange, onSubmit, onStop, isGenerating, onKeyDown, placeholder }: Props) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/[.1] bg-zinc-950/85 p-2 shadow-[0_-12px_40px_rgba(0,0,0,.2)] backdrop-blur-xl">
      <textarea value={input} onChange={onChange} onKeyDown={onKeyDown} className="min-h-20 w-full resize-none bg-transparent px-3 pt-2 text-sm text-white outline-none placeholder:text-zinc-600" placeholder={placeholder} aria-label="Ask a question" />
      <div className="flex justify-end gap-2 px-1 pt-1">
        {isGenerating ? <Button type="button" variant="ghost" size="sm" onClick={onStop} className="text-zinc-200 hover:bg-white/[.07] hover:text-white"><Square className="size-3" /> Stop Generating</Button> : null}
        <Button type="submit" size="icon-sm" aria-label="Send message" className="bg-violet-500 text-white hover:bg-violet-400"><Send className="size-4" /></Button>
      </div>
    </form>
  );
}
