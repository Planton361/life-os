import { WorkbenchEditor } from "@/features/entities/workbench/pages";
export default async function Page({
  searchParams,
  params,
}: {
  searchParams: Promise<{ project?: string | string[] }>;
  params: Promise<{ resourceId: string }>;
}) {
  const query = await searchParams;
  return (
    <WorkbenchEditor
      kind="resource"
      id={(await params).resourceId}
      projectContext={
        typeof query.project === "string" ? query.project : undefined
      }
    />
  );
}
