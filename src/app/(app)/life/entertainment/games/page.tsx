import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";
import { getLifeEntertainmentWorkspace } from "@/features/profile-data";

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

export default async function GamesPage({ searchParams }: Readonly<{ searchParams: Promise<{ state?: string }> }>) {
  const workspace = await getLifeEntertainmentWorkspace();
  if (workspace !== undefined) { const { EntertainmentManualWorkspace } = await import("@/features/life"); const params = await searchParams; return <EntertainmentManualWorkspace mediaType="game" state={params.state} workspace={workspace}/>; }
  return <RouteSkeletonPage config={routeConfig} />;
}
