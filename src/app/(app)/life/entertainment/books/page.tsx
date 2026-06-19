import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Books",
  eyebrow: "Entertainment collection",
  summary:
    "Books will show reading items, notes, and references as a Life entertainment view distinct from Education literature.",
  dataSource: "entertainment_items filtered by books plus notes, resources, and later literature links.",
  emptyTitle: "No books collection connected yet",
  emptyDescription:
    "This skeleton keeps the Books route available before reading states and note links are implemented.",
  accent: "var(--accent-purple)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function BooksPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
