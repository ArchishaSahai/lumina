import { getUserPodcasts } from "@/app/actions/podcasts";
import { PodcastsClient } from "@/components/dashboard/podcasts-client";

export default async function PodcastsPage() {
  const podcasts = await getUserPodcasts();
  return <PodcastsClient podcasts={podcasts} />;
}
