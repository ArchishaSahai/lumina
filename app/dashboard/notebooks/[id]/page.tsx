import { getNotebookById } from "@/app/actions/notebooks";
import { getNotebookSources } from "@/app/actions/sources";
import { listNotebookConversations } from "@/app/actions/chat";
import { NotebookWorkspace } from "@/components/notebook/notebook-workspace";
import { notFound } from "next/navigation";

export default async function NotebookWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notebook = await getNotebookById(id);
  if (!notebook) notFound();
  const sources = await getNotebookSources(id);
  const rawConversations = await listNotebookConversations(id);
  const conversations = rawConversations.map((conversation) => ({ ...conversation, createdAt: conversation.createdAt.toISOString(), updatedAt: conversation.updatedAt.toISOString(), messages: conversation.messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString(), updatedAt: message.updatedAt.toISOString(), citations: (message.citations as never) ?? null })) }));
  const activeConversationId = conversations[0]?.id ?? null;

  return <NotebookWorkspace notebookId={id} title={notebook.title} description={notebook.description} sources={sources} conversations={conversations} activeConversationId={activeConversationId} updatedAt={notebook.updatedAt} />;
}
