import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";
import { getLifeEntertainmentWorkspace } from "@/features/profile-data";

const routeConfig = {
  title: "Books",
  eyebrow: "Entertainment collection",
  summary:
    "Books will show reading items, notes, and references as a Life entertainment view distinct from Education literature.",
  dataSource:
    "entertainment_items filtered by books plus notes, resources, and later literature links.",
  emptyTitle: "No books collection connected yet",
  emptyDescription:
    "This skeleton keeps the Books route available before reading states and note links are implemented.",
  accent: "var(--accent-purple)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default async function BooksPage({ searchParams }: Readonly<{ searchParams: Promise<{ state?: string }> }>) {
  const workspace = await getLifeEntertainmentWorkspace();
  if (workspace !== undefined) { const { EntertainmentManualWorkspace } = await import("@/features/life"); const params = await searchParams; return <EntertainmentManualWorkspace mediaType="book" state={params.state} workspace={workspace}/>; }
  return <RouteSkeletonPage config={routeConfig} />;
}
