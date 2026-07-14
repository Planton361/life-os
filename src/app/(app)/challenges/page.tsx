import type { Metadata } from "next";
import {
  getAntiRotWorkspace,
  getChallengesViewModel,
  getChallengesWorkspace,
} from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Challenges | Life OS",
  description:
    "Manual challenges with progress tracking and an append-only reward ledger.",
};

export default async function ChallengesPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ state?: string }> }>) {
  const { ChallengesManualWorkspace, ChallengesPage: ChallengesFeaturePage } =
    await import("@/features/challenges");
  const [viewModel, workspace, antiRotWorkspace, params] = await Promise.all([
    getChallengesViewModel(),
    getChallengesWorkspace(),
    getAntiRotWorkspace(),
    searchParams,
  ]);

  if (workspace !== undefined)
    return (
      <ChallengesManualWorkspace
        antiRotWorkspace={antiRotWorkspace ?? null}
        state={params.state}
        workspace={workspace}
      />
    );
  return <ChallengesFeaturePage viewModel={viewModel} />;
}
