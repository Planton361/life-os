import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Games",
  eyebrow: "Entertainment collection",
  summary:
    "Games will show planned, active, and archived game-related items as a filtered entertainment collection view.",
  dataSource: "entertainment_items filtered by games plus notes and resources.",
  emptyTitle: "No games collection connected yet",
  emptyDescription:
    "This skeleton reserves the Games route before collection states, backlog views, and notes are implemented.",
  accent: "var(--accent-purple)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function GamesPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
