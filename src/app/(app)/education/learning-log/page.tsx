import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Learning Log",
  eyebrow: "Education workflow",
  summary:
    "Learning Log will record study sessions, insights, practice, and evidence that can feed skills, goals, and reviews.",
  dataSource: "learning_logs, skills, goals, projects, daily_records, and resources.",
  emptyTitle: "No learning log connected yet",
  emptyDescription:
    "This skeleton reserves the Learning Log route before study records, session summaries, and evidence links are implemented.",
  accent: "var(--accent-blue)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function LearningLogPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
