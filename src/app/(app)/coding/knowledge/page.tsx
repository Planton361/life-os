import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Coding Knowledge",
  eyebrow: "Knowledge view",
  summary:
    "Coding Knowledge will show technical notes, snippets, prompts, documentation, and references as a filtered view of the central Resources layer.",
  dataSource:
    "resources plus linked repositories, skills, projects, and agent context.",
  emptyTitle: "No coding knowledge view connected yet",
  emptyDescription:
    "This skeleton keeps the Coding Knowledge route available before resource filters and technical context links exist.",
  status: "Prepared",
  accent: "var(--accent-cyan)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function CodingKnowledgePage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
