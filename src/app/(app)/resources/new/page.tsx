import { WorkbenchEditor } from "@/features/entities/workbench/pages";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <WorkbenchEditor
      kind="resource"
      projectContext={
        typeof query.project === "string" ? query.project : undefined
      }
    />
  );
}
