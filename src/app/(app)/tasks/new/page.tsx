import { WorkbenchEditor } from "@/features/entities/workbench/pages";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string | string[];
    milestone?: string | string[];
    goal?: string | string[];
    goalMilestone?: string | string[];
  }>;
}) {
  const query = await searchParams;
  return (
    <WorkbenchEditor
      kind="task"
      projectContext={
        typeof query.project === "string" ? query.project : undefined
      }
      milestoneContext={
        typeof query.milestone === "string" ? query.milestone : undefined
      }
      goalContext={typeof query.goal === "string" ? query.goal : undefined}
      goalMilestoneContext={
        typeof query.goalMilestone === "string" ? query.goalMilestone : undefined
      }
    />
  );
}
