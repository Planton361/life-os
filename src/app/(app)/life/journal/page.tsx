import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Journal",
  eyebrow: "Personal record workbench",
  summary:
    "Journal will hold private dated reflections and personal notes with sensitive data handling separate from public or work resources.",
  dataSource: "journal_entries, daily_records, review_records, and later privacy policy metadata.",
  emptyTitle: "No journal workbench connected yet",
  emptyDescription:
    "This skeleton keeps the Journal route available before private entries, detail pages, and privacy controls are implemented.",
  accent: "var(--accent-purple)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function JournalPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
