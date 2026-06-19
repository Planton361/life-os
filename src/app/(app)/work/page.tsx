import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Work",
  eyebrow: "Area overview",
  summary:
    "Work will collect work logs, wiki pages, meetings, tasks, and restricted context as area views over canonical Life OS entities.",
  dataSource: "work_logs, wiki_pages, meetings, tasks, projects, resources, and notes.",
  emptyTitle: "No work overview connected yet",
  emptyDescription:
    "This skeleton keeps the Work area route available before restricted work context and meeting workflows are implemented.",
  accent: "var(--accent-green)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function WorkPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
