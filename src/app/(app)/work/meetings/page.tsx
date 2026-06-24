import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Meetings",
  eyebrow: "Work workflow",
  summary:
    "Meetings will organize agendas, notes, decisions, and follow-ups while routing concrete next steps back into Tasks or Work Log.",
  dataSource:
    "meetings, tasks, work_logs, resources, notes, and calendar_events.",
  emptyTitle: "No meetings workflow connected yet",
  emptyDescription:
    "This skeleton reserves the Meetings route before agendas, notes, decisions, and follow-up routing are implemented.",
  accent: "var(--accent-green)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function MeetingsPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
