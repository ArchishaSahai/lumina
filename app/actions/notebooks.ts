"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { notebookInputSchema, serializeNotebook } from "@/lib/notebooks";
import { prisma } from "@/lib/prisma";

async function getAuthenticatedUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to manage notebooks.");
  return userId;
}

export async function getUserNotebooks() {
  const userId = await getAuthenticatedUserId();
  const notebooks = await prisma.notebook.findMany({ where: { userId }, include: { _count: { select: { sources: true } } }, orderBy: { updatedAt: "desc" } });
  return notebooks.map(serializeNotebook);
}

export async function getNotebookById(id: string) {
  const userId = await getAuthenticatedUserId();
  const notebook = await prisma.notebook.findFirst({ where: { id, userId } });
  return notebook ? serializeNotebook(notebook) : null;
}

export async function createNotebook(input: unknown) {
  const userId = await getAuthenticatedUserId();
  const { title, description } = notebookInputSchema.parse(input);
  const notebook = await prisma.notebook.create({ data: { title, description: description || "A fresh space for the ideas you want to keep.", userId } });
  revalidatePath("/dashboard");
  return serializeNotebook(notebook);
}

export async function renameNotebook(id: string, input: unknown) {
  const userId = await getAuthenticatedUserId();
  const { title, description } = notebookInputSchema.parse(input);
  const result = await prisma.notebook.updateMany({ where: { id, userId }, data: { title, ...(description !== undefined && { description }) } });
  if (result.count === 0) notFound();
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/notebooks/${id}`);
}

export async function deleteNotebook(id: string) {
  const userId = await getAuthenticatedUserId();
  const result = await prisma.notebook.deleteMany({ where: { id, userId } });
  if (result.count === 0) notFound();
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/notebooks/${id}`);
}
