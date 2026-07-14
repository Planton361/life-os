import { getLifeManualWorkspace, getNotesPageViewModel } from "@/features/profile-data";

export const metadata = {
  title: "Notes | Life OS",
  description:
    "Canonical personal notes with archive, restore and relation context.",
};

export default async function LifeNotesRoute({ searchParams }: Readonly<{ searchParams: Promise<{ state?: string }> }>) {
  const { NotesManualWorkspace, NotesPage } = await import("@/features/life");
  const [viewModel, workspace, params] = await Promise.all([getNotesPageViewModel(), getLifeManualWorkspace(), searchParams]);

  if (workspace !== undefined) return <NotesManualWorkspace state={params.state} workspace={workspace} />;
  return <NotesPage viewModel={viewModel} />;
}
