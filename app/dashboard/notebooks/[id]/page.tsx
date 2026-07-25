import { getNotebookById } from "@/app/actions/notebooks";
import { NotebookWorkspace } from "@/components/notebook/notebook-workspace";
import { redirect } from "next/navigation";

export default async function NotebookWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notebook = await getNotebookById(id);
  if (!notebook) redirect("/dashboard");

  return <NotebookWorkspace title={notebook.title} description={notebook.description} sourceCount={0} updatedAt={notebook.updatedAt} />;
}
