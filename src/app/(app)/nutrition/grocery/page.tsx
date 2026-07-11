import type { Metadata } from "next";
import { getGroceryViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Grocery | Life OS",
  description:
    "Plan grocery demand from meals, estimate pantry coverage, and review receipt stubs locally.",
};

export default async function GroceryPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { GroceryView } =
    await import("@/features/nutrition/grocery");
  const { week } = await searchParams;
  const viewModel = await getGroceryViewModel(week);

  return <GroceryView viewModel={viewModel} />;
}
