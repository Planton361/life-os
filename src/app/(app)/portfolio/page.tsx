import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Portfolio",
  eyebrow: "Entity overview",
  summary:
    "Portfolio will collect the active steering view for tasks, projects, goals, and skills without replacing their canonical workbenches.",
  dataSource: "tasks, projects, goals, and skills.",
  emptyTitle: "No portfolio overview connected yet",
  emptyDescription:
    "This skeleton keeps the Portfolio route available while the entity overview remains static.",
  accent: "var(--accent-blue)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function PortfolioPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
