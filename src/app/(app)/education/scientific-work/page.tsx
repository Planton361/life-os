import type { Metadata } from "next";
import {
  EducationWorkspacePage,
  getEducationWorkspaceViewModel,
} from "@/features/education";

export const metadata: Metadata = {
  title: "Scientific Work | Life OS",
  description:
    "Academic workbench for research ideas, questions, fields, papers, notes, and thesis focus.",
};

export default function ScientificWorkPage() {
  return (
    <EducationWorkspacePage
      pageKind="scientific-work"
      viewModel={getEducationWorkspaceViewModel()}
    />
  );
}
