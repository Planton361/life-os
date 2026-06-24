"use client";

import { usePathname } from "next/navigation";
import { CommandCenter } from "@/components/layout/command-center";
import type { DashboardCommandCenterViewModel } from "@/features/dashboard";

export function CommandCenterRouteGate({
  data,
}: Readonly<{
  data: DashboardCommandCenterViewModel;
}>) {
  const pathname = usePathname();

  if (pathname !== "/dashboard") {
    return null;
  }

  return <CommandCenter data={data} />;
}
