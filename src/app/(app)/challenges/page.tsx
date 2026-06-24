import type { Metadata } from "next";
import { getChallengesViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Challenges | Life OS",
  description:
    "Challenge Hub for daily, weekly and monthly special tasks with local progress simulation.",
};

export default async function ChallengesPage() {
  const { ChallengesPage: ChallengesFeaturePage } =
    await import("@/features/challenges");
  const viewModel = await getChallengesViewModel();

  return <ChallengesFeaturePage viewModel={viewModel} />;
}
