import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildRetrievalPlan, rewriteQuery, searchNotebookChunks } from "@/lib/ai/rag";
import { validateGenerationGuardrails, validateRetrievalEvidence } from "@/lib/ai/guardrails";

const previewSchema = z.object({
  notebookId: z.string().min(1),
  prompt: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = previewSchema.parse(await request.json());
    const notebook = await prisma.notebook.findFirst({ where: { id: input.notebookId, userId }, include: { sources: { select: { title: true } } } });
    if (!notebook) return NextResponse.json({ error: "Notebook not found." }, { status: 404 });

    const plan = buildRetrievalPlan(input.prompt);
    const guardrailContext = {
      notebookId: input.notebookId,
      notebookTitle: notebook.title,
      notebookDescription: notebook.description,
      sourceTitles: notebook.sources.map((source) => source.title),
      useCase: "podcast" as const,
    };
    const preRetrievalDecision = validateGenerationGuardrails(input.prompt, guardrailContext);
    if (!preRetrievalDecision.allowed) return NextResponse.json({ error: preRetrievalDecision.message }, { status: 400 });

    const rewritten = await rewriteQuery(plan.query);
    const podcastPlan = { ...plan, query: rewritten, limit: Math.max(plan.limit, 8), topK: Math.max(plan.topK, 24), broad: true };
    const chunks = await searchNotebookChunks(input.notebookId, rewritten, podcastPlan);
    const retrievalDecision = validateRetrievalEvidence(chunks, guardrailContext, podcastPlan);
    if (!retrievalDecision.allowed) return NextResponse.json({ error: retrievalDecision.message }, { status: 400 });

    return NextResponse.json({
      topic: input.prompt,
      rewrittenQuery: rewritten,
      sources: chunks.map((chunk) => ({ sourceId: chunk.sourceId, sourceTitle: chunk.title, preview: chunk.text.slice(0, 180) })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Enter a podcast topic first." : "Unable to preview podcast sources." }, { status: 400 });
  }
}
