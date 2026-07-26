import { getNotebookById } from "@/app/actions/notebooks";
import { getNotebookSources } from "@/app/actions/sources";
import { listNotebookConversations } from "@/app/actions/chat";
import { getRoadmapById } from "@/app/actions/roadmaps";
import { RoadmapWorkspaceClient } from "@/components/notebook/roadmap-workspace-client";
import { notFound } from "next/navigation";

export default async function RoadmapWorkspacePage({
  params,
}: {
  params: Promise<{ id: string; roadmapId: string }>;
}) {
  const { id, roadmapId } = await params;

  const notebook = await getNotebookById(id);
  if (!notebook) notFound();

  let roadmap = null;
  try {
    roadmap = await getRoadmapById(roadmapId);
  } catch {
    notFound();
  }

  const sources = await getNotebookSources(id);
  const rawConversations = await listNotebookConversations(id, "ROADMAP");
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

  return (
    <RoadmapWorkspaceClient
      notebook={notebook}
      roadmap={roadmap}
      sources={sources}
      conversations={conversations}
    />
  );
}
