import {
  EntertainmentPage,
  getEntertainmentPageViewModel,
} from "@/features/life";

export const metadata = {
  title: "Entertainment | Life OS",
  description:
    "Personal media list and recovery shelf with local mock media state.",
};

export default function LifeEntertainmentRoute() {
  const viewModel = getEntertainmentPageViewModel();

  return <EntertainmentPage viewModel={viewModel} />;
}
