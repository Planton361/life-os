import { NotesPage, getNotesPageViewModel } from "@/features/life";

export const metadata = {
  title: "Notes | Life OS",
  description:
    "Loose personal thoughts with local mock note capture and filtering.",
};

export default function LifeNotesRoute() {
  const viewModel = getNotesPageViewModel();

  return <NotesPage viewModel={viewModel} />;
}
