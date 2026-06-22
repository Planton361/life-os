import type { Metadata } from "next";
import { EntityDetailPage } from "@/features/entities";

export const metadata: Metadata = {
  title: "Goal Detail | Life OS",
};

export default async function GoalDetailPage({
  params,
}: Readonly<{
  params: Promise<{ goalId: string }>;
}>) {
  const { goalId } = await params;

  return <EntityDetailPage id={goalId} kind="goal" />;
}
