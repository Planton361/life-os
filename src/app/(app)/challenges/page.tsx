import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Challenges",
  eyebrow: "Motivation workflow",
  summary:
    "Challenges will provide lightweight behavior prompts and progress constraints without turning Life OS into an XP game.",
  dataSource: "challenges, rewards, habits, tasks, daily_records, and review_records.",
  emptyTitle: "No challenges workflow connected yet",
  emptyDescription:
    "This skeleton reserves the Challenges route before challenge definitions, progress, and reward links are implemented.",
  accent: "var(--accent-orange)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function ChallengesPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
