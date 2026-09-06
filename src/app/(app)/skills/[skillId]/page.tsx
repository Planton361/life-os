import { WorkbenchEditor } from "@/features/entities/workbench/pages";
export default async function Page({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  return <WorkbenchEditor kind="skill" id={(await params).skillId} />;
}
