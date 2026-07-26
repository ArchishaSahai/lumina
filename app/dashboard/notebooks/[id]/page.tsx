import { getNotebookById } from "@/app/actions/notebooks";
import { getNotebookSources } from "@/app/actions/sources";
import { listNotebookConversations } from "@/app/actions/chat";
import { getRoadmapById } from "@/app/actions/roadmaps";
import { NotebookWorkspace } from "@/components/notebook/notebook-workspace";
import { notFound } from "next/navigation";

export default async function NotebookWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ roadmapId?: string }>;
}) {
  const { id } = await params;
  const { roadmapId } = await searchParams;

  const notebook = await getNotebookById(id);
  if (!notebook) notFound();

  const sources = await getNotebookSources(id);
  const rawConversations = await listNotebookConversations(id);
  const conversations = rawConversations.map((conversation) => ({
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      citations: (message.citations as never) ?? null,
    })),
  }));

  const activeConversationId = conversations[0]?.id ?? null;

  let activeRoadmap = null;
  if (roadmapId) {
    try {
      activeRoadmap = await getRoadmapById(roadmapId);
      if (activeRoadmap.notebookId !== id) activeRoadmap = null;
    } catch {
      activeRoadmap = null;
    }
  }

  return (
    <NotebookWorkspace
      notebookId={id}
      title={notebook.title}
      description={notebook.description}
      sources={sources}
      conversations={conversations}
      activeConversationId={activeConversationId}
      updatedAt={notebook.updatedAt}
      activeRoadmap={activeRoadmap}
    />
  );
}
