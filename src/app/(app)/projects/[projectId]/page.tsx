import type { Metadata } from "next";
import { EntityDetailPage } from "@/features/entities";

export const metadata: Metadata = {
  title: "Project Detail | Life OS",
};

export default async function ProjectDetailPage({
  params,
}: Readonly<{
  params: Promise<{ projectId: string }>;
}>) {
  const { projectId } = await params;

  return <EntityDetailPage id={projectId} kind="project" />;
}
