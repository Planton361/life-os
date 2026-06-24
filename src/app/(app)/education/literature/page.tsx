import type { Metadata } from "next";
import { getEducationWorkspaceViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Literature | Life OS",
  description:
    "Sources, reading status and extraction queue for Education research.",
};

export default async function LiteraturePage() {
  const { EducationWorkspacePage } =
    await import("@/features/education");

  return (
    <EducationWorkspacePage
      pageKind="literature"
      viewModel={await getEducationWorkspaceViewModel()}
    />
  );
}
