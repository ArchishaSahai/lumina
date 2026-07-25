import { getNotebookById } from "@/app/actions/notebooks";
import { getNotebookSources } from "@/app/actions/sources";
import { NotebookWorkspace } from "@/components/notebook/notebook-workspace";
import { redirect } from "next/navigation";

export default async function NotebookWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notebook = await getNotebookById(id);
  if (!notebook) redirect("/dashboard");
  const sources = await getNotebookSources(id);

  return <NotebookWorkspace notebookId={id} title={notebook.title} description={notebook.description} sources={sources} updatedAt={notebook.updatedAt} />;
}
