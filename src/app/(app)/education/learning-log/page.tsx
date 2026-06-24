import type { Metadata } from "next";
import { getLearningLogViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Learning Log | Life OS",
  description:
    "Learning sessions, practice rhythm and learning evidence for Education.",
};

export default async function LearningLogPage() {
  const { LearningLogPage: LearningLogFeaturePage } =
    await import("@/features/education");

  return <LearningLogFeaturePage viewModel={await getLearningLogViewModel()} />;
}
