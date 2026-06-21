import { Suspense, type ReactNode } from "react";
import { CommandCenterRouteGate } from "@/components/layout/command-center-route-gate";
import { Sidebar } from "@/components/layout/sidebar";

function SidebarFallback() {
  return (
    <aside
      aria-label="Loading navigation"
      className="border-b border-[var(--border-default)] bg-[var(--bg-app)] p-2 lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:border-b-0 lg:border-r"
    />
  );
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-dvh bg-[var(--bg-app)] text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--dashboard-max)] flex-col lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] 2xl:pl-[27px] 2xl:pr-0">
        <Suspense fallback={<SidebarFallback />}>
          <Sidebar />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-app)]">
          <CommandCenterRouteGate />
          <main
            className="min-w-0 flex-1 px-3 pb-3 pt-2 sm:px-4 lg:px-3"
            id="main-content"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
