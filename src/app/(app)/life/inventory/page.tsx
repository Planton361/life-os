import { getInventoryPageViewModel } from "@/features/profile-data";

export const metadata = {
  title: "Inventory | Life OS",
  description:
    "Owned items, replacements and wishlist decisions with local mock inventory state.",
};

export default async function LifeInventoryRoute() {
  const { InventoryPage } =
    await import("@/features/life");
  const viewModel = await getInventoryPageViewModel();

  return <InventoryPage viewModel={viewModel} />;
}
