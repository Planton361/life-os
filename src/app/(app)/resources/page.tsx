import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Resources",
  eyebrow: "Knowledge workbench",
  summary:
    "Resources will be the central workbench for reusable knowledge, references, materials, prompts, and source-backed notes.",
  dataSource: "resources as the canonical knowledge and reference entity.",
  emptyTitle: "No resources connected yet",
  emptyDescription:
    "This skeleton reserves the Resources route before capture, search, and relationship views are implemented.",
  accent: "var(--accent-cyan)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function ResourcesPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
