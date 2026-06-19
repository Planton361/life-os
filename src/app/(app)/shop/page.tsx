import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Shop",
  eyebrow: "Utility",
  summary:
    "Shop will later support purchase decisions, rewards, and useful inventory context without becoming a commerce feature.",
  dataSource: "purchase_decisions, rewards, inventory_items, resources, and challenges.",
  emptyTitle: "No shop utility connected yet",
  emptyDescription:
    "This skeleton keeps the Shop route available before reward logic, purchasing context, or inventory links are built.",
  accent: "var(--accent-yellow)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function ShopPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
