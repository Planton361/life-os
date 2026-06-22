import type { Metadata } from "next";
import { EntityDetailPage } from "@/features/entities";

export const metadata: Metadata = {
  title: "Skill Detail | Life OS",
};

export default async function SkillDetailPage({
  params,
}: Readonly<{
  params: Promise<{ skillId: string }>;
}>) {
  const { skillId } = await params;

  return <EntityDetailPage id={skillId} kind="skill" />;
}
