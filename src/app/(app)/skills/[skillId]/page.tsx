import type { Metadata } from "next";
import { DetailStubPage } from "@/components/layout/detail-stub-page";

export const metadata: Metadata = {
  title: "Skill Detail | Life OS",
};

export default async function SkillDetailPage({
  params,
}: Readonly<{
  params: Promise<{ skillId: string }>;
}>) {
  const { skillId } = await params;

  return (
    <DetailStubPage
      accent="var(--accent-purple)"
      dataSource="skills plus linked resources, practice logs, projects, and evidence."
      entityId={skillId}
      entityLabel="Skill"
      summary="Minimal skill detail target for Active Portfolio prototype links."
      title="Skill Detail"
    />
  );
}
