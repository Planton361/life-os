import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Life",
  eyebrow: "Area overview",
  summary:
    "Life will collect personal records, notes, entertainment, inventory, and private context without replacing the central task and resource layers.",
  dataSource:
    "journal_entries, notes, entertainment_items, inventory_items, resources, and daily_records.",
  emptyTitle: "No life overview connected yet",
  emptyDescription:
    "This skeleton reserves the Life area route before personal records and collection views are implemented.",
  accent: "var(--accent-purple)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function LifePage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
