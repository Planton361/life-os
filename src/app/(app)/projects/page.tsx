import type { Metadata } from "next";
import { EntityWorkbenchPage } from "@/features/entities";
import type { WorkbenchSearchParams } from "@/features/entities/types";

export const metadata: Metadata = {
  title: "Projects | Life OS",
};

export default async function ProjectsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<WorkbenchSearchParams>;
}>) {
  return (
    <EntityWorkbenchPage kind="project" searchParams={await searchParams} />
  );
}
