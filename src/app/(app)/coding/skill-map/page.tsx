import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Skill Map",
  eyebrow: "Projection",
  summary:
    "Skill Map will connect coding skills, evidence, dependencies, learning plans, repositories, and resources in one technical capability view.",
  dataSource: "skills, resources, repositories, projects, and learning_logs.",
  emptyTitle: "No coding skill map connected yet",
  emptyDescription:
    "This skeleton reserves the Skill Map route before dependency mapping and evidence views are implemented.",
  accent: "var(--accent-blue)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function SkillMapPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
