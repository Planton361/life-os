import { getJournalPageViewModel } from "@/features/profile-data";

export const metadata = {
  title: "Journal | Life OS",
  description:
    "Private reflections and personal review notes with local mock writing flow.",
};

export default async function LifeJournalRoute() {
  const { JournalPage } =
    await import("@/features/life");
  const viewModel = await getJournalPageViewModel();

  return <JournalPage viewModel={viewModel} />;
}
