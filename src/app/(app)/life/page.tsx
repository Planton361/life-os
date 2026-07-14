import { getLifeManualWorkspace, getLifeOverviewViewModel } from "@/features/profile-data";

export const metadata = {
  title: "Life Overview | Life OS",
  description:
    "Private Life context for reload-stable journal entries and canonical personal notes.",
};

export default async function LifePage() {
  const { LifeManualOverview, LifeOverviewPage } =
    await import("@/features/life");
  const [viewModel, workspace] = await Promise.all([getLifeOverviewViewModel(), getLifeManualWorkspace()]);

  if (workspace !== undefined) return <LifeManualOverview workspace={workspace} />;
  return <LifeOverviewPage viewModel={viewModel} />;
}
