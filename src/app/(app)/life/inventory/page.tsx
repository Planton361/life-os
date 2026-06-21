import { InventoryPage, getInventoryPageViewModel } from "@/features/life";

export const metadata = {
  title: "Inventory | Life OS",
  description:
    "Owned items, replacements and wishlist decisions with local mock inventory state.",
};

export default function LifeInventoryRoute() {
  const viewModel = getInventoryPageViewModel();

  return <InventoryPage viewModel={viewModel} />;
}
