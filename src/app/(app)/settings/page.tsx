import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Settings",
  eyebrow: "System",
  summary:
    "Settings will hold account, privacy, preferences, integration, and system configuration after the static app phase.",
  dataSource: "profiles, preferences, privacy policy metadata, integrations, and later auth settings.",
  emptyTitle: "No settings surface connected yet",
  emptyDescription:
    "This skeleton keeps the Settings route available before account, privacy, integration, and system controls are implemented.",
  accent: "var(--accent-cyan)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function SettingsPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
