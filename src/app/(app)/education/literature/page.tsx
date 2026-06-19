import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Literature",
  eyebrow: "Resource view",
  summary:
    "Literature will show academic reading, sources, annotations, and evidence as an education-focused view of resources and literature items.",
  dataSource: "literature_items, resources, scientific_works, notes, and projects.",
  emptyTitle: "No literature view connected yet",
  emptyDescription:
    "This skeleton keeps the Literature route available before source records, reading states, and annotations are implemented.",
  accent: "var(--accent-blue)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function LiteraturePage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
