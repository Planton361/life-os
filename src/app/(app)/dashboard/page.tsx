import type { Metadata } from "next";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

export const metadata: Metadata = {
  title: "Dashboard | Life OS",
};

export default async function DashboardPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ habit?: string | string[] }> }>) {
  const habit = (await searchParams).habit;
  return (
    <div>
      <h1 className="sr-only">Dashboard</h1>
      <DashboardGrid habitFeedback={Array.isArray(habit) ? habit[0] : habit} />
    </div>
  );
}
