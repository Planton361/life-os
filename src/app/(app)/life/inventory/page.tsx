import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Inventory",
  eyebrow: "Entity workbench",
  summary:
    "Inventory will track owned or relevant physical items, purchase context, maintenance notes, and later lifecycle state.",
  dataSource: "inventory_items, purchase_decisions, resources, and notes.",
  emptyTitle: "No inventory workbench connected yet",
  emptyDescription:
    "This skeleton reserves the Inventory route before item records, detail pages, and lifecycle views are implemented.",
  accent: "var(--accent-purple)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function InventoryPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
