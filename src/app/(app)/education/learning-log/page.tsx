import type { Metadata } from "next";
import {
  getLearningLogViewModel,
  LearningLogPage as LearningLogFeaturePage,
} from "@/features/education";

export const metadata: Metadata = {
  title: "Learning Log | Life OS",
  description:
    "Study sessions, practice rhythm and learning evidence for Education.",
};

export default function LearningLogPage() {
  return <LearningLogFeaturePage viewModel={getLearningLogViewModel()} />;
}
