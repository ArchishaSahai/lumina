import { getUserNotebooks } from "@/app/actions/notebooks";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const notebooks = await getUserNotebooks();
  return <DashboardClient notebooks={notebooks} />;
}
