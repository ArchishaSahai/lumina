import { NotebookDetail } from "@/components/dashboard/notebook-detail";

export default async function NotebookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NotebookDetail id={id} />;
}
