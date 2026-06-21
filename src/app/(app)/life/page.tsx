import {
  LifeOverviewPage,
  getLifeOverviewViewModel,
} from "@/features/life";

export const metadata = {
  title: "Life Overview | Life OS",
  description:
    "Personal Life overview for journal, loose notes, entertainment and inventory with local mock interactions.",
};

export default function LifePage() {
  const viewModel = getLifeOverviewViewModel();

  return <LifeOverviewPage viewModel={viewModel} />;
}
