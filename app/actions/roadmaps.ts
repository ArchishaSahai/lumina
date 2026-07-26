"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { RoadmapData } from "@/components/notebook/roadmap-view";

export type SerializedRoadmap = {
  id: string;
  notebookId: string;
  notebookTitle: string;
  title: string;
  goal: string;
  timeline: string;
  dailyStudyTime: string;
  currentLevel: string;
  learningStyle: string;
  progressPercentage: number;
  currentPhaseTitle: string | null;
  structuredJson: RoadmapData;
  lastOpenedAt: string;
  createdAt: string;
  updatedAt: string;
  phases?: Array<{
    id: string;
    phaseIndex: number;
    title: string;
    difficulty?: string | null;
    estimatedHours?: string | null;
    objective?: string | null;
    whyThisPhaseMatters?: string | null;
    expectedOutcome?: string | null;
    tasks: Array<{
      id: string;
      taskIndex: number;
      type?: string | null;
      text: string;
      duration?: string | null;
      sourceRef?: string | null;
      completed: boolean;
    }>;
  }>;
};

async function checkUserAuth() {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to manage roadmaps.");
  return userId;
}

function refreshPaths(notebookId?: string) {
  revalidatePath("/dashboard/roadmaps");
  revalidatePath("/dashboard");
  if (notebookId) revalidatePath(`/dashboard/notebooks/${notebookId}`);
}

export async function saveGeneratedRoadmap(
  notebookId: string,
  params: { goal: string; timeline: string; dailyTime: string; level: string; learningStyle: string },
  data: RoadmapData
) {
  const userId = await checkUserAuth();

  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
  });
  if (!notebook) throw new Error("Notebook not found.");

  const title = data.title || `${notebook.title} - ${params.goal} Roadmap`;
  const firstPhaseTitle = data.phases?.[0]?.title || "Phase 1: Foundations";

  // Create Roadmap in DB
  const roadmap = await prisma.roadmap.create({
    data: {
      userId,
      notebookId,
      title,
      goal: params.goal,
      timeline: params.timeline,
      dailyStudyTime: params.dailyTime,
      currentLevel: params.level,
      learningStyle: params.learningStyle,
      structuredJson: JSON.parse(JSON.stringify(data)),
      progressPercentage: 0,
      currentPhaseTitle: firstPhaseTitle,
    },
  });

  // Create Relational Phases & Tasks
  if (Array.isArray(data.phases)) {
    for (let pIdx = 0; pIdx < data.phases.length; pIdx++) {
      const phase = data.phases[pIdx];
      const createdPhase = await prisma.roadmapPhase.create({
        data: {
          roadmapId: roadmap.id,
          phaseIndex: pIdx,
          title: phase.title || `Phase ${pIdx + 1}`,
          difficulty: phase.difficulty || null,
          estimatedHours: phase.estimatedHours || null,
          objective: phase.objective || null,
          whyThisPhaseMatters: phase.whyThisPhaseMatters || null,
          expectedOutcome: phase.expectedOutcome || null,
          successCriteria: phase.successCriteria ? JSON.parse(JSON.stringify(phase.successCriteria)) : null,
          recommendedSources: phase.recommendedSources ? JSON.parse(JSON.stringify(phase.recommendedSources)) : null,
        },
      });

      if (Array.isArray(phase.tasks)) {
        for (let tIdx = 0; tIdx < phase.tasks.length; tIdx++) {
          const task = phase.tasks[tIdx];
          await prisma.roadmapTask.create({
            data: {
              roadmapPhaseId: createdPhase.id,
              taskIndex: tIdx,
              type: task.type || "Read",
              text: task.text,
              duration: task.duration || null,
              sourceRef: task.sourceRef || null,
              completed: false,
            },
          });
        }
      }
    }
  }

  refreshPaths(notebookId);
  return roadmap.id;
}

