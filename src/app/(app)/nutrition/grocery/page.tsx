import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Grocery",
  eyebrow: "Nutrition workflow",
  summary:
    "Grocery will translate meal plans, staples, and recipes into a practical shopping view without implementing purchase tracking yet.",
  dataSource: "grocery_items, recipes, meals, and later purchase_decisions.",
  emptyTitle: "No grocery workflow connected yet",
  emptyDescription:
    "This skeleton reserves the Grocery route before list generation, item states, and store context are built.",
  accent: "var(--accent-yellow)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function GroceryPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
