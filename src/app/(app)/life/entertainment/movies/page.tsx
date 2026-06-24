import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Movies",
  eyebrow: "Entertainment collection",
  summary:
    "Movies will track film-related collection state, notes, and references as a filtered Life entertainment view.",
  dataSource:
    "entertainment_items filtered by movies plus notes and resources.",
  emptyTitle: "No movies collection connected yet",
  emptyDescription:
    "This skeleton keeps the Movies route available before watch states, lists, and notes are implemented.",
  accent: "var(--accent-purple)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function MoviesPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
