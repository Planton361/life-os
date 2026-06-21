import { JournalPage, getJournalPageViewModel } from "@/features/life";

export const metadata = {
  title: "Journal | Life OS",
  description:
    "Private reflections and personal review notes with local mock writing flow.",
};

export default function LifeJournalRoute() {
  const viewModel = getJournalPageViewModel();

  return <JournalPage viewModel={viewModel} />;
}
