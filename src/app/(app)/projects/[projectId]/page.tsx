import { WorkbenchEditor } from "@/features/entities/workbench/pages";
export default async function Page({
  params,
  searchParams,
}: {
  searchParams: Promise<{ resource?: string | string[] }>;
  params: Promise<{ projectId: string }>;
}) {
  const query = await searchParams;
  return (
    <WorkbenchEditor
      kind="project"
      id={(await params).projectId}
      selectedResource={
        typeof query.resource === "string" ? query.resource : undefined
      }
    />
  );
}
