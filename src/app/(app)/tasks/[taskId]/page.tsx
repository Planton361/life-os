import { WorkbenchEditor } from "@/features/entities/workbench/pages";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const [{ taskId }, query] = await Promise.all([params, searchParams]);
  return (
    <WorkbenchEditor kind="task" id={taskId} editTask={query.edit === "1"} />
  );
}
