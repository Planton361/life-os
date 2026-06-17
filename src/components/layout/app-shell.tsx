import type { ReactNode } from "react";
import { CommandCenter } from "@/components/layout/command-center";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-dvh bg-[var(--bg-app)] text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--dashboard-max)] flex-col lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-app)]">
          <CommandCenter />
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
