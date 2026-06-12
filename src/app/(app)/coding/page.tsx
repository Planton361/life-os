import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { PLACEHOLDER_PAGES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Coding",
};

export default function CodingPage() {
  return <PlaceholderPage {...PLACEHOLDER_PAGES["/coding"]} />;
}
