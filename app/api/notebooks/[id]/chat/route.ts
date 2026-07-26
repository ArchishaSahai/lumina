import { streamText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildGroundedPrompt, buildRetrievalPlan, listNotebookSources, rewriteQuery, searchNotebookChunks, selectCitationsForAnswer } from "@/lib/ai/rag";
import { getChatModel } from "@/lib/ai/embeddings";
import { appendMessage, createConversation } from "@/app/actions/chat";
import { z } from "zod";
import { sourceTypeLabel } from "@/lib/sources";

const chatRequestSchema = z.object({
  conversationId: z.string().optional(),
  question: z.string().trim().min(1),
  roadmapContext: z.object({
    activePhaseTitle: z.string().optional(),
    selectedTask: z.string().optional(),
    learningFocus: z.object({
      primarySkill: z.string(),
      excludedTopics: z.array(z.string())
    }).nullable().optional(),
  }).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: notebookId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const notebook = await prisma.notebook.findFirst({ where: { id: notebookId, userId } });
  if (!notebook) return NextResponse.json({ error: "Notebook not found." }, { status: 404 });

  const input = chatRequestSchema.parse(await request.json());
  const conversationType = input.roadmapContext ? "ROADMAP" : "NOTEBOOK";
  const conversation = input.conversationId ? await prisma.conversation.findFirst({ where: { id: input.conversationId, notebookId, type: conversationType } }) : await createConversation(notebookId, input.question.slice(0, 80), conversationType);
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const previousMessages = await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "asc" }, take: 12 });
  const retrievalPlan = buildRetrievalPlan(input.question, previousMessages.map((message) => ({ role: message.role.toLowerCase(), content: message.content })));
  await appendMessage(conversation.id, notebookId, "USER", input.question);

  if (retrievalPlan.intent === "list_sources") {
    const sources = await listNotebookSources(notebookId);
    const answer = sources.length ? `You have uploaded ${sources.length} source${sources.length === 1 ? "" : "s"}:\n\n${sources.map((source, index) => `${index + 1}. ${source.title} (${sourceTypeLabel(source.type)}, ${source.status.toLowerCase()}${source.url ? `, ${source.url}` : ""})`).join("\n")}` : "You have not uploaded any sources to this notebook yet.";
    await appendMessage(conversation.id, notebookId, "ASSISTANT", answer, []);
    const response = new Response(answer, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    response.headers.set("x-lumina-citations", encodeURIComponent(JSON.stringify([])));
    return response;
  }

  let rewritten = await rewriteQuery(retrievalPlan.query);
  
  if (input.roadmapContext) {
    const phaseStr = input.roadmapContext.activePhaseTitle || "";
    const taskStr = input.roadmapContext.selectedTask || "";
    const focusStr = input.roadmapContext.learningFocus ? `Focus: ${input.roadmapContext.learningFocus.primarySkill}. Ignore: ${input.roadmapContext.learningFocus.excludedTopics.join(",")}.` : "";
    rewritten = `${focusStr} ${phaseStr} ${taskStr} ${rewritten}`.trim();
  }

  const retrieved = await searchNotebookChunks(notebookId, rewritten, retrievalPlan);
  let prompt = buildGroundedPrompt(rewritten, retrieved, retrievalPlan.intent);

  if (input.roadmapContext) {
    const phaseStr = input.roadmapContext.activePhaseTitle ? `Active Phase: ${input.roadmapContext.activePhaseTitle}` : "";
    const taskStr = input.roadmapContext.selectedTask ? `Selected Task: ${input.roadmapContext.selectedTask}` : "";
    prompt = `[ROADMAP ASSISTANT MODE]\n${phaseStr}\n${taskStr}\nINSTRUCTIONS:\n- Keep responses concise (3-8 lines unless asked for more).\n- Answer using roadmap context and notebook sources. Never answer from roadmap metadata alone.\n- Explain WHY.\n- Reference notebook sources naturally (mention timestamps/pages).\n- If the answer isn't supported by notebook sources, explicitly say so instead of hallucinating.\n\n${prompt}`;
  }

  const result = streamText({
    model: getChatModel(),
    prompt,
    onFinish: async ({ text }) => {
      await appendMessage(conversation.id, notebookId, "ASSISTANT", text, selectCitationsForAnswer(text, retrieved).map((chunk) => ({ sourceId: chunk.sourceId, sourceTitle: chunk.title, sourceType: chunk.source.type, sourceUrl: chunk.source.url, chunkId: chunk.id, preview: chunk.text.slice(0, 220), timestampStartMs: chunk.timestampStartMs, timestampEndMs: chunk.timestampEndMs })));
    },
  });

  const response = result.toTextStreamResponse();
  const headerCitations = selectCitationsForAnswer(rewritten, retrieved);
  const citations = headerCitations.slice(0, retrievalPlan.broad ? 5 : 3).map((chunk) => ({ sourceId: chunk.sourceId, sourceTitle: chunk.title, sourceType: chunk.source.type, sourceUrl: chunk.source.url, chunkId: chunk.id, preview: chunk.text.slice(0, 220), timestampStartMs: chunk.timestampStartMs, timestampEndMs: chunk.timestampEndMs }));
  response.headers.set("x-lumina-citations", encodeURIComponent(JSON.stringify(citations)));
  response.headers.set("x-lumina-conversation-id", conversation.id);
  return response;
}
