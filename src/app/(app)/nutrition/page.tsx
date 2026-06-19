import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Nutrition",
  eyebrow: "Area overview",
  summary:
    "Nutrition will connect meal planning, recipes, grocery planning, and daily nutrition signals as views over canonical food data.",
  dataSource: "meals, recipes, grocery_items, daily_records, and later nutrient summaries.",
  emptyTitle: "No nutrition overview connected yet",
  emptyDescription:
    "This skeleton keeps the Nutrition area route available before meal and grocery workflows exist.",
  accent: "var(--accent-yellow)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function NutritionPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
