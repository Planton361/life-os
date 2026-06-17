import type { Metadata } from "next";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

export const metadata: Metadata = {
  title: "Dashboard | Life OS",
};

export default function DashboardPage() {
  return (
    <div>
      <h1 className="sr-only">Dashboard</h1>
      <DashboardGrid />
    </div>
  );
}