export async function getUserRoadmaps(): Promise<SerializedRoadmap[]> {
  const userId = await checkUserAuth();

  const roadmaps = await prisma.roadmap.findMany({
    where: { userId },
    include: {
      notebook: { select: { id: true, title: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return roadmaps.map((r) => ({
    id: r.id,
    notebookId: r.notebookId,
    notebookTitle: r.notebook.title,
    title: r.title,
    goal: r.goal,
    timeline: r.timeline,
    dailyStudyTime: r.dailyStudyTime,
    currentLevel: r.currentLevel,
    learningStyle: r.learningStyle,
    progressPercentage: r.progressPercentage,
    currentPhaseTitle: r.currentPhaseTitle,
    structuredJson: r.structuredJson as RoadmapData,
    lastOpenedAt: r.lastOpenedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getLatestNotebookRoadmap(notebookId: string): Promise<SerializedRoadmap | null> {
  const userId = await checkUserAuth();

  const roadmap = await prisma.roadmap.findFirst({
    where: { notebookId, userId },
    orderBy: { updatedAt: "desc" },
    include: {
      notebook: { select: { id: true, title: true } },
      phases: {
        orderBy: { phaseIndex: "asc" },
        include: {
          tasks: { orderBy: { taskIndex: "asc" } },
        },
      },
    },
  });

  if (!roadmap) return null;

  return {
    id: roadmap.id,
    notebookId: roadmap.notebookId,
    notebookTitle: roadmap.notebook.title,
    title: roadmap.title,
    goal: roadmap.goal,
    timeline: roadmap.timeline,
    dailyStudyTime: roadmap.dailyStudyTime,
    currentLevel: roadmap.currentLevel,
    learningStyle: roadmap.learningStyle,
    progressPercentage: roadmap.progressPercentage,
    currentPhaseTitle: roadmap.currentPhaseTitle,
    structuredJson: roadmap.structuredJson as RoadmapData,
    lastOpenedAt: roadmap.lastOpenedAt.toISOString(),
    createdAt: roadmap.createdAt.toISOString(),
    updatedAt: roadmap.updatedAt.toISOString(),
    phases: roadmap.phases.map((p) => ({
      id: p.id,
      phaseIndex: p.phaseIndex,
      title: p.title,
      difficulty: p.difficulty,
      estimatedHours: p.estimatedHours,
      objective: p.objective,
      whyThisPhaseMatters: p.whyThisPhaseMatters,
      expectedOutcome: p.expectedOutcome,
      tasks: p.tasks.map((t) => ({
        id: t.id,
        taskIndex: t.taskIndex,
        type: t.type,
        text: t.text,
        duration: t.duration,
        sourceRef: t.sourceRef,
        completed: t.completed,
      })),
    })),
  };
}

export async function getRoadmapById(roadmapId: string): Promise<SerializedRoadmap> {
  const userId = await checkUserAuth();

  const roadmap = await prisma.roadmap.findFirst({
    where: { id: roadmapId, userId },
    include: {
      notebook: { select: { id: true, title: true } },
      phases: {
        orderBy: { phaseIndex: "asc" },
        include: {
          tasks: { orderBy: { taskIndex: "asc" } },
        },
      },
    },
  });

  if (!roadmap) throw new Error("Roadmap not found.");

  // Update lastOpenedAt timestamp
  await prisma.roadmap.update({
    where: { id: roadmapId },
    data: { lastOpenedAt: new Date() },
  });

  return {
    id: roadmap.id,
    notebookId: roadmap.notebookId,
    notebookTitle: roadmap.notebook.title,
    title: roadmap.title,
    goal: roadmap.goal,
    timeline: roadmap.timeline,
    dailyStudyTime: roadmap.dailyStudyTime,
    currentLevel: roadmap.currentLevel,
    learningStyle: roadmap.learningStyle,
    progressPercentage: roadmap.progressPercentage,
    currentPhaseTitle: roadmap.currentPhaseTitle,
    structuredJson: roadmap.structuredJson as RoadmapData,
    lastOpenedAt: roadmap.lastOpenedAt.toISOString(),
    createdAt: roadmap.createdAt.toISOString(),
    updatedAt: roadmap.updatedAt.toISOString(),
    phases: roadmap.phases.map((p) => ({
      id: p.id,
      phaseIndex: p.phaseIndex,
      title: p.title,
      difficulty: p.difficulty,
      estimatedHours: p.estimatedHours,
      objective: p.objective,
      whyThisPhaseMatters: p.whyThisPhaseMatters,
      expectedOutcome: p.expectedOutcome,
      tasks: p.tasks.map((t) => ({
        id: t.id,
        taskIndex: t.taskIndex,
        type: t.type,
        text: t.text,
        duration: t.duration,
        sourceRef: t.sourceRef,
        completed: t.completed,
      })),
    })),
  };
}

export async function toggleRoadmapTaskCompleted(roadmapId: string, taskId: string, completed: boolean) {
  const userId = await checkUserAuth();

  const roadmap = await prisma.roadmap.findFirst({
    where: { id: roadmapId, userId },
    include: {
      phases: {
        include: {
          tasks: true,
        },
      },
    },
  });

  if (!roadmap) throw new Error("Roadmap not found.");

  // Find target task by DB id or text match
  let targetTask = await prisma.roadmapTask.findFirst({
    where: { id: taskId, phase: { roadmapId } },
  });

  if (!targetTask) {
    // Attempt fallback lookup by text match if client passed task text
    targetTask = await prisma.roadmapTask.findFirst({
      where: { text: taskId, phase: { roadmapId } },
    });
  }

  if (targetTask) {
    await prisma.roadmapTask.update({
      where: { id: targetTask.id },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
      },
    });
  }

  // Recalculate overall progress % and current phase
  const allPhases = await prisma.roadmapPhase.findMany({
    where: { roadmapId },
    orderBy: { phaseIndex: "asc" },
    include: { tasks: true },
  });

  let totalTasks = 0;
  let completedTasks = 0;
  let currentPhase = allPhases[0]?.title || "Phase 1";

  for (const phase of allPhases) {
    let phaseIncomplete = false;
    for (const task of phase.tasks) {
      totalTasks++;
      if (task.completed) {
        completedTasks++;
      } else {
        phaseIncomplete = true;
      }
    }
    if (phaseIncomplete && currentPhase === allPhases[0]?.title) {
      currentPhase = phase.title;
    }
  }

  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  await prisma.roadmap.update({
    where: { id: roadmapId },
    data: {
      progressPercentage,
      currentPhaseTitle: currentPhase,
      updatedAt: new Date(),
    },
  });

  refreshPaths(roadmap.notebookId);
  return { progressPercentage, currentPhaseTitle: currentPhase };
}

export async function renameRoadmap(roadmapId: string, title: string) {
  const userId = await checkUserAuth();
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Roadmap title is required.");

  const roadmap = await prisma.roadmap.findFirst({
    where: { id: roadmapId, userId },
  });
  if (!roadmap) throw new Error("Roadmap not found.");

  const updated = await prisma.roadmap.update({
    where: { id: roadmap.id },
    data: { title: trimmed, updatedAt: new Date() },
  });

  refreshPaths(roadmap.notebookId);
  return updated.title;
}

export async function deleteRoadmap(roadmapId: string) {
  const userId = await checkUserAuth();

  const roadmap = await prisma.roadmap.findFirst({
    where: { id: roadmapId, userId },
  });
  if (!roadmap) throw new Error("Roadmap not found.");

  await prisma.roadmap.delete({ where: { id: roadmap.id } });
  refreshPaths(roadmap.notebookId);
}
