import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Health & Fitness",
  eyebrow: "Area overview",
  summary:
    "Health & Fitness will collect mental health, habits, running, strength, and recovery signals as contextual views over sensitive health data.",
  dataSource:
    "habits, habit_logs, workouts, running_sessions, strength_sessions, daily_records, and later recovery signals.",
  emptyTitle: "No health overview connected yet",
  emptyDescription:
    "This skeleton reserves the area route while health-sensitive data remains unimplemented in Phase 2.",
  accent: "var(--accent-red)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function HealthPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
