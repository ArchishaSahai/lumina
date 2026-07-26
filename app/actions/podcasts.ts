"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type PodcastSettings = {
  focus: "entire_notebook" | "current_roadmap" | "learning_focus";
  tone: "conversational" | "professor" | "beginner_friendly" | "interview_prep" | "storytelling";
  genre: "educational" | "interview" | "debate" | "news_style" | "casual_conversation";
  targetAudience: "beginner" | "intermediate" | "advanced";
};

export type VoiceName = "Atlas" | "Orion" | "Nova" | "Luna";
export type VoiceAssignment = { speaker: string; voice: VoiceName };

export type SerializedPodcast = {
  id: string;
  notebookId: string;
  notebookTitle: string;
  userId: string;
  title: string;
  prompt: string;
  settings: PodcastSettings;
  transcript: string | null;
  audioUrl: string | null;
  duration: number;
  voice: string;
  speakers: number;
  tone: string;
  genre: string;
  audience: string;
  speakerCount: number;
  voiceAssignments: VoiceAssignment[];
  generationStatus: string;
  generationStage: string;
  generationError: string | null;
  sources: Array<{ sourceId: string; sourceTitle: string; preview: string }> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

async function checkUserAuth() {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to manage podcasts.");
  return userId;
}

function refreshPaths(notebookId?: string) {
  revalidatePath("/dashboard/podcasts");
  revalidatePath("/dashboard");
  if (notebookId) revalidatePath(`/dashboard/notebooks/${notebookId}`);
}

export async function getUserPodcasts(): Promise<SerializedPodcast[]> {
  const userId = await checkUserAuth();
  const podcasts = await prisma.podcast.findMany({
    where: { userId },
    include: { notebook: { select: { id: true, title: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return podcasts.map((p) => ({
    id: p.id,
    notebookId: p.notebookId,
    notebookTitle: p.notebook.title,
    userId: p.userId,
    title: p.title,
    prompt: p.prompt,
    settings: p.settings as PodcastSettings,
    transcript: p.transcript,
    audioUrl: p.audioUrl,
    duration: p.duration,
    voice: p.voice,
    speakers: p.speakers,
    tone: p.tone,
    genre: p.genre,
    audience: p.audience,
    speakerCount: p.speakerCount,
    voiceAssignments: Array.isArray(p.voiceAssignments) ? p.voiceAssignments as VoiceAssignment[] : [],
    generationStatus: p.generationStatus,
    generationStage: p.generationStage,
    generationError: p.generationError,
    sources: p.sources as SerializedPodcast["sources"],
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getPodcastById(podcastId: string): Promise<SerializedPodcast> {
  const userId = await checkUserAuth();
  const podcast = await prisma.podcast.findFirst({
    where: { id: podcastId, userId },
    include: { notebook: { select: { id: true, title: true } } },
  });
  if (!podcast) throw new Error("Podcast not found.");
  return {
    id: podcast.id,
    notebookId: podcast.notebookId,
    notebookTitle: podcast.notebook.title,
    userId: podcast.userId,
    title: podcast.title,
    prompt: podcast.prompt,
    settings: podcast.settings as PodcastSettings,
    transcript: podcast.transcript,
    audioUrl: podcast.audioUrl,
    duration: podcast.duration,
    voice: podcast.voice,
    speakers: podcast.speakers,
    tone: podcast.tone,
    genre: podcast.genre,
    audience: podcast.audience,
    speakerCount: podcast.speakerCount,
    voiceAssignments: Array.isArray(podcast.voiceAssignments) ? podcast.voiceAssignments as VoiceAssignment[] : [],
    generationStatus: podcast.generationStatus,
    generationStage: podcast.generationStage,
    generationError: podcast.generationError,
    sources: podcast.sources as SerializedPodcast["sources"],
    status: podcast.status,
    createdAt: podcast.createdAt.toISOString(),
    updatedAt: podcast.updatedAt.toISOString(),
  };
}

export async function createPodcast(data: {
  notebookId: string;
  title: string;
  prompt: string;
  settings: PodcastSettings;
  duration: number;
  voiceAssignments: VoiceAssignment[];
  speakers: number;
}): Promise<string> {
  const userId = await checkUserAuth();
  const notebook = await prisma.notebook.findFirst({ where: { id: data.notebookId, userId } });
  if (!notebook) throw new Error("Notebook not found.");
  const primaryVoice = data.voiceAssignments[0]?.voice ?? "Nova";
  const podcast = await prisma.podcast.create({
    data: {
      notebookId: data.notebookId,
      userId,
      title: data.title,
      prompt: data.prompt,
      settings: JSON.parse(JSON.stringify(data.settings)),
      duration: data.duration,
      voice: primaryVoice,
      speakers: data.speakers,
      tone: data.settings.tone,
      genre: data.settings.genre,
      audience: data.settings.targetAudience,
      speakerCount: data.speakers,
      voiceAssignments: JSON.parse(JSON.stringify(data.voiceAssignments)),
      generationStatus: "GENERATING",
      generationStage: "Preparing Sources",
      status: "GENERATING",
    },
  });
  refreshPaths(data.notebookId);
  return podcast.id;
}

export async function updatePodcastResult(podcastId: string, result: {
  title?: string;
  transcript: string;
  sources: Array<{ sourceId: string; sourceTitle: string; preview: string }>;
  audioUrl?: string | null;
  generationError?: string | null;
  status: "READY" | "FAILED";
}) {
  const userId = await checkUserAuth();
  const podcast = await prisma.podcast.findFirst({ where: { id: podcastId, userId } });
  if (!podcast) throw new Error("Podcast not found.");
  await prisma.podcast.update({
    where: { id: podcastId },
    data: {
      title: result.title ?? podcast.title,
      transcript: result.transcript,
      audioUrl: result.audioUrl,
      sources: JSON.parse(JSON.stringify(result.sources)),
      generationStatus: result.status,
      generationStage: result.status === "READY" ? "Ready" : "Failed",
      generationError: result.generationError ?? null,
      status: result.status,
    },
  });
  refreshPaths(podcast.notebookId);
}

export async function renamePodcast(podcastId: string, title: string) {
  const userId = await checkUserAuth();
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Podcast title is required.");
  const podcast = await prisma.podcast.findFirst({ where: { id: podcastId, userId } });
  if (!podcast) throw new Error("Podcast not found.");
  await prisma.podcast.update({ where: { id: podcastId }, data: { title: trimmed } });
  refreshPaths(podcast.notebookId);
}

export async function deletePodcast(podcastId: string) {
  const userId = await checkUserAuth();
  const podcast = await prisma.podcast.findFirst({ where: { id: podcastId, userId } });
  if (!podcast) throw new Error("Podcast not found.");
  await prisma.podcast.delete({ where: { id: podcastId } });
  refreshPaths(podcast.notebookId);
}
