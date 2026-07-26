import { getUserRoadmaps } from "@/app/actions/roadmaps";
import { RoadmapsClient } from "@/components/dashboard/roadmaps-client";

export default async function RoadmapsPage() {
  const roadmaps = await getUserRoadmaps();
  return <RoadmapsClient roadmaps={roadmaps} />;
}
