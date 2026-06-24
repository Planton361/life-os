import type { Metadata } from "next";
import { getWorkWikiViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Wiki | Life OS",
  description:
    "Personal work reference, process notes and architecture lookup with local mock data.",
};

export default async function WorkWikiRoute() {
  const { WorkWikiPage } =
    await import("@/features/work");

  return <WorkWikiPage viewModel={await getWorkWikiViewModel()} />;
}
