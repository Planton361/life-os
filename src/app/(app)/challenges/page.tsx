import type { Metadata } from "next";
import {
  ChallengesPage as ChallengesFeaturePage,
  getChallengesViewModel,
} from "@/features/challenges";

export const metadata: Metadata = {
  title: "Challenges | Life OS",
  description:
    "Challenge Hub for daily, weekly and monthly special tasks with local progress simulation.",
};

export default function ChallengesPage() {
  const viewModel = getChallengesViewModel();

  return <ChallengesFeaturePage viewModel={viewModel} />;
}
