import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ResourcesPage as ResourcesWorkbenchPage,
  getResourcesViewModel,
} from "@/features/resources";

export const metadata: Metadata = {
  title: "Resources | Life OS",
  description:
    "Knowledge library for reusable resources, prompts, research notes and learnings.",
};

export default function ResourcesPage() {
  const viewModel = getResourcesViewModel();

  return (
    <Suspense fallback={null}>
      <ResourcesWorkbenchPage viewModel={viewModel} />
    </Suspense>
  );
}
