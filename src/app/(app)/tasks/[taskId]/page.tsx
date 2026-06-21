import type { Metadata } from "next";
import { DetailStubPage } from "@/components/layout/detail-stub-page";

export const metadata: Metadata = {
  title: "Task Detail | Life OS",
};

export default async function TaskDetailPage({
  params,
}: Readonly<{
  params: Promise<{ taskId: string }>;
}>) {
  const { taskId } = await params;

  return (
    <DetailStubPage
      accent="var(--accent-blue)"
      dataSource="tasks plus linked projects, goals, calendar blocks, and review records."
      entityId={taskId}
      entityLabel="Task"
      summary="Minimal task detail target for dashboard blocks and Daily Control links."
      title="Task Detail"
    />
  );
}
