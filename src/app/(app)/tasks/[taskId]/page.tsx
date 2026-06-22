import type { Metadata } from "next";
import { EntityDetailPage } from "@/features/entities";

export const metadata: Metadata = {
  title: "Task Detail | Life OS",
};

export default async function TaskDetailPage({
  params,
}: Readonly<{
  params: Promise<{ taskId: string }>;
}>) {
  const { taskId } = await params;

  return <EntityDetailPage id={taskId} kind="task" />;
}
