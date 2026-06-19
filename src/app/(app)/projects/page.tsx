import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Projects",
  eyebrow: "Entity workbench",
  summary:
    "Projects will manage active and paused outcomes while staying visible from Portfolio, Today, Calendar, and area views.",
  dataSource: "projects plus linked tasks, goals, skills, and resources.",
  emptyTitle: "No project workbench connected yet",
  emptyDescription:
    "This skeleton keeps the Projects route available before project lists, details, and lifecycle controls exist.",
  accent: "var(--accent-blue)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function ProjectsPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
