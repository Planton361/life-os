import type { Metadata } from "next";
import { getGroceryViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Grocery | Life OS",
  description:
    "Plan grocery demand from meals, estimate pantry coverage, and review receipt stubs locally.",
};

export default async function GroceryPage() {
  const { GroceryView } =
    await import("@/features/nutrition/grocery");
  const viewModel = await getGroceryViewModel();

  return <GroceryView viewModel={viewModel} />;
}
