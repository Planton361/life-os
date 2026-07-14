import { getLifeEntertainmentWorkspace, getLifeInventoryWorkspace, getLifeManualWorkspace, getLifeOverviewViewModel } from "@/features/profile-data";

export const metadata = {
  title: "Life Overview | Life OS",
  description:
    "Private Life context for reload-stable journal entries and canonical personal notes.",
};

export default async function LifePage() {
  const { LifeManualOverview, LifeOverviewPage } =
    await import("@/features/life");
  const [viewModel, workspace, entertainmentWorkspace, inventoryWorkspace] = await Promise.all([getLifeOverviewViewModel(), getLifeManualWorkspace(), getLifeEntertainmentWorkspace(), getLifeInventoryWorkspace()]);

  if (workspace !== undefined) return <LifeManualOverview entertainmentWorkspace={entertainmentWorkspace ?? null} inventoryWorkspace={inventoryWorkspace ?? null} workspace={workspace} />;
  return <LifeOverviewPage viewModel={viewModel} />;
}
