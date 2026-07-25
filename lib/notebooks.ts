import { z } from "zod";
import type { Notebook as PrismaNotebook } from "@/lib/generated/prisma/client";

export const notebookInputSchema = z.object({
  title: z.string().trim().min(1, "A notebook name is required.").max(120, "Notebook names can be at most 120 characters."),
  description: z.string().trim().max(500, "Descriptions can be at most 500 characters.").optional(),
});

export type Notebook = {
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeNotebook(notebook: PrismaNotebook): Notebook {
  return { ...notebook, createdAt: notebook.createdAt.toISOString(), updatedAt: notebook.updatedAt.toISOString() };
}

export function formatNotebookUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);
  const differenceInHours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3_600_000));

  if (differenceInHours < 1) return "just now";
  if (differenceInHours < 24) return `${differenceInHours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
