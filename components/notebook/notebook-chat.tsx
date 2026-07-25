"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { createConversationForPrompt, titleConversationFromPrompt } from "@/app/actions/chat";
import { ChatBubble } from "./chat-bubble";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import type { ChatMessage, ChatCitation } from "./notebook-workspace-data";

type Props = {
  notebookId: string;
  conversationId: string | null;
  messages: ChatMessage[];
  hasSources: boolean;
  summarySignal?: number;
  onConversationCreated: (conversationId: string, title: string) => void;
  onConversationTitleChanged: (conversationId: string, title: string) => void;
  onConversationUpdated: (conversationId: string, messages: ChatMessage[]) => void;
  onCitationView: (sourceId: string, expanded: boolean) => void;
  onRefresh: () => void;
};

type MessageState = ChatMessage & { prompt?: string };

function isAtBottom(element: HTMLDivElement | null) {
  return !element || element.scrollHeight - element.scrollTop - element.clientHeight < 96;
}

export function NotebookChat({ notebookId, conversationId, messages, hasSources, summarySignal, onConversationCreated, onConversationTitleChanged, onConversationUpdated, onCitationView, onRefresh }: Props) {
  const [liveMessages, setLiveMessages] = useState<MessageState[]>(messages);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "generating">("idle");
  const [selectedCitations, setSelectedCitations] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pendingConversationIdRef = useRef<string | null>(null);
  const previousConversationIdRef = useRef(conversationId);
  const lastHandledSummarySignalRef = useRef(0);
  const syncRequestedRef = useRef(false);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (previousConversationIdRef.current === conversationId) return;
    previousConversationIdRef.current = conversationId;
    if (conversationId && pendingConversationIdRef.current === conversationId) {
      pendingConversationIdRef.current = null;
      return;
    }
    setLiveMessages(messages);
    setSelectedCitations({});
  }, [conversationId, messages]);

  useEffect(() => {
    if (!syncRequestedRef.current || !conversationId) return;
    onConversationUpdated(conversationId, liveMessages);
    syncRequestedRef.current = false;
    onRefresh();
  }, [conversationId, liveMessages, onConversationUpdated, onRefresh]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport && autoScroll) viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [liveMessages, autoScroll, status]);

  const persistPartial = (assistantId: string, content: string) => {
    setLiveMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content, streaming: true } : message));
  };

  const finalizeAssistant = (assistantId: string, content: string, citations: ChatCitation[]) => {
    setLiveMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content, citations, streaming: false } : message));
    syncRequestedRef.current = true;
  };

  const runChat = async (question: string, targetConversationId: string | null, regenerateAssistantId?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("searching");

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: targetConversationId, question, regenerateAssistantId }), signal: controller.signal });
      if (!response.ok || !response.body) throw new Error("Unable to generate a response.");

      const encodedCitations = response.headers.get("x-lumina-citations");
      const citations = encodedCitations ? JSON.parse(decodeURIComponent(encodedCitations)) as ChatCitation[] : [];
      const assistantId = regenerateAssistantId ?? crypto.randomUUID();
      if (!regenerateAssistantId) setLiveMessages((current) => [...current, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString(), streaming: true }]);

      setStatus("generating");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        persistPartial(assistantId, assistantText);
      }
      assistantText += decoder.decode();
      finalizeAssistant(assistantId, assistantText, citations);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Unable to generate a response");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStatus("idle");
    }
  };

  const triggerPrompt = async (questionText: string) => {
    const question = questionText.trim();
    if (!question || status !== "idle") return;
    setInput("");
    setLiveMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: question, createdAt: new Date().toISOString(), prompt: question }]);

    let targetConversationId = conversationId;
    if (!targetConversationId) {
      const conversation = await createConversationForPrompt(notebookId, question.length > 30 ? "Notebook Summary" : question);
      targetConversationId = conversation.id;
      pendingConversationIdRef.current = conversation.id;
      onConversationCreated(conversation.id, conversation.title);
    } else if (liveMessages.length === 0) {
      const conversation = await titleConversationFromPrompt(targetConversationId, question);
      onConversationTitleChanged(conversation.id, conversation.title);
    }
    await runChat(question, targetConversationId);
  };

  useEffect(() => {
    if (summarySignal && summarySignal > lastHandledSummarySignalRef.current) {
      lastHandledSummarySignalRef.current = summarySignal;
      void triggerPrompt("Generate a comprehensive summary of this notebook");
    }
  }, [summarySignal]);

  const submitQuestion = async () => {
    await triggerPrompt(input);
  };

  const handleRegenerate = async (message: MessageState) => {
    const lastUser = [...liveMessages].reverse().find((item) => item.role === "user");
    if (!lastUser || !conversationId) return;
    setLiveMessages((current) => current.map((item) => item.id === message.id ? { ...item, content: "", citations: [], streaming: true } : item));
    await runChat(lastUser.content, conversationId, message.id);
  };

  const handleExportMarkdown = (content: string) => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Notebook-Summary.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded Markdown summary");
  };

  const toggleCitation = (citation: ChatCitation) => {
    const expanded = !selectedCitations[citation.chunkId];
    setSelectedCitations((current) => ({ ...current, [citation.chunkId]: expanded }));
    onCitationView(citation.sourceId, expanded);
  };

  const isEmpty = liveMessages.length === 0;
  return (
    <main className="flex min-h-[580px] min-w-0 flex-col bg-black/35">
      <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-300">Chat</p>
          <p className="mt-1 text-sm text-zinc-500">{status === "searching" ? "Searching sources..." : status === "generating" ? "Generating answer..." : hasSources ? "Grounded in your notebook sources" : "Add sources to ground your responses"}</p>
        </div>
        <span className="rounded-full border border-violet-300/15 bg-violet-400/[.08] px-2.5 py-1 text-xs text-violet-200">{isEmpty ? "Ready" : "In context"}</span>
      </div>
      <div ref={viewportRef} onScroll={() => setAutoScroll(isAtBottom(viewportRef.current))} className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
        {isEmpty ? (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
            <div className="grid size-16 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/[.1] text-violet-300 shadow-[0_0_40px_rgba(139,92,246,.16)]">
              <MessageSquare className="size-7" />
            </div>
            <h2 className="mt-6 font-heading text-2xl font-semibold tracking-[-.04em]">{hasSources ? "What would you like to explore?" : "Add sources to begin exploring"}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{hasSources ? "Ask a question, compare ideas across your sources, or start outlining your next insight." : "Upload a document, video, or note from the source panel to give this conversation context."}</p>
          </motion.section>
        ) : (
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }} className="mx-auto flex max-w-3xl flex-col gap-7">
            {liveMessages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                expandedCitations={selectedCitations}
                onToggleCitation={toggleCitation}
                onCitationHover={(citation) => onCitationView(citation.sourceId, true)}
                onCopy={message.role === "assistant" ? async () => { await navigator.clipboard.writeText(message.content); toast.success("Copied response"); } : undefined}
                onExportMarkdown={message.role === "assistant" ? () => handleExportMarkdown(message.content) : undefined}
                onRegenerate={message.role === "assistant" ? () => handleRegenerate(message) : undefined}
              />
            ))}
            {status !== "idle" && <TypingIndicator />}
          </motion.div>
        )}
      </div>
      <div className="px-5 pb-5 sm:px-8 sm:pb-7">
        <div className="mx-auto max-w-3xl">
          <ChatInput input={input} onChange={(event) => setInput(event.target.value)} onSubmit={(event) => { event.preventDefault(); void submitQuestion(); }} onStop={() => abortRef.current?.abort()} isGenerating={status !== "idle"} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitQuestion(); } }} />
          <p className="mt-3 text-center text-[11px] text-zinc-600">Lumina can make mistakes. Review important details against your sources.</p>
        </div>
      </div>
    </main>
  );
}
