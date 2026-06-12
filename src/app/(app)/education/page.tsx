import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { PLACEHOLDER_PAGES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Education",
};

export default function EducationPage() {
  return <PlaceholderPage {...PLACEHOLDER_PAGES["/education"]} />;
}
