"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Compass,
  FileText,
  FolderKanban,
  PlaySquare,
  RefreshCw,
  TestTube2,
} from "lucide-react";

import type { SerializedRoadmap } from "@/app/actions/roadmaps";
import { toggleRoadmapTaskCompleted } from "@/app/actions/roadmaps";
import type { NotebookSource } from "@/lib/sources";
import type { NotebookConversation } from "./notebook-workspace-data";
import { RoadmapAssistantSidebar } from "./roadmap-assistant-sidebar";

type Props = {
  notebook: {
    id: string;
    title: string;
    description: string;
    updatedAt: string;
  };
  roadmap: SerializedRoadmap;
  sources: NotebookSource[];
  conversations: NotebookConversation[];
};

type SelectedTask = {
  id: string;
  text: string;
  type?: string | null;
  duration?: string | null;
  phaseTitle?: string;
};

function getTaskTypeIcon(type?: string | null) {
  switch (type) {
    case "Read":
      return <BookOpen className="size-3.5 text-sky-400" />;
    case "Watch":
      return <PlaySquare className="size-3.5 text-rose-400" />;
    case "Practice":
      return <Code2 className="size-3.5 text-emerald-400" />;
    case "Build":
      return <FolderKanban className="size-3.5 text-amber-400" />;
    case "Revise":
      return <RefreshCw className="size-3.5 text-violet-400" />;
    case "Self-test":
      return <TestTube2 className="size-3.5 text-teal-400" />;
    default:
      return <CheckCircle2 className="size-3.5 text-violet-400" />;
  }
}

function getDifficultyBadge(difficulty?: string | null) {
  const norm = difficulty?.toLowerCase() ?? "";
  if (norm.includes("easy")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
        🟢 Easy
      </span>
    );
  }
  if (norm.includes("challenging") || norm.includes("hard") || norm.includes("advanced")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-300">
        🔴 Challenging
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
      🟡 Moderate
    </span>
  );
}


