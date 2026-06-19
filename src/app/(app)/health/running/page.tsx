import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Running Tracker",
  eyebrow: "Domain workbench",
  summary:
    "Running Tracker will summarize running sessions, training load, and recovery context without replacing the canonical workout records.",
  dataSource: "running_sessions, workouts, daily_records, and later recovery metrics.",
  emptyTitle: "No running tracker connected yet",
  emptyDescription:
    "This skeleton keeps the Running route available until session logs and training summaries are implemented.",
  accent: "var(--accent-orange)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function RunningPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
