import type { Metadata } from "next";
import { DetailStubPage } from "@/components/layout/detail-stub-page";

export const metadata: Metadata = {
  title: "Goal Detail | Life OS",
};

export default async function GoalDetailPage({
  params,
}: Readonly<{
  params: Promise<{ goalId: string }>;
}>) {
  const { goalId } = await params;

  return (
    <DetailStubPage
      accent="var(--accent-purple)"
      dataSource="goals plus linked projects, habits, review records, and milestone evidence."
      entityId={goalId}
      entityLabel="Goal"
      summary="Minimal goal detail target for Active Portfolio prototype links."
      title="Goal Detail"
    />
  );
}