function openSourceItem(sourceRef: string, sources: NotebookSource[]) {
  const pageMatch = sourceRef.match(/(?:p\.|page)\s*(\d+)/i);
  const pageNum = pageMatch ? pageMatch[1] : null;

  const timestampMatch = sourceRef.match(/(\d+):(\d+)/);
  let timestampSeconds = 0;
  if (timestampMatch) {
    timestampSeconds = parseInt(timestampMatch[1], 10) * 60 + parseInt(timestampMatch[2], 10);
  }

  const matched = sources.find(
    (s) =>
      s.title.toLowerCase().includes(sourceRef.toLowerCase()) ||
      sourceRef.toLowerCase().includes(s.title.toLowerCase())
  );

  if (matched) {
    if (matched.type === "WEBSITE" && matched.url) {
      window.open(matched.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (matched.type === "YOUTUBE" && matched.url) {
      const sep = matched.url.includes("?") ? "&" : "?";
      const targetUrl = timestampSeconds > 0 ? `${matched.url}${sep}t=${timestampSeconds}s` : matched.url;
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const pageHash = pageNum ? `#page=${pageNum}` : "";
    window.open(`/api/sources/${matched.id}/open${pageHash}`, "_blank", "noopener,noreferrer");
    return;
  }

  if (sourceRef.startsWith("http://") || sourceRef.startsWith("https://")) {
    const sep = sourceRef.includes("?") ? "&" : "?";
    const targetUrl = timestampSeconds > 0 ? `${sourceRef}${sep}t=${timestampSeconds}s` : sourceRef;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  } else {
    toast.info(`Source reference: ${sourceRef}`);
  }
}

export function RoadmapWorkspaceClient({ notebook, roadmap: initialRoadmap, sources, conversations }: Props) {
  const [roadmap, setRoadmap] = useState<SerializedRoadmap>(initialRoadmap);
  const jsonRoadmap = roadmap.structuredJson;

  // Initialize completed tasks state
  const initialTaskState = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (roadmap.phases) {
      for (const phase of roadmap.phases) {
        for (const task of phase.tasks) {
          if (task.completed) {
            map[task.id] = true;
            map[task.text] = true;
          }
        }
      }
    }
    return map;
  }, [roadmap]);

  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(initialTaskState);

  // Single phase expanded at a time
  const initialExpandedPhaseId = useMemo(() => {
    if (!roadmap.phases) return null;
    const firstIncomplete = roadmap.phases.find((p) => p.tasks.some((t) => !initialTaskState[t.id]));
    return firstIncomplete ? firstIncomplete.id : roadmap.phases[0]?.id ?? null;
  }, [roadmap, initialTaskState]);

  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(initialExpandedPhaseId);
  const [showSecondaryDetails, setShowSecondaryDetails] = useState<Record<string, boolean>>({});
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);

  // Compute all tasks across phases
  const allTasks = useMemo(() => {
    if (roadmap.phases && roadmap.phases.length > 0) {
      return roadmap.phases.flatMap((p) => p.tasks.map((t) => ({ ...t, phaseTitle: p.title })));
    }
    const phaseTasks = (jsonRoadmap?.phases ?? []).flatMap((p) => p.tasks ?? []);
    const plannerTasks = (jsonRoadmap?.dailyPlanner ?? []).flatMap((d) => d.tasks ?? []);
    return Array.from(new Map([...phaseTasks, ...plannerTasks].map((t) => [t.id, t])).values());
  }, [roadmap, jsonRoadmap]);

  const totalTasksCount = allTasks.length;
  const completedTasksCount = allTasks.filter((t) => completedTasks[t.id]).length;
  const remainingTasksCount = totalTasksCount - completedTasksCount;
  const currentProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : roadmap.progressPercentage;

  // Active phase
  const activePhase = useMemo(() => {
    if (!roadmap.phases) return jsonRoadmap?.phases?.[0] ?? null;
    const firstIncomplete = roadmap.phases.find((p) => p.tasks.some((t) => !completedTasks[t.id]));
    return firstIncomplete ?? roadmap.phases[0] ?? null;
  }, [roadmap, jsonRoadmap, completedTasks]);

  // Toggle task completion
  const handleToggleTask = async (taskId: string) => {
    const nextCompleted = !completedTasks[taskId];

    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: nextCompleted,
    }));

    try {
      const res = await toggleRoadmapTaskCompleted(roadmap.id, taskId, nextCompleted);
      setRoadmap((prev) => ({
        ...prev,
        progressPercentage: res.progressPercentage,
        currentPhaseTitle: res.currentPhaseTitle ?? prev.currentPhaseTitle,
      }));
    } catch {
      toast.error("Failed to update task progress");
      setCompletedTasks((prev) => ({
        ...prev,
        [taskId]: !nextCompleted,
      }));
    }
  };

  const togglePhaseExpanded = (phaseId: string) => {
    setExpandedPhaseId((prev) => (prev === phaseId ? null : phaseId));
  };

  const toggleSecondaryDetails = (phaseId: string) => {
    setShowSecondaryDetails((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  return (
    <div className="min-h-svh bg-zinc-950 text-white selection:bg-violet-500/20">
      <div className="mx-auto flex min-h-svh max-w-[1800px] flex-col lg:h-svh lg:max-h-svh lg:grid lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)_300px]">
        <RoadmapAssistantSidebar
          notebookId={notebook.id}
          activePhaseTitle={roadmap.phases?.find(p => p.id === expandedPhaseId)?.title || activePhase?.title || 'Foundations'}
          selectedTask={selectedTask}
          onClearTask={() => setSelectedTask(null)}
          initialConversation={conversations?.[0] || null}
          learningFocus={(jsonRoadmap as Record<string, unknown>)?.learningFocus as { primarySkill: string; excludedTopics: string[] } | undefined}
        />

        {/* CENTER WORKSPACE: VISUAL FOCUS (bg-zinc-900/60) */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-zinc-900/60">
          {/* HEADER SPACING (Requirement 1: 32px top, 16px breadcrumb-to-title, 12px title-to-meta) */}
          <header className="sticky top-0 z-20 border-b border-white/[.06] bg-zinc-900/90 backdrop-blur-md px-6 sm:px-8 pt-8 pb-5">
            {/* Breadcrumb Navigation (16px spacing below) */}
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-4">
              <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              <ChevronRight className="size-3 text-zinc-500" />
              <Link href={`/dashboard/notebooks/${notebook.id}`} className="hover:text-white transition-colors truncate max-w-[160px] sm:max-w-xs">{notebook.title}</Link>
              <ChevronRight className="size-3 text-zinc-500" />
              <span className="text-zinc-200 font-semibold truncate max-w-[180px] sm:max-w-sm">{roadmap.title}</span>
            </div>

            {/* Header Title (Requirement 8: Largest typography) & Metadata (12px gap) */}
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {roadmap.title || "Personalized Learning Roadmap"}
              </h1>
              {/* 12px gap below title = mt-3 */}
              <p className="mt-3 text-xs sm:text-sm text-zinc-400 font-medium flex flex-wrap items-center gap-3">
                <span>🎯 <strong className="text-zinc-300 font-medium">{roadmap.goal}</strong></span>
                <span className="text-zinc-600">•</span>
                <span>📅 {roadmap.timeline}</span>
                <span className="text-zinc-600">•</span>
                <span>⏰ {roadmap.dailyStudyTime}</span>
              </p>
            </div>

            {/* Sub-navigation */}
            <div className="mt-5 flex items-center gap-2 border-t border-white/[.06] pt-3 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-1.5 font-medium text-white">
                <Compass className="size-3.5 text-violet-400" /> Study Guide & Roadmap
              </span>
            </div>
          </header>

          {/* MAIN ROADMAP CONTENT WITH GENEROUS WHITESPACE (Requirement 7 & 8) */}
          <div className="flex-1 p-8 sm:p-10 space-y-8 max-w-4xl mx-auto w-full">
            {jsonRoadmap?.overview && (
              <div className="rounded-2xl border border-violet-500/15 bg-zinc-900/80 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Overview</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{jsonRoadmap.overview}</p>
              </div>
            )}

            {/* Collapsible Phase Sections (Requirement 3: Subtle identity cards with border-violet-500/20 & soft shadow) */}
            {roadmap.phases && roadmap.phases.length > 0 ? (
              <div className="space-y-6">
                {roadmap.phases.map((phase, pIdx, arr) => {
                  const isExpanded = expandedPhaseId === phase.id;
                  const phaseDoneCount = phase.tasks.filter((t) => completedTasks[t.id]).length;
                  const phaseTotalCount = phase.tasks.length;
                  const isPhaseComplete = phaseTotalCount > 0 && phaseDoneCount === phaseTotalCount;
                  const isActivePhase = activePhase?.id === phase.id || isExpanded;
                  const showSecondary = Boolean(showSecondaryDetails[phase.id]);
                  const isLast = pIdx === arr.length - 1;

                  return (
                    <div key={phase.id} className="relative">
                      {!isLast && <div className="absolute left-10 top-20 bottom-[-24px] w-[2px] bg-gradient-to-b from-violet-500/50 to-transparent z-0" />}
                      <div
                        id={`phase-${phase.id}`}
                        className={`relative z-10 rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${
                          isActivePhase
                            ? "border-violet-500/40 bg-gradient-to-br from-violet-950/40 via-zinc-900/80 to-zinc-950 ring-1 ring-violet-500/30 shadow-[0_8px_32px_rgba(139,92,246,0.15)]"
                            : "border-violet-500/15 bg-zinc-900/60 hover:border-violet-500/30 hover:bg-zinc-900/80 hover:shadow-[0_4px_20px_rgba(139,92,246,0.1)]"
                        }`}
                      >
                      {/* Header bar for Phase */}
                      <div
                        onClick={() => togglePhaseExpanded(phase.id)}
                        className="flex cursor-pointer items-center justify-between gap-4 p-5 sm:p-6 select-none hover:bg-white/[0.015] transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="grid size-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 font-heading text-xs font-bold shrink-0">
                            P{pIdx + 1}
                          </span>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Requirement 8: Second largest title */}
                              <h2 className="font-heading text-lg sm:text-xl font-semibold text-white truncate">
                                {phase.title}
                              </h2>
                              {isPhaseComplete && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                                  <CheckCircle2 className="size-3.5" /> Complete
                                </span>
                              )}
                            </div>
                            {phase.objective && (
                              <p className="text-xs text-zinc-400 truncate max-w-lg">
                                {phase.objective}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {getDifficultyBadge(phase.difficulty)}
                          {phase.estimatedHours && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-400 font-medium">
                              ⏱️ {phase.estimatedHours}
                            </span>
                          )}
                          <span className="text-xs font-medium text-violet-400">
                            {phaseDoneCount} / {phaseTotalCount}
                          </span>
                          {isExpanded ? <ChevronDown className="size-4 text-zinc-400" /> : <ChevronRight className="size-4 text-zinc-400" />}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-white/[.06] p-5 sm:p-6 space-y-6 bg-zinc-950/40"
                          >
                            {/* Objective (Medium typography) */}
                            {phase.objective && (
                              <div className="rounded-xl border border-white/[.04] bg-white/[0.02] p-4">
                                <p className="text-sm text-zinc-300 leading-relaxed">
                                  <span className="font-semibold text-white">Objective:</span> {phase.objective}
                                </p>
                              </div>
                            )}

                            {/* Minimal Tasks List */}
                            <div className="space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Actionable Tasks</p>
                              <div className="space-y-2.5">
                                {phase.tasks.map((task) => {
                                  const isDone = Boolean(completedTasks[task.id]);
                                  const isSelected = selectedTask?.id === task.id;

                                  return (
                                    <div
                                      key={task.id}
                                      onClick={() => setSelectedTask({ id: task.id, text: task.text, type: task.type, duration: task.duration, phaseTitle: phase.title })}
                                      className={`flex items-start gap-3.5 rounded-xl border p-3.5 transition-all cursor-pointer ${
                                        isSelected
                                          ? "border-violet-500/40 bg-violet-500/10 ring-1 ring-violet-500/20"
                                          : isDone
                                          ? "border-white/[0.04] bg-white/[0.01] text-zinc-500"
                                          : "border-white/10 bg-zinc-950/80 text-zinc-200 hover:border-white/20 hover:bg-zinc-950"
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleTask(task.id);
                                        }}
                                        className={`mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-md border transition-colors ${
                                          isDone
                                            ? "border-emerald-500 bg-emerald-500 text-white"
                                            : "border-zinc-600 bg-zinc-900 hover:border-violet-400"
                                        }`}
                                      >
                                        {isDone && <Check className="size-3" />}
                                      </button>

                                      <div className="flex-1 space-y-1.5 min-w-0">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <p className={`text-sm font-medium leading-relaxed ${isDone ? "line-through text-zinc-500" : "text-zinc-100"}`}>
                                            {task.text}
                                          </p>

                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                                              {getTaskTypeIcon(task.type)} {task.type || "Read"}
                                            </span>
                                            {task.duration && (
                                              <span className="text-xs text-zinc-400">
                                                ⏱️ {task.duration}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Clickable Source Chips */}
                                        {task.sourceRef && (
                                          <div className="pt-0.5">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openSourceItem(task.sourceRef!, sources);
                                              }}
                                              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-300 hover:border-violet-500/40 hover:bg-violet-500/10 transition-colors"
                                            >
                                              <FileText className="size-3.5 text-violet-400" /> {task.sourceRef}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Secondary Disclosure Section */}
                            <div className="border-t border-white/[.06] pt-3">
                              <button
                                type="button"
                                onClick={() => toggleSecondaryDetails(phase.id)}
                                className="text-xs font-medium text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                              >
                                <span>{showSecondary ? "Hide phase details & rationale" : "Show phase details & rationale"}</span>
                                {showSecondary ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                              </button>

                              {showSecondary && (
                                <div className="mt-3 space-y-2.5 text-xs text-zinc-300 rounded-xl border border-white/10 bg-zinc-950 p-4 leading-relaxed">
                                  {phase.whyThisPhaseMatters && (
                                    <p><span className="font-semibold text-white">Why this matters:</span> {phase.whyThisPhaseMatters}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No phases available.</p>
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR: MINIMAL CONTEXT & PROGRESS (bg-zinc-950) */}
        <aside className="hidden xl:flex flex-col border-l border-white/[.06] bg-zinc-950 overflow-y-auto p-6 space-y-6">
          {/* Notebook Context */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Notebook Context</p>
            <h3 className="mt-2 font-heading text-base font-semibold text-white">{notebook.title}</h3>
            <p className="mt-1 text-xs text-zinc-400 line-clamp-3 leading-relaxed">{notebook.description}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium">
                <FileText className="size-3.5 text-violet-400" /> {sources.length} Sources
              </span>
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="rounded-2xl border border-violet-500/15 bg-zinc-900/50 p-5 space-y-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Progress Tracker</p>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Completion</span>
              <span className="font-semibold text-white">{completedTasksCount} / {totalTasksCount} tasks</span>
            </div>

            {/* Clean Progress Bar (Requirement 9: Accent purple only) */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                style={{ width: `${currentProgressPercent}%` }}
                className="h-full bg-violet-500 transition-all duration-500 rounded-full"
              />
            </div>

            <div className="space-y-2 pt-1 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Current Phase:</span>
                <span className="font-medium text-white truncate max-w-[140px]">{activePhase?.title || "Foundations"}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-medium text-amber-300">{remainingTasksCount} tasks</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-2.5 pt-3 border-t border-white/[.06]">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Activity</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span>Opened Roadmap Workspace</span>
              </div>
              {completedTasksCount > 0 && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="size-1.5 rounded-full bg-violet-400" />
                  <span>{completedTasksCount} tasks completed</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
