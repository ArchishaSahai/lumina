"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateNotebookDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (name: string, description: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createNotebook = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onCreate(trimmedName, description.trim() || "A fresh space for the ideas you want to keep.");
    setName("");
    setDescription("");
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="border-white/[.12] bg-zinc-950 p-6 text-white sm:max-w-md"><DialogHeader><DialogTitle>Create a notebook</DialogTitle><DialogDescription className="text-zinc-400">Give this space a clear name. You can add sources once it is created.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><label className="grid gap-2 text-sm font-medium">Notebook Name<Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Design systems" className="h-10 border-white/[.12] bg-white/[.04] text-white placeholder:text-zinc-600" autoFocus /></label><label className="grid gap-2 text-sm font-medium">Description<Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What do you want to understand?" className="min-h-24 border-white/[.12] bg-white/[.04] text-white placeholder:text-zinc-600" /></label></div><DialogFooter className="-mx-6 -mb-6 border-white/[.08] bg-white/[.025] p-4"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-300 hover:bg-white/[.08] hover:text-white">Cancel</Button><Button type="button" onClick={createNotebook} disabled={!name.trim()} className="bg-violet-500 text-white hover:bg-violet-400">Create notebook</Button></DialogFooter></DialogContent></Dialog>;
}
