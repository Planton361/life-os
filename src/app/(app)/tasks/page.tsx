import type { Metadata } from "next";
import { EntityWorkbenchPage } from "@/features/entities";
import type { WorkbenchSearchParams } from "@/features/entities/types";

export const metadata: Metadata = {
  title: "Tasks | Life OS",
};

export default async function TasksPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<WorkbenchSearchParams>;
}>) {
  return <EntityWorkbenchPage kind="task" searchParams={await searchParams} />;
}
