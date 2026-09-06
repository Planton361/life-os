import { WorkbenchEditor } from "@/features/entities/workbench/pages";
export default async function Page({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  return <WorkbenchEditor kind="task" id={(await params).taskId} />;
}
