"use client";

import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { APP_NAV_ITEMS } from "@/lib/constants";

export function Topbar() {
  const pathname = usePathname();
  const currentRoute = APP_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-[var(--life-surface)]/90 px-4 backdrop-blur md:px-5 lg:px-6 xl:px-8 2xl:px-10">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-3">
        <MobileNav />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Life OS</p>
          <p className="truncate text-sm font-semibold text-foreground">
            {currentRoute?.title ?? "Dashboard"}
          </p>
        </div>
        <button
          type="button"
          className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm text-muted-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:flex"
          aria-label="Command Suche öffnen"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="truncate">Search / Command</span>
        </button>
        <Button type="button" className="gap-2" aria-label="Quick Add öffnen">
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Quick Add</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </header>
  );
}
