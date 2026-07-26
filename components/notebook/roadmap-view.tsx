"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Compass,
  FileText,
  FolderKanban,
  GitBranch,
  LoaderCircle,
  PlaySquare,
  RefreshCw,
  ShieldCheck,
  Target,
  TestTube2,
  Trophy,
  Zap,
} from "lucide-react";
import { MarkdownContent } from "./markdown-content";
import { toggleRoadmapTaskCompleted } from "@/app/actions/roadmaps";

type Props = {
  content: string;
  roadmapId?: string;
  initialCompletedTaskIds?: Record<string, boolean>;
};

export type RoadmapTaskType = "Read" | "Watch" | "Practice" | "Build" | "Revise" | "Self-test";

export type RoadmapTask = {
  id: string;
  type?: RoadmapTaskType;
  text: string;
  duration?: string;
  sourceRef?: string;
};

export type DailyScheduleItem = {
  day: string;
  focus: string;
  tasks: RoadmapTask[];
};

export type RoadmapPhaseData = {
  id: string;
  title: string;
  difficulty?: "Easy" | "Moderate" | "Challenging" | string;
  estimatedHours?: string;
  objective?: string;
  whyThisPhaseMatters?: string;
  prerequisites?: string;
  expectedOutcome?: string;
  successCriteria?: string[];
  tasks?: RoadmapTask[];
  recommendedSources?: string[];
};

export type RoadmapProject = {
  title: string;
  description: string;
  estimatedHours?: string;
};

export type RoadmapScorecard = {
  topicsCovered?: number;
  skillsGained?: string[];
  projectsCompleted?: number;
  readinessPercentage?: number;
};

export type RoadmapData = {
  title?: string;
  goal?: string;
  estimatedDuration?: string;
  level?: string;
  learningStyle?: string;
  overview?: string;
  prerequisiteFlow?: string;
  phases?: RoadmapPhaseData[];
  dailyPlanner?: DailyScheduleItem[];
  spacedRevisions?: string[];
  projects?: RoadmapProject[];
  checkpoints?: string[];
  scorecard?: RoadmapScorecard;
  finalOutcome?: string;
};

function parseRoadmapJSON(content: string): RoadmapData | null {
  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/(\{[\s\S]*"phases"[\s\S]*\})/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed && typeof parsed === "object") {
        return parsed as RoadmapData;
      }
    }
  } catch {
    // Return null if JSON parsing fails during streaming
  }
  return null;
}

function getTaskTypeIcon(type?: RoadmapTaskType) {
  switch (type) {
    case "Read":
      return <BookOpen className="size-3 text-sky-300" />;
    case "Watch":
      return <PlaySquare className="size-3 text-rose-300" />;
    case "Practice":
      return <Code2 className="size-3 text-emerald-300" />;
    case "Build":
      return <FolderKanban className="size-3 text-amber-300" />;
    case "Revise":
      return <RefreshCw className="size-3 text-violet-300" />;
    case "Self-test":
      return <TestTube2 className="size-3 text-teal-300" />;
    default:
      return <CheckCircle2 className="size-3 text-violet-300" />;
  }
}

