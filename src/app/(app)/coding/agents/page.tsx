import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Agents",
  eyebrow: "Coding workflow",
  summary:
    "Agents will organize AI-assisted coding contexts, agent profiles, run history, and review boundaries after the manual source of truth is stable.",
  dataSource: "agent_profiles, agent_sessions, runs, repositories, tasks, and resources.",
  emptyTitle: "No agent workflow connected yet",
  emptyDescription:
    "This skeleton keeps the Agents route available before agent sessions, runs, and permission controls are implemented.",
  accent: "var(--accent-orange)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function AgentsPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
