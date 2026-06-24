import { getNotesPageViewModel } from "@/features/profile-data";

export const metadata = {
  title: "Notes | Life OS",
  description:
    "Loose personal thoughts with local mock note capture and filtering.",
};

export default async function LifeNotesRoute() {
  const { NotesPage } = await import("@/features/life");
  const viewModel = await getNotesPageViewModel();

  return <NotesPage viewModel={viewModel} />;
}
