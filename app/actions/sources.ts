"use server";

import path from "node:path";
import { auth } from "@clerk/nextjs/server";
import { SourceStatus, SourceType } from "@/lib/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { serializeSource } from "@/lib/sources";
import { prisma } from "@/lib/prisma";
import { deleteFile, saveFile } from "@/lib/storage";
import { processSource } from "@/lib/ingestion/pipeline";
import { removeChunksFromPinecone } from "@/lib/ai/rag";

const urlSchema = z.object({ url: z.string().trim().url("Enter a valid URL."), title: z.string().trim().max(160).optional() });
const fileTypes = { ".pdf": SourceType.PDF, ".md": SourceType.MARKDOWN, ".markdown": SourceType.MARKDOWN, ".txt": SourceType.TEXT, ".vtt": SourceType.VTT } as const;

async function getOwnedNotebook(notebookId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to add sources.");
  const notebook = await prisma.notebook.findFirst({ where: { id: notebookId, userId } });
  if (!notebook) throw new Error("Notebook not found.");
  return notebook;
}

function refreshNotebook(notebookId: string) {
  revalidatePath(`/dashboard/notebooks/${notebookId}`);
  revalidatePath("/dashboard");
}

function processSourceInBackground(sourceId: string, notebookId: string) {
  after(async () => {
    try {
      await processSource(sourceId);
      await prisma.notebook.update({ where: { id: notebookId }, data: { updatedAt: new Date() } });
    } finally {
      refreshNotebook(notebookId);
    }
  });
}

export async function getNotebookSources(notebookId: string) {
  await getOwnedNotebook(notebookId);
  const sources = await prisma.source.findMany({ where: { notebookId }, orderBy: { createdAt: "desc" } });
  return sources.map(serializeSource);
}

export async function uploadSourceFile(notebookId: string, formData: FormData) {
  await getOwnedNotebook(notebookId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Files must be 25 MB or smaller.");

  const extension = path.extname(file.name).toLowerCase() as keyof typeof fileTypes;
  const type = fileTypes[extension];
  if (!type) throw new Error("Upload a PDF, Markdown, TXT, or VTT file.");

  const source = await prisma.source.create({ data: { notebookId, title: file.name, type, status: SourceStatus.UPLOADING } });
  try {
    const storedFile = await saveFile(file, notebookId);
    const stored = await prisma.source.update({ where: { id: source.id }, data: { filePath: storedFile.path, status: SourceStatus.PROCESSING, processingError: null } });
    processSourceInBackground(source.id, notebookId);
    refreshNotebook(notebookId);
    return serializeSource(stored);
  } catch (error) {
    await prisma.source.update({ where: { id: source.id }, data: { status: SourceStatus.FAILED } });
    refreshNotebook(notebookId);
    throw error;
  }
}

export async function addUrlSource(notebookId: string, input: unknown) {
  const notebook = await getOwnedNotebook(notebookId);
  const { url, title } = urlSchema.parse(input);
  const parsedUrl = new URL(url);
  const type = /(^|\.)youtu\.be$|(^|\.)youtube\.com$/i.test(parsedUrl.hostname) ? SourceType.YOUTUBE : SourceType.WEBSITE;
  const source = await prisma.source.create({ data: { notebookId, title: title || parsedUrl.hostname.replace(/^www\./, ""), type, url, status: SourceStatus.PROCESSING } });
  processSourceInBackground(source.id, notebook.id);
  refreshNotebook(notebookId);
  return serializeSource(source);
}

export async function deleteSource(sourceId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to delete sources.");

  const source = await prisma.source.findFirst({
    where: { id: sourceId, notebook: { userId } },
  });
  if (!source) throw new Error("Source not found.");

  if (source.filePath) await deleteFile(source.filePath);
  await removeChunksFromPinecone(source.id);
  await prisma.source.delete({ where: { id: source.id } });
  await prisma.notebook.update({ where: { id: source.notebookId }, data: { updatedAt: new Date() } });
  refreshNotebook(source.notebookId);
}

export async function retrySource(sourceId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to retry sources.");
  const source = await prisma.source.findFirst({ where: { id: sourceId, notebook: { userId } } });
  if (!source) throw new Error("Source not found.");
  await prisma.source.update({ where: { id: source.id }, data: { status: SourceStatus.PROCESSING, processingError: "stage:EXTRACTING" } });
  processSourceInBackground(source.id, source.notebookId);
  refreshNotebook(source.notebookId);
  return serializeSource({ ...source, status: SourceStatus.PROCESSING, processingError: "stage:EXTRACTING" });
}

export async function renameSource(sourceId: string, title: string) {
  const { userId } = await auth();
  const trimmedTitle = title.trim();
  if (!userId || !trimmedTitle) throw new Error("A source title is required.");
  const source = await prisma.source.findFirst({ where: { id: sourceId, notebook: { userId } } });
  if (!source) throw new Error("Source not found.");
  const updated = await prisma.source.update({ where: { id: source.id }, data: { title: trimmedTitle } });
  refreshNotebook(source.notebookId);
  return serializeSource(updated);
}
