import type { Metadata } from "next";
import { getEducationWorkspaceViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Scientific Work | Life OS",
  description:
    "Academic workbench for research ideas, questions, fields, papers, notes, and thesis focus.",
};

export default async function ScientificWorkPage() {
  const { EducationWorkspacePage } =
    await import("@/features/education");

  return (
    <EducationWorkspacePage
      pageKind="scientific-work"
      viewModel={await getEducationWorkspaceViewModel()}
    />
  );
}
