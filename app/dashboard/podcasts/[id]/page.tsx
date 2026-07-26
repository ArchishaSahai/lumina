import { getPodcastById } from "@/app/actions/podcasts";
import { PodcastWorkspace } from "@/components/podcast/podcast-workspace";
import { notFound } from "next/navigation";

export default async function PodcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let podcast;
  try {
    podcast = await getPodcastById(id);
  } catch {
    notFound();
  }

  return <PodcastWorkspace podcast={podcast} />;
}
