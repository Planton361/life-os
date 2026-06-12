"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Code2,
  FolderKanban,
  GraduationCap,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  Target,
  UserRound,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { APP_NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Today: CalendarCheck,
  Inbox,
  Week: CalendarDays,
  Projects: FolderKanban,
  Goals: Target,
  Review: ClipboardCheck,
  Education: GraduationCap,
  Work: BriefcaseBusiness,
  Coding: Code2,
  Health: HeartPulse,
  Nutrition: Utensils,
  Personal: UserRound,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[264px] shrink-0 border-r border-border/80 bg-sidebar px-3 py-4 lg:block">
      <div className="mb-5 px-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <BookOpen className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-5">Life OS</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Weniger Oberfläche. Mehr Steuerung.
            </p>
          </div>
        </div>
      </div>
      <nav aria-label="Hauptnavigation" className="space-y-1">
        {APP_NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.title];
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active && "border-border/70 bg-background shadow-sm"
              )}
            >
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
