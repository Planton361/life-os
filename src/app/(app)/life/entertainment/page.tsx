import { getEntertainmentPageViewModel } from "@/features/profile-data";

export const metadata = {
  title: "Entertainment | Life OS",
  description:
    "Personal media list and recovery shelf with local mock media state.",
};

export default async function LifeEntertainmentRoute() {
  const { EntertainmentPage } =
    await import("@/features/life");
  const viewModel = await getEntertainmentPageViewModel();

  return <EntertainmentPage viewModel={viewModel} />;
}
