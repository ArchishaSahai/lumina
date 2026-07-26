"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
type MessageRole = "USER" | "ASSISTANT";

type ConversationRecord = { id: string; notebookId: string; title: string; createdAt: Date; updatedAt: Date; messages: Array<{ id: string; conversationId: string; role: MessageRole; content: string; citations: unknown; createdAt: Date; updatedAt: Date }> };
type ChatDb = {
  notebook: { findFirst(args: { where: { id: string; userId: string } }): Promise<unknown> };
  conversation: {
    findMany(args: unknown): Promise<ConversationRecord[]>;
    findFirst(args: { where: { id: string } }): Promise<ConversationRecord | null>;
    create(args: { data: { notebookId: string; title: string; type?: "NOTEBOOK" | "ROADMAP" } }): Promise<ConversationRecord>;
    update(args: { where: { id: string }; data: { title?: string; updatedAt?: Date } }): Promise<ConversationRecord>;
    delete(args: { where: { id: string } }): Promise<ConversationRecord>;
  };
  message: { create(args: { data: { conversationId: string; role: MessageRole; content: string; citations?: unknown } }): Promise<unknown> };
};

const db = prisma as unknown as ChatDb;

async function getOwnedNotebook(notebookId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in.");
  const notebook = await db.notebook.findFirst({ where: { id: notebookId, userId } });
  if (!notebook) throw new Error("Notebook not found.");
  return notebook;
}

export async function listNotebookConversations(notebookId: string, type: "NOTEBOOK" | "ROADMAP" = "NOTEBOOK") {
  await getOwnedNotebook(notebookId);
  return db.conversation.findMany({ where: { notebookId, type }, orderBy: { updatedAt: "desc" }, include: { messages: { orderBy: { createdAt: "asc" } } } });
}

export async function createConversation(notebookId: string, title = "Untitled chat", type: "NOTEBOOK" | "ROADMAP" = "NOTEBOOK") {
  await getOwnedNotebook(notebookId);
  const conversation = await db.conversation.create({ data: { notebookId, title, type } });
  revalidatePath(`/dashboard/notebooks/${notebookId}`);
  return conversation;
}

function summarizePrompt(prompt: string) {
  const words = prompt
    .trim()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  return words.join(" ") || "Untitled chat";
}

export async function createConversationForPrompt(notebookId: string, prompt: string, type: "NOTEBOOK" | "ROADMAP" = "NOTEBOOK") {
  return createConversation(notebookId, summarizePrompt(prompt), type);
}

export async function renameConversation(conversationId: string, title: string) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error("A conversation title is required.");
  const existingConversation = await db.conversation.findFirst({ where: { id: conversationId } });
  if (!existingConversation) throw new Error("Conversation not found.");
  await getOwnedNotebook(existingConversation.notebookId);
  const conversation = await db.conversation.update({ where: { id: conversationId }, data: { title: trimmedTitle } });
  revalidatePath(`/dashboard/notebooks/${conversation.notebookId}`);
  return conversation;
}

export async function titleConversationFromPrompt(conversationId: string, prompt: string) {
  return renameConversation(conversationId, summarizePrompt(prompt));
}

export async function deleteConversation(conversationId: string) {
  const existingConversation = await db.conversation.findFirst({ where: { id: conversationId } });
  if (!existingConversation) throw new Error("Conversation not found.");
  await getOwnedNotebook(existingConversation.notebookId);
  const conversation = await db.conversation.delete({ where: { id: conversationId } });
  revalidatePath(`/dashboard/notebooks/${conversation.notebookId}`);
  return conversation;
}

export async function appendMessage(conversationId: string, notebookId: string, role: MessageRole, content: string, citations?: unknown) {
  const message = await db.message.create({ data: { conversationId, role, content, citations } });
  await db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  revalidatePath(`/dashboard/notebooks/${notebookId}`);
  return message;
}
