import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { PLACEHOLDER_PAGES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Health",
};

export default function HealthPage() {
  return <PlaceholderPage {...PLACEHOLDER_PAGES["/health"]} />;
}
