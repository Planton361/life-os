import type { Metadata } from "next";
import {
  EducationWorkspacePage,
  getEducationWorkspaceViewModel,
} from "@/features/education";

export const metadata: Metadata = {
  title: "Literature | Life OS",
  description:
    "Sources, reading status and extraction queue for Education research.",
};

export default function LiteraturePage() {
  return (
    <EducationWorkspacePage
      pageKind="literature"
      viewModel={getEducationWorkspaceViewModel()}
    />
  );
}
