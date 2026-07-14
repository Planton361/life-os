import { getInventoryPageViewModel, getLifeInventoryWorkspace } from "@/features/profile-data";

export const metadata = {
  title: "Inventory | Life OS",
  description:
    "Private inventory, wishlist and purchase decisions with explicit acquisition transfer.",
};

export default async function LifeInventoryRoute({ searchParams }: Readonly<{ searchParams: Promise<{ state?: string }> }>) {
  const { InventoryManualWorkspace, InventoryPage } =
    await import("@/features/life");
  const [viewModel, workspace, params] = await Promise.all([getInventoryPageViewModel(), getLifeInventoryWorkspace(), searchParams]);

  if (workspace !== undefined) return <InventoryManualWorkspace state={params.state} workspace={workspace}/>;
  return <InventoryPage viewModel={viewModel} />;
}
