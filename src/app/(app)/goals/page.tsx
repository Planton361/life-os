import type { Metadata } from "next";
import { EntityWorkbenchPage } from "@/features/entities";
import type { WorkbenchSearchParams } from "@/features/entities/types";

export const metadata: Metadata = {
  title: "Goals | Life OS",
};

export default async function GoalsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<WorkbenchSearchParams>;
}>) {
  return <EntityWorkbenchPage kind="goal" searchParams={await searchParams} />;
}
