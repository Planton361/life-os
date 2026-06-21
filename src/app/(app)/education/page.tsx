import type { Metadata } from "next";
import {
  EducationOverviewPage,
  getEducationOverviewViewModel,
} from "@/features/education";

export const metadata: Metadata = {
  title: "Education Overview | Life OS",
  description:
    "Area dashboard for research ideas, literature, academic fields, research notes and open questions.",
};

export default function EducationPage() {
  const viewModel = getEducationOverviewViewModel();

  return <EducationOverviewPage viewModel={viewModel} />;
}
