import type { Metadata } from "next";
import { getShopViewModel, getShopWorkspace } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Shop | Life OS",
  description:
    "Reward Shop for intentional local Life Credit rewards without payments or random rewards.",
};

export default async function ShopPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ state?: string }> }>) {
  const { ShopManualWorkspace, ShopPage: ShopFeaturePage } =
    await import("@/features/shop");
  const [viewModel, workspace, params] = await Promise.all([
    getShopViewModel(),
    getShopWorkspace(),
    searchParams,
  ]);

  if (workspace !== undefined)
    return <ShopManualWorkspace state={params.state} workspace={workspace} />;
  return <ShopFeaturePage viewModel={viewModel} />;
}
