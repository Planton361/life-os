import type { Metadata } from "next";
import {
  RepositoriesPage,
  getRepositoriesViewModel,
} from "@/features/coding/repositories";

export const metadata: Metadata = {
  title: "Repositories | Life OS",
  description:
    "Coding repository workbench for linked projects, tasks, resources, agent sessions and next actions.",
};

export default function CodingRepositoriesPage() {
  const viewModel = getRepositoriesViewModel();

  return <RepositoriesPage viewModel={viewModel} />;
}
