import type { Metadata } from "next";
import { ShopPage as ShopFeaturePage, getShopViewModel } from "@/features/shop";

export const metadata: Metadata = {
  title: "Shop | Life OS",
  description:
    "Reward Shop for intentional local Life Credit rewards without payments or random rewards.",
};

export default function ShopPage() {
  const viewModel = getShopViewModel();

  return <ShopFeaturePage viewModel={viewModel} />;
}
