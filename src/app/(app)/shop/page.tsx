import type { Metadata } from "next";
import { getShopViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Shop | Life OS",
  description:
    "Reward Shop for intentional local Life Credit rewards without payments or random rewards.",
};

export default async function ShopPage() {
  const { ShopPage: ShopFeaturePage } =
    await import("@/features/shop");
  const viewModel = await getShopViewModel();

  return <ShopFeaturePage viewModel={viewModel} />;
}
