import type { Metadata } from "next";
import { getWorkWikiViewModel, WorkWikiPage } from "@/features/work";

export const metadata: Metadata = {
  title: "Wiki | Life OS",
  description:
    "Personal work reference, process notes and architecture lookup with local mock data.",
};

export default function WorkWikiRoute() {
  return <WorkWikiPage viewModel={getWorkWikiViewModel()} />;
}