function getDifficultyBadge(difficulty?: string) {
  const norm = difficulty?.toLowerCase() ?? "";
  if (norm.includes("easy")) {
    return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">🟢 Easy</span>;
  }
  if (norm.includes("challenging") || norm.includes("hard") || norm.includes("advanced")) {
    return <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">🔴 Challenging</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">🟡 Moderate</span>;
}

export function RoadmapView({ content, roadmapId, initialCompletedTaskIds }: Props) {
  const jsonRoadmap = useMemo(() => parseRoadmapJSON(content), [content]);
  const [activeTab, setActiveTab] = useState<"phases" | "planner" | "scorecard">("phases");
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>(initialCompletedTaskIds || {});

  const toggleTask = (taskId: string) => {
    const nextVal = !completedTaskIds[taskId];
    setCompletedTaskIds((prev) => ({ ...prev, [taskId]: nextVal }));

    if (roadmapId) {
      void toggleRoadmapTaskCompleted(roadmapId, taskId, nextVal).catch(() => undefined);
    }
  };

  // If content looks like JSON but isn't finished streaming yet:
  if (!jsonRoadmap && (content.includes("```json") || content.trim().startsWith("{"))) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/30 via-zinc-950 to-black p-6 text-zinc-300 shadow-[0_8px_32px_rgba(139,92,246,0.12)]">
        <LoaderCircle className="size-5 animate-spin text-violet-400" />
        <div>
          <p className="text-sm font-medium text-white">Constructing your personalized study roadmap...</p>
          <p className="mt-0.5 text-xs text-zinc-400">Ordering prerequisites, building daily schedule & task checklists.</p>
        </div>
      </div>
    );
  }

  // Render JSON-driven Roadmap View
  if (jsonRoadmap) {
    const phaseTasks = (jsonRoadmap.phases ?? []).flatMap((p) => p.tasks ?? []);
    const plannerTasks = (jsonRoadmap.dailyPlanner ?? []).flatMap((d) => d.tasks ?? []);
    const allUniqueTasks = Array.from(new Map([...phaseTasks, ...plannerTasks].map((t) => [t.id, t])).values());

    const completedCount = allUniqueTasks.filter((t) => completedTaskIds[t.id]).length;
    const progressPercent = allUniqueTasks.length > 0 ? Math.round((completedCount / allUniqueTasks.length) * 100) : 0;

    return (
      <div className="space-y-6 text-zinc-200">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/40 via-zinc-900/60 to-zinc-950 p-5 shadow-[0_8px_32px_rgba(139,92,246,0.12)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl border border-violet-400/30 bg-violet-400/10 text-violet-300 shadow-[0_0_20px_rgba(167,139,250,0.2)]">
                <Compass className="size-5" />
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight text-white">
                  {jsonRoadmap.title || "Personalized Study Roadmap"}
                </h2>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  {jsonRoadmap.goal && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-0.5 text-violet-200">
                      <Target className="size-3 text-violet-300" /> Goal: {jsonRoadmap.goal}
                    </span>
                  )}
                  {jsonRoadmap.level && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-zinc-400">
                      Level: {jsonRoadmap.level}
                    </span>
                  )}
                  {jsonRoadmap.learningStyle && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-zinc-400">
                      Style: {jsonRoadmap.learningStyle}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {jsonRoadmap.estimatedDuration && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-200 shadow-sm">
                <Clock className="size-3.5 text-violet-300" />
                {jsonRoadmap.estimatedDuration}
              </span>
            )}
          </div>

          {jsonRoadmap.overview && (
            <p className="mt-4 border-t border-white/[.08] pt-3 text-sm leading-6 text-zinc-300">
              {jsonRoadmap.overview}
            </p>
          )}

          {/* Progress Tracker Bar */}
          {allUniqueTasks.length > 0 && (
            <div className="mt-5 border-t border-white/[.08] pt-4">
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span className="font-medium text-violet-300">Overall Completion</span>
                <span>{completedCount} of {allUniqueTasks.length} tasks completed ({progressPercent}%)</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-violet-500 via-indigo-400 to-emerald-400 shadow-[0_0_12px_rgba(139,92,246,0.6)]"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/[.08] pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("phases")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-all ${
              activeTab === "phases"
                ? "border-violet-400/40 bg-violet-500/20 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                : "border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            <GitBranch className="size-3.5 text-violet-300" />
            Phases & Prerequisites
          </button>

          {(jsonRoadmap.dailyPlanner ?? []).length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("planner")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-all ${
                activeTab === "planner"
                  ? "border-violet-400/40 bg-violet-500/20 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                  : "border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <Calendar className="size-3.5 text-violet-300" />
              Day-by-Day Planner
            </button>
          )}

          {jsonRoadmap.scorecard && (
            <button
              type="button"
              onClick={() => setActiveTab("scorecard")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-all ${
                activeTab === "scorecard"
                  ? "border-violet-400/40 bg-violet-500/20 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                  : "border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <Trophy className="size-3.5 text-violet-300" />
              Scorecard & Outcomes
            </button>
          )}
        </div>

        {/* TAB 1: Phases & Prerequisites */}
        {activeTab === "phases" && (
          <div className="space-y-6">
            {/* Prerequisite Sequence Card */}
            {jsonRoadmap.prerequisiteFlow && (
              <div className="rounded-xl border border-violet-400/20 bg-gradient-to-r from-violet-950/30 via-zinc-950 to-zinc-950 p-4 text-xs text-zinc-300">
                <div className="flex items-center gap-2 font-semibold text-violet-300">
                  <GitBranch className="size-4" />
                  <span>Dependency Order & Prerequisite Flow</span>
                </div>
                <p className="mt-2 leading-5 text-zinc-300">{jsonRoadmap.prerequisiteFlow}</p>
              </div>
            )}

            {/* Phase Cards Timeline */}
            {(jsonRoadmap.phases ?? []).length > 0 && (
              <div className="relative space-y-6 pl-4 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-violet-500 before:via-violet-400/40 before:to-zinc-800">
                {jsonRoadmap.phases!.map((phase, idx) => (
                  <motion.div
                    key={phase.id || phase.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="relative pl-7"
                  >
                    {/* Bullet Node */}
                    <span className="absolute -left-1 top-1.5 grid size-5 place-items-center rounded-full border-2 border-violet-400 bg-zinc-950 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.6)]">
                      <span className="size-1.5 rounded-full bg-violet-300" />
                    </span>

                    {/* Card Content */}
                    <div className="rounded-xl border border-white/[.09] bg-white/[.03] p-4.5 transition-all hover:border-violet-400/30 hover:bg-white/[.05] hover:shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-heading text-base font-semibold text-white">{phase.title}</h3>
                        <div className="flex items-center gap-2">
                          {getDifficultyBadge(phase.difficulty)}
                          {phase.estimatedHours && (
                            <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
                              {phase.estimatedHours}
                            </span>
                          )}
                        </div>
                      </div>

                      {phase.objective && (
                        <p className="mt-2 text-xs leading-5 text-violet-200/90">
                          <span className="font-semibold text-violet-300">Objective:</span> {phase.objective}
                        </p>
                      )}

                      {phase.whyThisPhaseMatters && (
                        <p className="mt-1 text-xs leading-5 text-zinc-400">
                          <span className="font-semibold text-zinc-300">Why this comes first:</span> {phase.whyThisPhaseMatters}
                        </p>
                      )}

                      {/* Action Tasks */}
                      {(phase.tasks ?? []).length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Actionable Tasks</p>
                          <div className="space-y-1.5">
                            {phase.tasks!.map((task) => {
                              const isDone = Boolean(completedTaskIds[task.id]);
                              return (
                                <button
                                  key={task.id}
                                  type="button"
                                  onClick={() => toggleTask(task.id)}
                                  className={`flex w-full cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-left text-xs transition-colors ${
                                    isDone
                                      ? "border-emerald-500/20 bg-emerald-950/20 text-zinc-400 line-through"
                                      : "border-white/10 bg-white/[0.02] text-zinc-200 hover:border-white/20 hover:bg-white/[0.04]"
                                  }`}
                                >
                                  <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${isDone ? "border-emerald-400 bg-emerald-500 text-white" : "border-zinc-600 bg-zinc-900"}`}>
                                    {isDone && <Check className="size-3" />}
                                  </span>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-1.5 font-medium">
                                      <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
                                        {getTaskTypeIcon(task.type)} {task.type || "Task"}
                                      </span>
                                      <span>{task.text}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                                      {task.duration && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="size-3" /> {task.duration}
                                        </span>
                                      )}
                                      {task.sourceRef && (
                                        <span className="flex items-center gap-1 font-medium text-violet-300">
                                          <FileText className="size-3" /> {task.sourceRef}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Success Criteria */}
                      {(phase.successCriteria ?? []).length > 0 && (
                        <div className="mt-3.5 pt-2.5 border-t border-white/[.06]">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Success Criteria</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {phase.successCriteria!.map((sc, scIdx) => (
                              <span key={scIdx} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300">
                                <ShieldCheck className="size-3" /> {sc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Day-by-Day Planner */}
        {activeTab === "planner" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(jsonRoadmap.dailyPlanner ?? []).map((schedule, idx) => (
              <motion.div
                key={schedule.day || idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs"
              >
                <div className="flex items-center justify-between border-b border-white/[.08] pb-2">
                  <span className="font-heading font-semibold text-violet-300">{schedule.day}</span>
                  <span className="text-zinc-400 font-medium">{schedule.focus}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {schedule.tasks.map((t) => {
                    const isDone = Boolean(completedTaskIds[t.id]);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTask(t.id)}
                        className={`flex w-full cursor-pointer items-start gap-2 rounded-lg border p-2 text-left transition-colors ${
                          isDone ? "border-emerald-500/20 bg-emerald-950/20 text-zinc-400 line-through" : "border-white/5 bg-white/[0.02] text-zinc-200 hover:bg-white/5"
                        }`}
                      >
                        <span className={`mt-0.5 grid size-3.5 shrink-0 place-items-center rounded border ${isDone ? "border-emerald-400 bg-emerald-500 text-white" : "border-zinc-600 bg-zinc-900"}`}>
                          {isDone && <Check className="size-2.5" />}
                        </span>
                        <div className="flex-1 space-y-0.5">
                          <p className="font-medium text-zinc-200">{t.text}</p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            <span>{getTaskTypeIcon(t.type)} {t.type || "Task"}</span>
                            {t.duration && <span>• {t.duration}</span>}
                            {t.sourceRef && <span className="text-violet-300">• {t.sourceRef}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* TAB 3: Scorecard & Outcomes */}
        {(activeTab === "scorecard" || (!jsonRoadmap.dailyPlanner?.length && activeTab === "phases")) && jsonRoadmap.scorecard && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-violet-400/20 bg-violet-950/20 p-3.5 text-center">
                <p className="text-[11px] font-medium text-violet-300">Topics Covered</p>
                <p className="mt-1 font-heading text-2xl font-bold text-white">{jsonRoadmap.scorecard.topicsCovered ?? 0}</p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5 text-center">
                <p className="text-[11px] font-medium text-emerald-300">Goal Readiness</p>
                <p className="mt-1 font-heading text-2xl font-bold text-emerald-400">{jsonRoadmap.scorecard.readinessPercentage ?? 90}%</p>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3.5 text-center">
                <p className="text-[11px] font-medium text-amber-300">Projects</p>
                <p className="mt-1 font-heading text-2xl font-bold text-amber-300">{jsonRoadmap.scorecard.projectsCompleted ?? (jsonRoadmap.projects?.length || 0)}</p>
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-3.5 text-center">
                <p className="text-[11px] font-medium text-sky-300">Skills Mastered</p>
                <p className="mt-1 font-heading text-2xl font-bold text-sky-300">{(jsonRoadmap.scorecard.skillsGained ?? []).length}</p>
              </div>
            </div>

            {(jsonRoadmap.scorecard.skillsGained ?? []).length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs">
                <p className="font-semibold text-violet-300 flex items-center gap-1.5">
                  <Award className="size-4" /> Skills Gained
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {jsonRoadmap.scorecard.skillsGained!.map((sk, idx) => (
                    <span key={idx} className="rounded-lg border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-200">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {jsonRoadmap.finalOutcome && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4 text-xs leading-6 text-zinc-300">
                <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Trophy className="size-4" /> Expected Outcome
                </p>
                <p className="mt-2">{jsonRoadmap.finalOutcome}</p>
              </div>
            )}
          </div>
        )}

        {/* Spaced Revisions */}
        {(jsonRoadmap.spacedRevisions ?? []).length > 0 && (
          <div className="rounded-xl border border-violet-400/20 bg-zinc-950 p-4 text-xs text-zinc-300">
            <p className="font-semibold text-violet-300 flex items-center gap-1.5">
              <Zap className="size-4" /> Spaced Revision Checkpoints
            </p>
            <div className="mt-2 space-y-1">
              {jsonRoadmap.spacedRevisions!.map((sr, idx) => (
                <p key={idx} className="flex items-center gap-2 text-zinc-300">
                  <span className="size-1.5 rounded-full bg-violet-400" />
                  {sr}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Graceful Fallback if raw text
  return <MarkdownContent content={content} />;
}
