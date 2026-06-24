import type { Metadata } from "next";
import { getEducationOverviewViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Education Overview | Life OS",
  description:
    "Area dashboard for research ideas, literature, academic fields, research notes and open questions.",
};

export default async function EducationPage() {
  const { EducationOverviewPage } =
    await import("@/features/education");
  const viewModel = await getEducationOverviewViewModel();

  return <EducationOverviewPage viewModel={viewModel} />;
}
