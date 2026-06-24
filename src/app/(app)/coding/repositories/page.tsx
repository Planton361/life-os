import type { Metadata } from "next";
import { getRepositoriesViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Repositories | Life OS",
  description:
    "Coding repository workbench for linked projects, tasks, resources, agent sessions and next actions.",
};

export default async function CodingRepositoriesPage() {
  const { RepositoriesPage } =
    await import("@/features/coding/repositories");
  const viewModel = await getRepositoriesViewModel();

  return <RepositoriesPage viewModel={viewModel} />;
}
