import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Strength Tracker",
  eyebrow: "Domain workbench",
  summary:
    "Strength Tracker will organize strength sessions, movement patterns, and progression signals without creating a separate training data silo.",
  dataSource: "strength_sessions, workouts, daily_records, and later recovery metrics.",
  emptyTitle: "No strength tracker connected yet",
  emptyDescription:
    "This skeleton reserves the Strength route before workout logs and progression summaries are implemented.",
  accent: "var(--accent-orange)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function StrengthPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
