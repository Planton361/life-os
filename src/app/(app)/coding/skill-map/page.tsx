import type { Metadata } from "next";
import { getSkillMapViewModel } from "@/features/profile-data";

export default async function SkillMapPage() {
  const { SkillMapPage: SkillMapFeaturePage } =
    await import("@/features/coding/skill-map");
  const viewModel = await getSkillMapViewModel();

  return <SkillMapFeaturePage viewModel={viewModel} />;
}

export const metadata: Metadata = {
  title: "Skill Map | Life OS",
  description:
    "Coding skill intelligence map for dependencies, evidence, future project requirements and learning gaps.",
};
