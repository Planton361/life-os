import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Goals",
  eyebrow: "Entity workbench",
  summary:
    "Goals will track desired outcomes and progress signals without duplicating projects, habits, or review records.",
  dataSource: "goals plus linked projects, tasks, skills, habits, and review_records.",
  emptyTitle: "No goal workbench connected yet",
  emptyDescription:
    "This skeleton reserves the Goals route until the goal lifecycle and progress views are implemented.",
  accent: "var(--accent-blue)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function GoalsPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
