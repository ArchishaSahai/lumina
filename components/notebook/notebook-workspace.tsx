"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ContextPanel } from "./context-panel";
import { NotebookChat } from "./notebook-chat";
import { NotebookSidebar } from "./notebook-sidebar";
import type { NotebookConversation, ChatMessage } from "./notebook-workspace-data";
import type { NotebookSource } from "@/lib/sources";
import { createConversation, deleteConversation, renameConversation } from "@/app/actions/chat";

import { type SerializedRoadmap } from "@/app/actions/roadmaps";
import { GenerateRoadmapDialog, type RoadmapPreviewData } from "./generate-roadmap-dialog";
import { GeneratePodcastDialog } from "./generate-podcast-dialog";

type Props = {
  notebookId: string;
  title: string;
  description: string;
  sources: NotebookSource[];
  conversations: NotebookConversation[];
  activeConversationId: string | null;
  updatedAt: string;
  activeRoadmap?: SerializedRoadmap | null;
  latestRoadmapId?: string | null;
};

export function NotebookWorkspace({
  notebookId,
  title,
  description,
  sources,
  conversations,
  activeConversationId,
  updatedAt,
  activeRoadmap,
  latestRoadmapId,
}: Props) {
  const router = useRouter();
  const [conversationList, setConversationList] = useState(conversations);
  const [activeConversation, setActiveConversation] = useState<string | null>(activeConversationId);
  const [search, setSearch] = useState("");
  const [highlightedSourceIds, setHighlightedSourceIds] = useState<string[]>([]);
  const [roadmapDialogOpen, setRoadmapDialogOpen] = useState(false);
  const [podcastDialogOpen, setPodcastDialogOpen] = useState(false);

  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  const effectiveRoadmapId = activeRoadmap?.id || latestRoadmapId;

  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filteredConversations = useMemo(
    () => conversationList.filter((conversation) => conversation.title.toLowerCase().includes(search.toLowerCase())),
    [conversationList, search]
  );
  const hasSources = sources.length > 0;
  const currentConversation = conversationList.find((conversation) => conversation.id === activeConversation) ?? conversationList[0] ?? null;

  const currentMessages: ChatMessage[] = useMemo(() => {
    return (currentConversation?.messages ?? []).map((message) => ({
      id: message.id,
      role: message.role === "USER" ? "user" : "assistant",
      content: message.content,
      createdAt: new Date(message.createdAt).toISOString(),
      citations: Array.isArray(message.citations) ? (message.citations as ChatMessage["citations"]) : undefined,
    }));
  }, [currentConversation]);

  const handleConversationCreated = (conversationId: string, title: string) => {
    setConversationList((current) => [{ id: conversationId, notebookId, title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] }, ...current]);
    setActiveConversation(conversationId);
  };
  const handleConversationUpdated = (conversationId: string, messages: ChatMessage[]) => {
    setConversationList((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, updatedAt: new Date().toISOString(), messages: messages.map((message) => ({ id: message.id, conversationId, role: message.role === "user" ? "USER" : "ASSISTANT", content: message.content, citations: message.citations ?? null, createdAt: message.createdAt, updatedAt: message.createdAt })) } : conversation));
  };
  const handleConversationTitleChanged = (conversationId: string, nextTitle: string) => {
    setConversationList((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, title: nextTitle } : conversation));
  };

  const handleNewChat = async () => {
    try {
      const conversation = await createConversation(notebookId);
      handleConversationCreated(conversation.id, conversation.title);
      setSearch("");
      router.refresh();
    } catch {
      toast.error("Unable to create a new chat");
    }
  };

  const handleRename = async (conversationId: string, nextTitle: string) => {
    const previousConversations = conversationList;
    setConversationList((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, title: nextTitle.trim(), updatedAt: new Date().toISOString() } : conversation));
    try {
      await renameConversation(conversationId, nextTitle);
      toast.success("Conversation renamed");
      router.refresh();
    } catch {
      setConversationList(previousConversations);
      toast.error("Unable to rename conversation");
      throw new Error("Unable to rename conversation");
    }
  };

  const handleDelete = async (conversationId: string) => {
    const previousConversations = conversationList;
    const remainingConversations = conversationList.filter((conversation) => conversation.id !== conversationId);
    setConversationList(remainingConversations);
    if (activeConversation === conversationId) setActiveConversation(remainingConversations[0]?.id ?? null);
    try {
      await deleteConversation(conversationId);
      toast.success("Conversation deleted");
      router.refresh();
    } catch {
      setConversationList(previousConversations);
      if (activeConversation === conversationId) setActiveConversation(conversationId);
      toast.error("Unable to delete conversation");
      throw new Error("Unable to delete conversation");
    }
  };
  const handleCitationView = (sourceId: string, expanded: boolean) => {
    if (!expanded) {
      setHighlightedSourceIds((current) => current.filter((id) => id !== sourceId));
      return;
    }
    setHighlightedSourceIds([sourceId]);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightedSourceIds([]), 2_500);
  };

  const triggerPromptRef = useRef<((promptText: string) => Promise<void>) | null>(null);

  const handleGenerateSummary = () => {
    void triggerPromptRef.current?.("Generate a comprehensive summary of this notebook");
  };

  const handleRoadmapPreview = async (prompt: string) => {
    const { previewRoadmapFocusAction } = await import("@/app/actions/generate-roadmap");
    return previewRoadmapFocusAction(notebookId, prompt);
  };

  const handleRoadmapSubmit = async (data: RoadmapPreviewData) => {
    setIsGeneratingRoadmap(true);
    setRoadmapDialogOpen(false);
    
    const loadingToastId = toast.loading("Generating your personalized roadmap...");

    try {
      const { generateRoadmapAction } = await import("@/app/actions/generate-roadmap");
      const roadmapId = await generateRoadmapAction(notebookId, data);
      
      toast.success("Roadmap created!", { id: loadingToastId });
      router.push(`/dashboard/notebooks/${notebookId}/roadmap/${roadmapId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate roadmap format. Please try again.", { id: loadingToastId });
      setIsGeneratingRoadmap(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="min-h-svh bg-black text-white relative">
      {isGeneratingRoadmap && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="size-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-sm text-zinc-300 font-medium tracking-wide animate-pulse">Designing your learning path...</p>
          </div>
        </div>
      )}
      <div className="mx-auto flex min-h-svh max-w-[1800px] flex-col lg:h-svh lg:max-h-svh lg:grid lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_330px]">
        <NotebookSidebar
          title={title}
          conversations={filteredConversations}
          activeConversation={activeConversation ?? ""}
          search={search}
          onSearch={setSearch}
          onSelect={setActiveConversation}
          onNewChat={() => { void handleNewChat(); }}
          onRename={handleRename}
          onDelete={handleDelete}
        />
        <NotebookChat
          notebookId={notebookId}
          notebookTitle={title}
          sources={sources.map((source) => ({ id: source.id, title: source.title }))}
          conversationId={currentConversation?.id ?? null}
          messages={currentMessages}
          hasSources={hasSources}
          onConversationCreated={handleConversationCreated}
          onConversationTitleChanged={handleConversationTitleChanged}
          onConversationUpdated={handleConversationUpdated}
          onCitationView={handleCitationView}
          onRefresh={() => router.refresh()}
          onTriggerPrompt={(fn) => { triggerPromptRef.current = fn; }}
        />
        <ContextPanel
          notebookId={notebookId}
          title={title}
          description={description}
          sources={sources}
          updatedAt={updatedAt}
          highlightedSourceIds={highlightedSourceIds}
          onGenerateSummary={handleGenerateSummary}
          onGenerateRoadmap={() => setRoadmapDialogOpen(true)}
          onOpenRoadmap={
            effectiveRoadmapId
              ? () => router.push(`/dashboard/notebooks/${notebookId}/roadmap/${effectiveRoadmapId}`)
              : undefined
          }
          onGeneratePodcast={() => setPodcastDialogOpen(true)}
        />
      </div>

      <GenerateRoadmapDialog
        open={roadmapDialogOpen}
        onOpenChange={setRoadmapDialogOpen}
        onPreview={handleRoadmapPreview}
        onSubmit={handleRoadmapSubmit}
      />
      <GeneratePodcastDialog
        notebookId={notebookId}
        open={podcastDialogOpen}
        onOpenChange={setPodcastDialogOpen}
      />
    </motion.div>
  );
}
