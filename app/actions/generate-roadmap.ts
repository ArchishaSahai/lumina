"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { getChatModel } from "@/lib/ai/embeddings";
import { buildGroundedPrompt, buildRetrievalPlan, rewriteQuery, searchNotebookChunks } from "@/lib/ai/rag";
import { validatePreRetrievalGuardrails, validateRetrievalEvidence } from "@/lib/ai/guardrails";
import { saveGeneratedRoadmap } from "./roadmaps";

export type RoadmapIntent = {
  primarySkill: string;
  excludedTopics: string[];
  goal: string;
  timeline: string;
  dailyTime: string;
};

export type RoadmapPreviewData = RoadmapIntent & {
  usedSources: { id: string; title: string }[];
  ignoredSources: { id: string; title: string }[];
  insufficientContent: boolean;
};

export async function previewRoadmapFocusAction(notebookId: string, prompt: string): Promise<RoadmapPreviewData> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const notebook = await prisma.notebook.findFirst({ where: { id: notebookId, userId }, include: { sources: { select: { title: true } } } });
  if (!notebook) throw new Error("Notebook not found.");

  const retrievalPlan = buildRetrievalPlan(prompt, []);
  const guardrailContext = {
    notebookId,
    notebookTitle: notebook.title,
    notebookDescription: notebook.description,
    sourceTitles: notebook.sources.map((source) => source.title),
    useCase: "roadmap" as const,
  };
  const preRetrievalDecision = validatePreRetrievalGuardrails(prompt, guardrailContext, retrievalPlan);
  if (!preRetrievalDecision.allowed) throw new Error(preRetrievalDecision.message);

  const { object: intent } = await generateObject({
    model: getChatModel(),
    schema: z.object({
      primarySkill: z.string().describe("The primary topic or skill requested"),
      excludedTopics: z.array(z.string()).describe("Topics the user explicitly wants to ignore or exclude"),
      goal: z.string().describe("The inferred goal"),
      timeline: z.string().describe("The inferred timeline (default to '2 weeks')"),
      dailyTime: z.string().describe("The inferred daily study time (default to '1 hr')")
    }),
    prompt: `Analyze this roadmap request: "${prompt}". Extract the primary skill, any excluded topics, goal, timeline, and daily time.`,
  });

  const intentRetrievalPlan = buildRetrievalPlan(intent.primarySkill, []);
  const rewritten = await rewriteQuery(intentRetrievalPlan.query);
  const retrieved = await searchNotebookChunks(notebookId, rewritten, intentRetrievalPlan);

  const allSources = await prisma.source.findMany({ where: { notebookId }, select: { id: true, title: true } });
  const usedSourceIds = new Set(retrieved.map(c => c.sourceId));
  
  const usedSources = allSources.filter(s => usedSourceIds.has(s.id));
  const ignoredSources = allSources.filter(s => !usedSourceIds.has(s.id));

  return {
    ...intent,
    usedSources,
    ignoredSources,
    insufficientContent: usedSources.length === 0,
  };
}

export async function generateRoadmapAction(notebookId: string, intent: RoadmapPreviewData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const notebook = await prisma.notebook.findFirst({ where: { id: notebookId, userId }, include: { sources: { select: { title: true } } } });
  if (!notebook) throw new Error("Notebook not found.");

  const retrievalPlan = buildRetrievalPlan(intent.primarySkill, []);
  const guardrailContext = {
    notebookId,
    notebookTitle: notebook.title,
    notebookDescription: notebook.description,
    sourceTitles: notebook.sources.map((source) => source.title),
    useCase: "roadmap" as const,
  };
  const preRetrievalDecision = validatePreRetrievalGuardrails(intent.primarySkill, guardrailContext, retrievalPlan);
  if (!preRetrievalDecision.allowed) throw new Error(preRetrievalDecision.message);

  const rewritten = await rewriteQuery(retrievalPlan.query);
  const retrieved = await searchNotebookChunks(notebookId, rewritten, retrievalPlan);
  const retrievalDecision = validateRetrievalEvidence(retrieved, guardrailContext, retrievalPlan);
  if (!retrievalDecision.allowed) throw new Error(retrievalDecision.message);
  
  // Filter out excluded topics via regex if needed, or just rely on usedSources
  let filteredChunks = retrieved;
  if (intent.excludedTopics.length > 0) {
    const excludeRegex = new RegExp(intent.excludedTopics.join("|"), "i");
    filteredChunks = retrieved.filter(c => !excludeRegex.test(c.text));
  }
  
  const question = `Generate a personalized learning roadmap for this notebook with the following parameters:
- Primary Skill: ${intent.primarySkill}
- Goal: ${intent.goal}
- Timeline: ${intent.timeline}
- Daily Study Time: ${intent.dailyTime}
- Level: Intermediate
- Learning Style: Balanced`;

  const prompt = buildGroundedPrompt(question, filteredChunks, "roadmap");

  const { text } = await generateText({
    model: getChatModel(),
    prompt,
  });

  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*"phases"[\s\S]*\})/);
  if (!match) {
    throw new Error("Unable to parse roadmap structure from AI response.");
  }

  const parsed = JSON.parse(match[1].trim());
  if (!parsed || !parsed.phases) {
    throw new Error("Invalid roadmap JSON schema.");
  }

  // Attach learning focus to the structured JSON
  parsed.learningFocus = {
    primarySkill: intent.primarySkill,
    excludedTopics: intent.excludedTopics,
  };

  const params = {
    goal: intent.goal,
    timeline: intent.timeline,
    dailyTime: intent.dailyTime,
    level: "Intermediate",
    learningStyle: "Balanced",
  };

  const roadmapId = await saveGeneratedRoadmap(notebookId, params, parsed);
  return roadmapId;
}
