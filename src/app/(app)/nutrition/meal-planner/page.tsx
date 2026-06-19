import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Meal Planner",
  eyebrow: "Nutrition workflow",
  summary:
    "Meal Planner will map planned meals to days, energy needs, recipes, and grocery demand without saving anything in this skeleton.",
  dataSource: "meals, recipes, daily_records, and calendar date context.",
  emptyTitle: "No meal planner connected yet",
  emptyDescription:
    "This skeleton reserves the Meal Planner route before planning forms, persistence, and nutrition calculations are implemented.",
  accent: "var(--accent-yellow)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function MealPlannerPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
