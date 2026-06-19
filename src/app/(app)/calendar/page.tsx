import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Calendar",
  eyebrow: "Temporal projection",
  summary:
    "Calendar will become the planning surface for dated work, events, reviews, and time-based views of canonical Life OS entities.",
  dataSource:
    "calendar_events plus dated fields from tasks, projects, goals, daily_records, and review_records.",
  emptyTitle: "No calendar surface connected yet",
  emptyDescription:
    "This skeleton reserves the Calendar route until the time projection and review-adjacent panels are wired.",
  accent: "var(--accent-cyan)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function CalendarPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
