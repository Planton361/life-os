import Link from "next/link";
import type { CSSProperties } from "react";
import { navigationItems, sidebarSections } from "@/lib/navigation";
import { cn } from "@/lib/cn";

function sectionStyle(accent: string): CSSProperties {
  return {
    "--section-accent": accent,
  } as CSSProperties;
}

export function Sidebar() {
  return (
    <aside className="border-b border-[var(--border-default)] bg-[var(--bg-app)] p-2 lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:border-b-0 lg:border-r">
      <div className="flex h-full min-h-0 flex-col rounded-[20px] border border-[var(--border-subtle)] bg-[#070b13] px-3 py-4 shadow-[0_8px_22px_rgba(0,0,0,0.12)] lg:h-[calc(100dvh-16px)] 2xl:max-h-[1424px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-[10px] border border-[rgba(91,124,250,.22)] bg-[rgba(91,124,250,.86)] text-[10px] font-semibold text-[var(--text-primary)]">
              LO
            </div>
            <p className="text-lg font-medium text-[var(--text-secondary)]">
              Life OS
            </p>
          </div>
          <span className="text-xs text-[var(--text-secondary)]" aria-hidden="true">
            ⌘
          </span>
        </div>

        <a
          className="mt-4 inline-flex rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-cyan)] lg:hidden"
          href="#main-content"
        >
          Inhalt
        </a>

        <div className="mt-3 flex flex-col items-center">
          <div className="grid size-24 place-items-center rounded-full bg-[rgba(91,124,250,.78)] text-3xl font-semibold text-[var(--text-primary)]">
            A
          </div>
          <p className="mt-3 text-base font-medium text-[var(--text-secondary)]">
            Anton
          </p>
          <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">
            Student · Work · Health
          </p>
        </div>

        <div
          aria-label="Search or command"
          className="mt-3.5 flex min-h-[33px] items-center justify-between rounded-[13px] border border-[rgba(168,183,204,.16)] bg-[#0c1422] px-4 text-[11px] font-medium text-[var(--text-secondary)]"
          role="search"
        >
          <span>Search or command</span>
          <kbd className="font-medium text-[10px] text-[var(--text-secondary)]">
            ⌘K
          </kbd>
        </div>

        <nav aria-label="Hauptnavigation" className="mt-3.5 flex min-h-0 flex-1 flex-col justify-between overflow-hidden">
          <div className="space-y-2">
            {navigationItems.map((item) =>
              item.status === "active" ? (
                <Link
                  aria-current="page"
                  className={cn(
                    "flex min-h-8 items-center rounded-[10px] border px-3 text-[11px] font-medium transition",
                    "border-[rgba(91,124,250,.28)] bg-[rgba(91,124,250,.14)] text-[var(--text-secondary)] hover:border-[rgba(91,124,250,.48)]",
                  )}
                  href={item.href}
                  key={item.label}
                >
                  <span
                    aria-hidden="true"
                    className="mr-3 size-3 rounded-full"
                    style={{ background: item.accent }}
                  />
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex min-h-8 items-center rounded-[10px] px-3 text-[11px] font-medium text-[var(--text-secondary)]"
                  key={item.label}
                >
                  <span
                    aria-hidden="true"
                    className="mr-3 size-3 rounded-full"
                    style={{ background: item.accent }}
                  />
                  {item.label}
                </span>
              ),
            )}
          </div>

          {sidebarSections.map((section) => (
            <section key={section.title} style={sectionStyle(section.accent)}>
              <div className="flex min-h-7 items-center justify-between gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--section-accent)_16%,transparent)] bg-[color-mix(in_srgb,var(--section-accent)_8%,transparent)] px-3">
                <h2 className="text-[9px] font-medium uppercase text-[var(--text-secondary)]">
                  {section.title}
                </h2>
                <p className="text-[7px] font-medium text-[var(--text-muted)]">
                  {section.summary}
                </p>
              </div>
              <div className="mt-2.5 space-y-2 px-2">
                {section.items.map((item) => (
                  <div className="grid grid-cols-[8px_minmax(0,1fr)] gap-3" key={item.label}>
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-2 rounded-full bg-[var(--section-accent)]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-medium text-[var(--text-secondary)]">
                        {item.label}
                        {typeof item.count === "number" ? (
                          <span className="ml-1 text-[8px] text-[var(--text-muted)]">
                            ({item.count})
                          </span>
                        ) : null}
                      </p>
                      {item.meta ? (
                        <p className="mt-0.5 truncate text-[7px] font-medium text-[var(--text-muted)]">
                          {item.meta}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </div>
    </aside>
  );
}
