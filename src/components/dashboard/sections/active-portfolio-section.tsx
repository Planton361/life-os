"use client";

import {
  type DashboardActivePortfolio,
  type DashboardProfileId,
  type PortfolioItemKind,
  type PortfolioView,
} from "@/features/dashboard";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  type AccentStyle,
  Panel,
  Pill,
  ProgressBar,
  contentStateAttrs,
} from "./section-primitives";

const DASHBOARD_LINK_FOCUS_CLASSES =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

function countPortfolioKind(
  items: DashboardActivePortfolio["items"],
  kind: PortfolioItemKind,
) {
  return items.reduce(
    (count, project) => (project.kind === kind ? count + 1 : count),
    0,
  );
}

function kindForPortfolioView(view: PortfolioView): PortfolioItemKind {
  if (view === "Goal View") {
    return "goal";
  }

  if (view === "Skill View") {
    return "skill";
  }

  return "project";
}

export function ActivePortfolio({
  data,
  profileId,
}: Readonly<{
  data: DashboardActivePortfolio;
  profileId: DashboardProfileId;
}>) {
  const [activeView, setActiveView] = useState<PortfolioView>(data.activeView);
  const projects = data.items;
  const visibleProjects = projects.filter(
    (project) => project.kind === kindForPortfolioView(activeView),
  ).slice(0, 4);
  const activeViewCount = visibleProjects.length;
  const activePortfolioCounters = [
    {
      label: "Projects",
      value: countPortfolioKind(projects, "project"),
      href: "/portfolio?view=projects",
    },
    {
      label: "Goals",
      value: countPortfolioKind(projects, "goal"),
      href: "/portfolio?view=goals",
    },
    {
      label: "Skills",
      value: countPortfolioKind(projects, "skill"),
      href: "/portfolio?view=skills",
    },
  ] as const;

  const headerCounters = (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {activePortfolioCounters.map((counter, index) => (
        <Link
          aria-label={`Open portfolio ${counter.label.toLowerCase()} view`}
          className={cn(
            "rounded-full border border-[rgba(91,124,250,.20)] bg-[rgba(91,124,250,.09)] px-2.5 py-1 text-[9px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(91,124,250,.34)] hover:text-[var(--text-primary)]",
            DASHBOARD_LINK_FOCUS_CLASSES,
          )}
          href={counter.href}
          key={`active-portfolio-counter-${index}`}
        >
          {counter.value} {counter.label}
        </Link>
      ))}
    </div>
  );

  return (
    <Panel
      className="dashboard-portfolio border-[rgba(91,124,250,.16)] bg-[color-mix(in_srgb,var(--accent-blue)_4%,#101827)]"
      headerAccessory={headerCounters}
      stateAttrs={contentStateAttrs(
        {
          capacity: 4,
          itemCount: activeViewCount,
          state:
            activeViewCount === 0
              ? "empty"
              : activeViewCount >= 4
                ? "filled"
                : "partial",
        },
        profileId,
      )}
      subtitle={data.subtitle}
      title={data.title}
      titleClassName="text-xl"
      titleHref={data.href}
    >
      <div className="p-4 2xl:px-[22px] 2xl:pb-2 2xl:pt-3">
        <div className="mb-3 rounded-[13px] border border-[rgba(91,124,250,.18)] bg-[color-mix(in_srgb,var(--accent-blue)_5%,#0b1422)] p-3 2xl:mb-3">
          <div className="grid gap-3 2xl:grid-cols-[132px_minmax(0,1fr)] 2xl:items-center">
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                {data.viewTitle}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[var(--text-primary)]">
                {data.viewSubtitle}
              </p>
            </div>
            <div className="flex rounded-[13px] border border-[var(--border-subtle)] bg-[#0b1422] p-1 text-center text-[10px] font-semibold text-[var(--text-primary)]">
              {data.views.map((view, index) => (
                <button
                  aria-pressed={view.label === activeView}
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5",
                    DASHBOARD_LINK_FOCUS_CLASSES,
                    view.label === activeView &&
                      "border border-[rgba(91,124,250,.28)] bg-[rgba(91,124,250,.12)] text-[var(--text-secondary)]",
                  )}
                  key={`active-portfolio-view-${index}`}
                  onClick={() => setActiveView(view.label)}
                  onPointerDown={() => setActiveView(view.label)}
                  type="button"
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="portfolio-slots grid grid-cols-2 auto-rows-fr gap-3">
          {visibleProjects.map((project) => (
              <Link
                aria-label={`Open portfolio item: ${project.title}`}
                className={cn(
                  "min-w-0 block rounded-[13px] border p-3 2xl:min-h-[130px] 2xl:p-2.5",
                  DASHBOARD_LINK_FOCUS_CLASSES,
                )}
                href={project.href ?? data.href ?? "/portfolio?status=active"}
                key={project.id}
                style={
                  {
                    background: "color-mix(in srgb, var(--accent) 4%, #101a2a)",
                    borderColor:
                      "color-mix(in srgb, var(--accent) 26%, transparent)",
                    "--accent": project.accent,
                  } as AccentStyle
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="size-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_color-mix(in_srgb,var(--accent)_30%,transparent)]" />
                    <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {project.title}
                    </h3>
                  </div>
                  <Pill accent={project.accent}>{project.label}</Pill>
                </div>
                <p className="mt-2.5 text-[10px] font-medium text-[var(--text-secondary)]">
                  Next
                </p>
                <p className="mt-1 text-[10px] font-medium text-[var(--text-secondary)]">
                  {project.next}
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-medium text-[var(--text-secondary)]">
                    {project.meta}
                  </p>
                  <p className="text-[10px] font-medium text-[var(--text-secondary)]">
                    {project.progress}%
                  </p>
                </div>
                <div className="mt-2">
                  <ProgressBar
                    accent={project.accent}
                    progress={project.progress}
                  />
                </div>
              </Link>
          ))}
          {Array.from({ length: 4 - activeViewCount }, (_, index) => (
            <Link href={`/portfolio?view=${kindForPortfolioView(activeView)}s#portfolio-contextual-create-heading`} aria-label={`${kindForPortfolioView(activeView)} erstellen`} key={`empty-${index}`} data-portfolio-placeholder className="grid min-h-[130px] place-items-center rounded-[13px] border border-dashed border-[var(--border-subtle)] p-3 text-center text-[10px] text-[var(--text-muted)]">
              + {kindForPortfolioView(activeView) === "project" ? "Projekt" : kindForPortfolioView(activeView) === "goal" ? "Ziel" : "Skill"} erstellen
            </Link>
          ))}
        </div>
      </div>
    </Panel>
  );
}
