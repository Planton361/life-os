import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Notes",
  eyebrow: "Knowledge workbench",
  summary:
    "Notes will provide a personal writing and memory view while keeping reusable references in the central Resources model.",
  dataSource: "notes, resources, journal_entries, tasks, and projects.",
  emptyTitle: "No notes workbench connected yet",
  emptyDescription:
    "This skeleton reserves the Notes route before note lists, detail pages, and resource links are implemented.",
  accent: "var(--accent-purple)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function NotesPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
