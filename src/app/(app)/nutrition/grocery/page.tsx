import type { Metadata } from "next";
import { GroceryView, getGroceryViewModel } from "@/features/nutrition/grocery";

export const metadata: Metadata = {
  title: "Grocery | Life OS",
  description:
    "Plan grocery demand from meals, estimate pantry coverage, and review receipt stubs locally.",
};

export default function GroceryPage() {
  const viewModel = getGroceryViewModel();

  return <GroceryView viewModel={viewModel} />;
}
