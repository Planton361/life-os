import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Skills",
  eyebrow: "Entity workbench",
  summary:
    "Skills will track learning state, practice evidence, and applied capability across education, work, coding, and life contexts.",
  dataSource: "skills plus linked projects, resources, learning_logs, and evidence records.",
  emptyTitle: "No skill workbench connected yet",
  emptyDescription:
    "This skeleton keeps the Skills route available before skill states, evidence, and roadmap views are built.",
  accent: "var(--accent-blue)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function SkillsPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
