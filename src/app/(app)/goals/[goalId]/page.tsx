import { WorkbenchEditor } from "@/features/entities/workbench/pages";
export default async function Page({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  return <WorkbenchEditor kind="goal" id={(await params).goalId} />;
}
