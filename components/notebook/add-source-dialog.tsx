"use client";

import { useState, useTransition } from "react";
import { FileUp, Link2, LoaderCircle, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { addUrlSource, uploadSourceFile } from "@/app/actions/sources";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NotebookSource } from "@/lib/sources";

type Props = { notebookId: string; open: boolean; onOpenChange: (open: boolean) => void; onSourceAdded: (source: NotebookSource) => void };

export function AddSourceDialog({ notebookId, open, onOpenChange, onSourceAdded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: { "application/pdf": [".pdf"], "text/markdown": [".md", ".markdown"], "text/plain": [".txt"], "text/vtt": [".vtt"] },
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024,
    disabled: isPending,
    onDropAccepted: ([acceptedFile]) => { setFile(acceptedFile); setError(""); },
    onDropRejected: (rejections) => { setFile(null); setError(rejections[0]?.errors[0]?.code === "file-too-large" ? "Files must be 25 MB or smaller." : "Upload a PDF, Markdown, TXT, or VTT file."); },
  });

  const finish = (source: NotebookSource) => { onSourceAdded(source); setUrl(""); setFile(null); setError(""); onOpenChange(false); };
  const upload = () => startTransition(async () => {
    if (!file) { setError("Choose a file to upload."); return; }
    try { setError(""); const data = new FormData(); data.set("file", file); const source = await uploadSourceFile(notebookId, data); finish(source); toast.success("Upload successful"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to upload this source."); }
  });
  const addUrl = () => startTransition(async () => {
    try { setError(""); const source = await addUrlSource(notebookId, { url }); finish(source); toast.success("Source added"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add this URL."); }
  });

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!isPending) onOpenChange(nextOpen); }}><DialogContent className="border-white/[.12] bg-zinc-950 p-6 text-white sm:max-w-md"><DialogHeader><DialogTitle>Add source</DialogTitle><DialogDescription className="text-zinc-400">Upload a document or add a web source to this notebook.</DialogDescription></DialogHeader><Tabs defaultValue="file" onValueChange={() => setError("")}><TabsList className="w-full bg-white/[.06]"><TabsTrigger value="file" disabled={isPending} className="text-zinc-400 data-active:bg-violet-500 data-active:text-white"><Upload /> File</TabsTrigger><TabsTrigger value="url" disabled={isPending} className="text-zinc-400 data-active:bg-violet-500 data-active:text-white"><Link2 /> URL</TabsTrigger></TabsList><TabsContent value="file" className="pt-4"><div {...getRootProps()} className={`cursor-pointer rounded-xl border border-dashed px-5 py-8 text-center transition-colors ${isDragReject ? "border-rose-400/60 bg-rose-400/[.06]" : isDragActive ? "border-violet-300/60 bg-violet-400/[.1]" : "border-white/[.14] bg-white/[.025] hover:border-violet-300/40 hover:bg-violet-400/[.06]"}`}><input {...getInputProps()} /><span className="mx-auto grid size-10 place-items-center rounded-xl bg-violet-400/[.1] text-violet-300">{isPending ? <LoaderCircle className="size-5 animate-spin" /> : <FileUp className="size-5" />}</span><p className="mt-3 text-sm font-medium text-zinc-200">{isPending ? "Uploading source..." : file ? file.name : isDragActive ? "Drop your file here" : "Drag and drop or click to browse"}</p><p className="mt-1 text-xs text-zinc-500">PDF, Markdown, TXT, or VTT · up to 25 MB</p></div>{isPending && <Progress value={65} className="mt-3 h-1.5 bg-white/[.08] [&_[data-slot=progress-indicator]]:bg-violet-400" />}<Button type="button" onClick={upload} disabled={!file || isPending} className="mt-5 w-full bg-violet-500 text-white hover:bg-violet-400">{isPending ? <><LoaderCircle className="animate-spin" /> Uploading...</> : "Upload source"}</Button></TabsContent><TabsContent value="url" className="pt-4"><label className="grid gap-2 text-sm font-medium">YouTube or website URL<Input value={url} disabled={isPending} onChange={(event) => { setUrl(event.target.value); setError(""); }} placeholder="https://example.com" type="url" className="h-11 border-white/[.12] bg-white/[.04] text-white" /></label><Button type="button" onClick={addUrl} disabled={!url.trim() || isPending} className="mt-5 w-full bg-violet-500 text-white hover:bg-violet-400">{isPending ? "Adding..." : "Add URL"}</Button></TabsContent></Tabs>{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}<DialogFooter className="-mx-6 -mb-6 border-white/[.08] bg-white/[.025] p-4"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending} className="text-zinc-300 hover:bg-white/[.08] hover:text-white">Cancel</Button></DialogFooter></DialogContent></Dialog>;
}
