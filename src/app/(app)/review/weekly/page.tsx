import type { Metadata } from "next";
import { ReviewPage, getReviewPageViewModel } from "@/features/review";

export const metadata: Metadata = {
  title: "Weekly Review | Life OS",
};

export default async function WeeklyReviewPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ review?: string }>;
}>) {
  const [viewModel, query] = await Promise.all([
    getReviewPageViewModel("weekly"),
    searchParams,
  ]);

  return <ReviewPage feedback={query.review} viewModel={viewModel} />;
}
