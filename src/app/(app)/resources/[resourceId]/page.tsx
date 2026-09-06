import { WorkbenchEditor } from "@/features/entities/workbench/pages";
export default async function Page({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  return <WorkbenchEditor kind="resource" id={(await params).resourceId} />;
}
