import { generateText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildRetrievalPlan, rewriteQuery, searchNotebookChunks, selectCitationsForAnswer } from "@/lib/ai/rag";
import { validatePreRetrievalGuardrails, validateRetrievalEvidence } from "@/lib/ai/guardrails";
import { getChatModel } from "@/lib/ai/embeddings";
import { buildPodcastPrompt, generatePodcastAudio, normalizeVoiceAssignments, parsePodcastTitleAndTranscript } from "@/lib/podcasts";
import { z } from "zod";

const voiceSchema = z.enum(["Atlas", "Orion", "Nova", "Luna"]);

const podcastRequestSchema = z.object({
  notebookId: z.string().min(1),
  podcastId: z.string().min(1),
  prompt: z.string().trim().min(1),
  duration: z.number().min(3).max(10),
  voiceAssignments: z.array(z.object({ speaker: z.string(), voice: voiceSchema })).min(1).max(3),
  speakers: z.number().min(1).max(3),
  settings: z.object({
    focus: z.enum(["entire_notebook", "current_roadmap", "learning_focus"]),
    tone: z.enum(["conversational", "professor", "beginner_friendly", "interview_prep", "storytelling"]),
    genre: z.enum(["educational", "interview", "debate", "news_style", "casual_conversation"]),
    targetAudience: z.enum(["beginner", "intermediate", "advanced"]),
  }),
});

async function markPodcastFailed(podcastId: string | undefined, error: string) {
  if (!podcastId) return;
  await prisma.podcast.update({
    where: { id: podcastId },
    data: { status: "FAILED", generationStatus: "FAILED", generationStage: "Failed", generationError: error },
  }).catch(() => undefined);
}

async function updatePodcastStage(podcastId: string, generationStage: string) {
  await prisma.podcast.update({
    where: { id: podcastId },
    data: { generationStage, generationStatus: "GENERATING", status: "GENERATING" },
  });
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return "Invalid podcast request. Check duration, speakers, and voice selections.";
  if (error instanceof Error) return error.message;
  return "Podcast generation failed unexpectedly.";
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  let podcastId: string | undefined;

  try {
    body = await request.json();
    const input = podcastRequestSchema.parse(body);
    podcastId = input.podcastId;

    const notebook = await prisma.notebook.findFirst({ where: { id: input.notebookId, userId }, include: { sources: { select: { title: true } } } });
    if (!notebook) return NextResponse.json({ error: "Notebook not found." }, { status: 404 });

    const podcast = await prisma.podcast.findFirst({ where: { id: input.podcastId, userId, notebookId: input.notebookId } });
    if (!podcast) return NextResponse.json({ error: "Podcast not found." }, { status: 404 });

    const voiceAssignments = normalizeVoiceAssignments(input.speakers, input.voiceAssignments);
    await prisma.podcast.update({
      where: { id: input.podcastId },
      data: {
        status: "GENERATING",
        generationStatus: "GENERATING",
        generationStage: "Preparing Sources",
        generationError: null,
        voiceAssignments: JSON.parse(JSON.stringify(voiceAssignments)),
        voice: voiceAssignments[0]?.voice ?? "Nova",
        speakers: input.speakers,
        speakerCount: input.speakers,
        tone: input.settings.tone,
        genre: input.settings.genre,
        audience: input.settings.targetAudience,
      },
    });

    await updatePodcastStage(input.podcastId, "Preparing Sources");
    const plan = buildRetrievalPlan(input.prompt);
    const guardrailContext = {
      notebookId: input.notebookId,
      notebookTitle: notebook.title,
      notebookDescription: notebook.description,
      sourceTitles: notebook.sources.map((source) => source.title),
      useCase: "podcast" as const,
    };
    const preRetrievalDecision = validatePreRetrievalGuardrails(input.prompt, guardrailContext, plan);
    if (!preRetrievalDecision.allowed) throw new Error(preRetrievalDecision.message);

    const rewritten = await rewriteQuery(plan.query);
    const podcastPlan = { ...plan, query: rewritten, limit: Math.max(plan.limit, 8), topK: Math.max(plan.topK, 24), broad: true };
    const retrieved = await searchNotebookChunks(input.notebookId, rewritten, podcastPlan);
    const retrievalDecision = validateRetrievalEvidence(retrieved, guardrailContext, podcastPlan);
    if (!retrievalDecision.allowed) throw new Error(retrievalDecision.message);

    await updatePodcastStage(input.podcastId, "Writing Script");
    const podcastPrompt = buildPodcastPrompt(retrieved, input.prompt, input.duration, input.speakers, input.settings, voiceAssignments);
    const { text } = await generateText({ model: getChatModel(), prompt: podcastPrompt });
    const { title, transcript } = parsePodcastTitleAndTranscript(text, podcast.title);
    if (!transcript) throw new Error("The script generator returned an empty transcript.");

    const citations = selectCitationsForAnswer(transcript, retrieved);
    const sourceChunks = citations.length ? citations : retrieved.slice(0, 3);
    const sources = sourceChunks.map((chunk) => ({ sourceId: chunk.sourceId, sourceTitle: chunk.title, preview: chunk.text.slice(0, 220) }));

    await updatePodcastStage(input.podcastId, "Generating Audio");
    const audioUrl = await generatePodcastAudio(transcript, voiceAssignments, input.podcastId);

    await updatePodcastStage(input.podcastId, "Saving Podcast");
    await prisma.podcast.update({
      where: { id: input.podcastId },
      data: {
        title,
        transcript,
        audioUrl,
        sources: JSON.parse(JSON.stringify(sources)),
        status: "READY",
        generationStatus: "READY",
        generationStage: "Ready",
        generationError: null,
      },
    });

    return NextResponse.json({ id: input.podcastId, title, transcript, audioUrl, sources, status: "READY" });
  } catch (error) {
    const message = errorMessage(error);
    await markPodcastFailed(podcastId ?? (body as { podcastId?: string } | null)?.podcastId, message);
    console.error("Podcast generation error:", error);
    return NextResponse.json({ error: message }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
