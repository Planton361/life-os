import { WorkbenchEditor } from "@/features/entities/workbench/pages";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ goalId: string }>;
  searchParams: Promise<{
    area?: string;
    stage?: string;
    goalMilestone?: string;
  }>;
}) {
  const query = await searchParams;
  return (
    <WorkbenchEditor
      kind="goal"
      id={(await params).goalId}
      goalArea={query.area}
      goalStage={query.stage ?? query.goalMilestone}
    />
  );
}
