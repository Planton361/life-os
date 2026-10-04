import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

function SidebarFallback() {
  return <div aria-hidden="true" className="life-os-sidebar" />;
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="life-os-shell min-h-dvh bg-[var(--bg-app)] text-[var(--text-primary)]">
      <div className="life-os-shell-frame">
        <Suspense fallback={<SidebarFallback />}>
          <Sidebar />
        </Suspense>
        <div className="life-os-shell-content flex min-w-0 flex-1 flex-col bg-[var(--bg-app)]">
          <main
            className="life-os-main min-w-0 flex-1"
            id="main-content"
            tabIndex={-1}
          >
            <div className="life-os-canvas">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
