"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Compass, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./markdown-content";
import type { ChatMessage, NotebookConversation } from "./notebook-workspace-data";

function formatAssistantMessage(content: string): string {
  if (!content) return content;
  const hasJsonBlock = content.includes("```json") || (content.trim().startsWith("{") && content.trim().endsWith("}"));
  if (hasJsonBlock) {
    try {
      const jsonStr = content.includes("```json") ? (content.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || "") : content.trim();
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === "object") {
          const parts: string[] = [];
          if (parsed.title) parts.push(`### ${parsed.title}`);
          if (parsed.overview) parts.push(parsed.overview);
          if (parsed.goal) parts.push(`**Goal:** ${parsed.goal}`);
          if (Array.isArray(parsed.phases) && parsed.phases.length > 0) {
            parts.push(`**Roadmap Summary:**`);
            (parsed.phases as { title?: string; objective?: string; tasks?: unknown[] }[]).forEach((p, idx) => {
              const phaseTitle = p.title ? `Phase ${idx + 1}: ${p.title}` : `Phase ${idx + 1}`;
              parts.push(`- **${phaseTitle}**${p.objective ? ` — ${p.objective}` : ""}`);
              if (Array.isArray(p.tasks)) {
                p.tasks.forEach((t: unknown) => {
                  const taskObj = t as Record<string, unknown>;
                  const taskText = typeof t === "string" ? t : typeof taskObj.text === "string" ? taskObj.text : typeof taskObj.title === "string" ? taskObj.title : undefined;
                  if (taskText) parts.push(`  - ${taskText}`);
                });
              }
            });
          }
          if (parts.length > 0) {
            if (content.includes("```json")) {
              return content.replace(/```json\s*[\s\S]*?\s*```/, parts.join("\n\n")).trim();
            }
            return parts.join("\n\n");
          }
        }
      }
    } catch {
      return content.replace(/```json\s*[\s\S]*?\s*```/g, "").replace(/```json[\s\S]*/, "").trim() || "Roadmap response updated.";
    }
  }
  return content.replace(/```json[\s\S]*?```/g, "").trim();
}

type Props = {
  notebookId: string;
  activePhaseTitle: string;
  selectedTask: { id: string; text: string; duration?: string | null; type?: string | null } | null;
  onClearTask: () => void;
  initialConversation?: NotebookConversation | null;
  learningFocus?: { primarySkill: string; excludedTopics: string[] } | null;
};

export function RoadmapAssistantSidebar({ notebookId, activePhaseTitle, selectedTask, onClearTask, initialConversation, learningFocus }: Props) {
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>(
    initialConversation?.messages?.map(m => ({
      id: m.id,
      role: m.role.toLowerCase() as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt,
    })) || []
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversation?.id);

  const handleSendAiMessage = async (customText?: string) => {
    const textToSend = (customText || aiInput).trim();
    if (!textToSend || aiLoading) return;

    setAiInput("");

    const userMsg: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: "user",
      content: textToSend,
      createdAt: new Date().toISOString(),
    };
    const assistantMsgId = `assistant-${crypto.randomUUID()}`;

    setAiMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantMsgId, role: "assistant", content: "", createdAt: new Date().toISOString(), streaming: true },
    ]);
    setAiLoading(true);

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: textToSend, 
          conversationId,
          roadmapContext: {
            activePhaseTitle,
            selectedTask: selectedTask ? selectedTask.text : undefined,
            learningFocus
          }
        }),
      });

      if (!res.ok || !res.body) throw new Error("Assistant unavailable.");

      const newConvId = res.headers.get("x-lumina-conversation-id");
      if (newConvId && !conversationId) {
        setConversationId(newConvId);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamText = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        streamText += decoder.decode(value, { stream: true });
        setAiMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, content: streamText } : msg))
        );
      }
      setAiMessages((prev) =>
        prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, streaming: false } : msg))
      );
    } catch {
      toast.error("Failed to fetch response from AI Assistant");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <aside className="flex h-full flex-col border-b border-white/[.06] bg-zinc-950 lg:border-b-0 lg:border-r overflow-hidden relative">
      <div className="flex items-center justify-between p-4 border-b border-white/[.06] shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/notebooks/${notebookId}`}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-400" />
            <h2 className="font-heading text-sm font-medium text-white">Roadmap Assistant</h2>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-white/[.06] bg-zinc-950/50 backdrop-blur-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTask ? `task-${selectedTask.id}` : `phase-${activePhaseTitle}`}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className="px-4 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">
                  📍 {selectedTask ? "Selected Task:" : "Currently asking about:"}
                </p>
                <p className="text-xs text-zinc-200 font-medium truncate">
                  {selectedTask ? selectedTask.text : (activePhaseTitle || "Entire Roadmap")}
                </p>
                <p className="text-[10px] text-zinc-500">
                  Questions will be answered using this context.
                </p>
              </div>
              {selectedTask && (
                <button type="button" onClick={onClearTask} className="text-zinc-500 hover:text-white text-xs p-1 shrink-0">
                  ✕
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs min-h-0">
        {aiMessages.length === 0 ? (
          <div className="py-10 text-center space-y-3 px-4">
            <Compass className="mx-auto size-7 text-zinc-600" />
            <p className="text-zinc-200 font-medium text-sm whitespace-pre-wrap">
              {activePhaseTitle ? `Currently focused on:\n${activePhaseTitle}` : "No phase selected."}
            </p>
            <p className="text-zinc-400 text-xs leading-relaxed">
              {activePhaseTitle ? "I'm ready to answer questions about this phase." : "Select any roadmap phase or task to ask focused questions."}
            </p>
          </div>
        ) : (
          aiMessages.map((msg) => {
            const formattedContent = formatAssistantMessage(msg.content);
            return (
              <div
                key={msg.id}
                className={`rounded-2xl p-3.5 leading-relaxed ${
                  msg.role === "user"
                    ? "ml-auto bg-violet-600 text-white max-w-[88%] text-xs"
                    : "border border-white/10 bg-zinc-900/80 text-zinc-200 max-w-[92%]"
                }`}
              >
                {msg.role === "user" ? (
                  msg.content
                ) : !msg.content && msg.streaming ? (
                  <div className="flex items-center gap-1.5 h-5 px-1 opacity-60">
                    <span className="size-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="size-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="size-1.5 rounded-full bg-violet-400 animate-bounce"></span>
                  </div>
                ) : (
                  <MarkdownContent content={formattedContent} />
                )}
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void handleSendAiMessage(); }} className="p-4 border-t border-white/[.06] bg-zinc-950 shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder={selectedTask ? `Ask about task...` : "Ask a question..."}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-4 pr-12 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all"
          />
          <Button
            type="submit"
            size="icon"
            disabled={aiLoading || !aiInput.trim()}
            className="absolute right-2 size-8.5 rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-30 transition-colors grid place-items-center"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </aside>
  );
}
