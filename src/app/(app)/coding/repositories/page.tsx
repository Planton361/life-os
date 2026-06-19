import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Repositories",
  eyebrow: "Domain workbench",
  summary:
    "Repositories will track codebases, active branches, project links, and technical context without replacing Portfolio projects.",
  dataSource: "repositories plus linked projects, tasks, resources, and work_logs.",
  emptyTitle: "No repository workbench connected yet",
  emptyDescription:
    "This skeleton reserves the Repositories route before repo metadata, activity signals, and project links are wired.",
  accent: "var(--accent-blue)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function RepositoriesPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
