import { getJournalPageViewModel, getLifeManualWorkspace } from "@/features/profile-data";

export const metadata = {
  title: "Journal | Life OS",
  description:
    "Private dated journal entries with active and archived history.",
};

export default async function LifeJournalRoute({ searchParams }: Readonly<{ searchParams: Promise<{ state?: string }> }>) {
  const { JournalManualWorkspace, JournalPage } =
    await import("@/features/life");
  const [viewModel, workspace, params] = await Promise.all([getJournalPageViewModel(), getLifeManualWorkspace(), searchParams]);

  if (workspace !== undefined) return <JournalManualWorkspace state={params.state} workspace={workspace} />;
  return <JournalPage viewModel={viewModel} />;
}
