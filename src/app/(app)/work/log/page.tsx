import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Work Log",
  eyebrow: "Work workflow",
  summary:
    "Work Log will capture outcomes, context, decisions, and open loops from work without becoming a separate task system.",
  dataSource: "work_logs, tasks, projects, meetings, resources, and review_records.",
  emptyTitle: "No work log connected yet",
  emptyDescription:
    "This skeleton reserves the Work Log route before logs, follow-up links, and restricted context handling are implemented.",
  accent: "var(--accent-green)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function WorkLogPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
