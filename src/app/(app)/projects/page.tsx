import { WorkbenchList } from "@/features/entities/workbench/pages";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <WorkbenchList kind="project" searchParams={await searchParams} />;
}
