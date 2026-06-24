import type { Metadata } from "next";
import { EntityWorkbenchPage } from "@/features/entities";
import type { WorkbenchSearchParams } from "@/features/entities/types";

export const metadata: Metadata = {
  title: "Skills | Life OS",
};

export default async function SkillsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<WorkbenchSearchParams>;
}>) {
  return <EntityWorkbenchPage kind="skill" searchParams={await searchParams} />;
}
