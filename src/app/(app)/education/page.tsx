import {
  RouteSkeletonPage,
  createRouteSkeletonMetadata,
  type RouteSkeletonConfig,
} from "@/components/layout/route-skeleton-page";

const routeConfig = {
  title: "Education",
  eyebrow: "Area overview",
  summary:
    "Education will collect scientific work, literature, learning logs, and study context as area views over canonical projects, resources, and skills.",
  dataSource: "scientific_works, literature_items, learning_logs, projects, skills, and resources.",
  emptyTitle: "No education overview connected yet",
  emptyDescription:
    "This skeleton keeps the Education area route available before study workflows and literature views are implemented.",
  accent: "var(--accent-blue)",
} satisfies RouteSkeletonConfig;

export const metadata = createRouteSkeletonMetadata(routeConfig);

export default function EducationPage() {
  return <RouteSkeletonPage config={routeConfig} />;
}
