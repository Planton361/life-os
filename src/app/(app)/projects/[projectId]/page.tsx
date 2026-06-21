import type { Metadata } from "next";
import { DetailStubPage } from "@/components/layout/detail-stub-page";

export const metadata: Metadata = {
  title: "Project Detail | Life OS",
};

export default async function ProjectDetailPage({
  params,
}: Readonly<{
  params: Promise<{ projectId: string }>;
}>) {
  const { projectId } = await params;

  return (
    <DetailStubPage
      accent="var(--accent-blue)"
      dataSource="projects plus linked tasks, goals, skills, resources, and milestones."
      entityId={projectId}
      entityLabel="Project"
      summary="Minimal project detail target for Active Portfolio prototype links."
      title="Project Detail"
    />
  );
}
