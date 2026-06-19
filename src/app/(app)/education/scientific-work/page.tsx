import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Scientific Work",
  eyebrow: "Domain workbench",
  summary:
    "Scientific Work will track thesis, research, writing, citations, and academic project context without creating a separate project system.",
  dataSource: "scientific_works, projects, tasks, literature_items, resources, and notes.",
  emptyTitle: "No scientific workbench connected yet",
  emptyDescription:
    "This skeleton reserves the Scientific Work route before research objects, writing states, and citation links are implemented.",
  accent: "var(--accent-blue)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function ScientificWorkPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
