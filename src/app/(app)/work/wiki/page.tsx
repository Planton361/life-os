import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Wiki",
  eyebrow: "Work knowledge view",
  summary:
    "Wiki will show work-specific knowledge, notes, and references while keeping reusable knowledge connected to the central Resources layer.",
  dataSource: "wiki_pages, resources, notes, projects, and work_logs.",
  emptyTitle: "No work wiki connected yet",
  emptyDescription:
    "This skeleton keeps the Work Wiki route available before pages, links, and restricted resource views are implemented.",
  accent: "var(--accent-green)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function WorkWikiPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
