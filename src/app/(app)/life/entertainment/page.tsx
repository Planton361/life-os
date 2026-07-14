import { getEntertainmentPageViewModel, getLifeEntertainmentWorkspace } from "@/features/profile-data";

export const metadata = {
  title: "Entertainment | Life OS",
  description:
    "Private manual collections for books, movies, series and games.",
};

export default async function LifeEntertainmentRoute({ searchParams }: Readonly<{ searchParams: Promise<{ state?: string }> }>) {
  const { EntertainmentManualWorkspace, EntertainmentPage } =
    await import("@/features/life");
  const [viewModel, workspace, params] = await Promise.all([getEntertainmentPageViewModel(), getLifeEntertainmentWorkspace(), searchParams]);

  if (workspace !== undefined) return <EntertainmentManualWorkspace state={params.state} workspace={workspace}/>;
  return <EntertainmentPage viewModel={viewModel} />;
}
