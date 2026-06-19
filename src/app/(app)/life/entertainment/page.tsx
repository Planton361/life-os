import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Entertainment",
  eyebrow: "Collection overview",
  summary:
    "Entertainment will organize games, books, series, and movies as personal collection views without turning Life OS into a media tracker first.",
  dataSource: "entertainment_items, resources, notes, and later review or backlog metadata.",
  emptyTitle: "No entertainment overview connected yet",
  emptyDescription:
    "This skeleton keeps the Entertainment route available before collection filters and media detail records exist.",
  accent: "var(--accent-purple)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function EntertainmentPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
