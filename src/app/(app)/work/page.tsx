import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { PLACEHOLDER_PAGES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Work",
};

export default function WorkPage() {
  return <PlaceholderPage {...PLACEHOLDER_PAGES["/work"]} />;
}
