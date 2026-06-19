"use client";

import { usePathname } from "next/navigation";
import { getDashboardViewModel } from "@/features/dashboard";
import { CommandCenter } from "@/components/layout/command-center";

export function CommandCenterRouteGate() {
  const pathname = usePathname();

  if (pathname !== "/dashboard") {
    return null;
  }

  const dashboard = getDashboardViewModel();

  return <CommandCenter data={dashboard.commandCenter} />;
}
