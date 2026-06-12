import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { PLACEHOLDER_PAGES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Week",
};

export default function WeekPage() {
  return <PlaceholderPage {...PLACEHOLDER_PAGES["/week"]} />;
}
