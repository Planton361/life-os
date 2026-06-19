import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Mental Health",
  eyebrow: "Sensitive domain view",
  summary:
    "Mental Health will show mood, energy, stress, recovery, and reflection signals without turning sensitive notes into a dashboard widget flood.",
  dataSource:
    "daily_records, mood and energy logs, review_records, and later sleep or recovery signals.",
  emptyTitle: "No mental health view connected yet",
  emptyDescription:
    "This skeleton keeps the sensitive domain route available before private health data, labels, and consent boundaries are wired.",
  accent: "var(--accent-red)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function MentalHealthPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
