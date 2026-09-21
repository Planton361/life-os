import { WorkbenchEditor } from "@/features/entities/workbench/pages";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    goal?: string | string[];
    goalMilestone?: string | string[];
  }>;
}) {
  const query = await searchParams;
  return (
    <WorkbenchEditor
      kind="project"
      goalContext={typeof query.goal === "string" ? query.goal : undefined}
      goalMilestoneContext={
        typeof query.goalMilestone === "string" ? query.goalMilestone : undefined
      }
    />
  );
}
