import type { Metadata } from "next";
import { Suspense } from "react";
import { getResourcesViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Resources | Life OS",
  description:
    "Knowledge library for reusable resources, prompts, research notes and learnings.",
};

export default async function ResourcesPage() {
  const { ResourcesPage: ResourcesWorkbenchPage } =
    await import("@/features/resources");
  const viewModel = await getResourcesViewModel();

  return (
    <Suspense fallback={null}>
      <ResourcesWorkbenchPage viewModel={viewModel} />
    </Suspense>
  );
}
