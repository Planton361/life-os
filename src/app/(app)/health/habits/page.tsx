import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Habits",
  eyebrow: "Domain workbench",
  summary:
    "Habits will manage routines and habit logs as behavior signals that can appear in Today, Dashboard, Review, and Health views.",
  dataSource: "habits and habit_logs.",
  emptyTitle: "No habit workbench connected yet",
  emptyDescription:
    "This skeleton reserves the Habits route before habit definitions, logs, and review summaries exist.",
  accent: "var(--accent-red)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function HabitsPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
