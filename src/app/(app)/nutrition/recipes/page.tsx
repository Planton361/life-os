import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Recipes",
  eyebrow: "Entity workbench",
  summary:
    "Recipes will store reusable meal definitions and preparation references that can feed meal plans and grocery lists.",
  dataSource: "recipes plus linked resources, meals, and grocery_items.",
  emptyTitle: "No recipe workbench connected yet",
  emptyDescription:
    "This skeleton keeps the Recipes route available before recipe details, filters, and ingredient links exist.",
  accent: "var(--accent-yellow)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function RecipesPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
