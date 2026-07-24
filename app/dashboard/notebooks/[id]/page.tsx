import { NotebookWorkspace } from "@/components/notebook/notebook-workspace";
import { mockNotebooks } from "@/components/dashboard/notebook-data";

export default async function NotebookWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notebook = mockNotebooks.find((item) => item.id === id);

  return <NotebookWorkspace title={notebook?.title ?? "Untitled notebook"} description={notebook?.description ?? "A focused space for your sources, notes, and ideas."} sourceCount={notebook?.sourceCount ?? 0} updatedAt={notebook?.updatedAt ?? "Updated just now"} />;
}
