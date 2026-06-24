import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Series",
  eyebrow: "Entertainment collection",
  summary:
    "Series will track show-related collection state and notes without competing with daily control or core planning surfaces.",
  dataSource:
    "entertainment_items filtered by series plus notes and resources.",
  emptyTitle: "No series collection connected yet",
  emptyDescription:
    "This skeleton reserves the Series route before watch states, lists, and notes are implemented.",
  accent: "var(--accent-purple)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function SeriesPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
