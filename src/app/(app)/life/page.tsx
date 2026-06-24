import { getLifeOverviewViewModel } from "@/features/profile-data";

export const metadata = {
  title: "Life Overview | Life OS",
  description:
    "Personal Life overview for journal, loose notes, entertainment and inventory with local mock interactions.",
};

export default async function LifePage() {
  const { LifeOverviewPage } =
    await import("@/features/life");
  const viewModel = await getLifeOverviewViewModel();

  return <LifeOverviewPage viewModel={viewModel} />;
}
