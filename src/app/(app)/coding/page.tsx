import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Coding",
  eyebrow: "Area overview",
  summary:
    "Coding will collect repositories, agents, technical knowledge, and skill mapping as context views over work, resources, and learning data.",
  dataSource:
    "repositories, agent_profiles, skills, resources, learning_logs, and later agent_sessions.",
  emptyTitle: "No coding overview connected yet",
  emptyDescription:
    "This skeleton keeps the Coding area route available before repository, agent, and technical knowledge views are implemented.",
  accent: "var(--accent-blue)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function CodingPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
