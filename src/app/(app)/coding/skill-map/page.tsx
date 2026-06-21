import type { Metadata } from "next";
import {
  SkillMapPage as SkillMapFeaturePage,
  getSkillMapViewModel,
} from "@/features/coding/skill-map";

export default function SkillMapPage() {
  const viewModel = getSkillMapViewModel();

  return <SkillMapFeaturePage viewModel={viewModel} />;
}

export const metadata: Metadata = {
  title: "Skill Map | Life OS",
  description:
    "Coding skill intelligence map for dependencies, evidence, future project requirements and learning gaps.",
};
