import type { Metadata } from "next";
import { getChallengesViewModel, getChallengesWorkspace } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Challenges | Life OS",
  description:
    "Manual challenges with progress tracking and an append-only reward ledger.",
};

export default async function ChallengesPage({ searchParams }: Readonly<{ searchParams: Promise<{ state?: string }> }>) {
  const { ChallengesManualWorkspace, ChallengesPage: ChallengesFeaturePage } =
    await import("@/features/challenges");
  const [viewModel, workspace, params] = await Promise.all([getChallengesViewModel(), getChallengesWorkspace(), searchParams]);

  if (workspace !== undefined) return <ChallengesManualWorkspace state={params.state} workspace={workspace}/>;
  return <ChallengesFeaturePage viewModel={viewModel} />;
}
