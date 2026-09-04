"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import {
  sidebarNavigation,
  type NavigationItem,
  type NavigationSection,
} from "@/config/navigation";
import { cn } from "@/lib/cn";

type SidebarStyle = CSSProperties & {
  "--section-accent"?: string;
  "--item-accent"?: string;
};

type FlyoutPosition = {
  left: number;
  top: number;
};

type CurrentSearchParams = {
  get: (name: string) => string | null;
};

const FLYOUT_CLOSE_DELAY_MS = 140;
const NAV_ITEM_TEXT_CLASSES =
  "font-[inherit] text-[10px] font-medium leading-none";
const NAV_ITEM_LABEL_CLASSES =
  "min-w-0 truncate text-[10px] font-medium leading-none";
const NAV_ITEM_BASE_CLASSES = `flex min-h-[25px] w-full items-center rounded-[9px] border px-2.5 text-left ${NAV_ITEM_TEXT_CLASSES} transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]`;
const NAV_ITEM_ACTIVE_CLASSES =
  "border-[rgba(91,124,250,.34)] bg-[rgba(91,124,250,.16)] text-[var(--text-primary)] hover:border-[rgba(95,200,215,.34)]";
const NAV_ITEM_IDLE_CLASSES =
  "border-transparent text-[var(--text-muted)] opacity-70";
const NAV_ITEM_IDLE_HOVER_CLASSES =
  "border-transparent text-[var(--text-muted)] opacity-70 hover:border-[rgba(148,163,184,.14)] hover:bg-[rgba(148,163,184,.035)] hover:text-[var(--text-secondary)] hover:opacity-100";
const NAV_ITEM_PLANNED_CLASSES =
  "text-[var(--text-muted)] opacity-70 hover:opacity-85";
const NAV_ITEM_PLANNED_STATIC_CLASSES =
  "cursor-default text-[var(--text-muted)] opacity-70 hover:border-transparent hover:bg-transparent";
const SECTION_LABEL_CLASSES =
  "text-[10px] font-semibold uppercase text-[var(--text-secondary)]";

function sectionStyle(accent: string): SidebarStyle {
  return {
    "--section-accent": accent,
  };
}

function itemStyle(accent: string): SidebarStyle {
  return {
    "--item-accent": accent,
  };
}

function splitHref(href: string) {
  const [path, query = ""] = href.split("?");

  return {
    path,
    searchParams: new URLSearchParams(query),
  };
}

function isCurrentPath(
  pathname: string,
  searchParams: CurrentSearchParams,
  href: string,
) {
  const target = splitHref(href);

  if (target.searchParams.size > 0) {
    if (pathname !== target.path) {
      return false;
    }

    return Array.from(target.searchParams.entries()).every(
      ([key, value]) => searchParams.get(key) === value,
    );
  }

  return (
    pathname === target.path ||
    (target.path !== "/" && pathname.startsWith(`${target.path}/`))
  );
}

function isReadyActive(
  pathname: string,
  searchParams: CurrentSearchParams,
  item: NavigationItem,
) {
  return (
    item.status === "ready" && isCurrentPath(pathname, searchParams, item.href)
  );
}

function hasReadyActiveDescendant(
  pathname: string,
  searchParams: CurrentSearchParams,
  item: NavigationItem,
): boolean {
  return (
    isReadyActive(pathname, searchParams, item) ||
    Boolean(
      item.children?.some((child) =>
        hasReadyActiveDescendant(pathname, searchParams, child),
      ),
    )
  );
}

function sectionId(label: string) {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-navigation`;
}

function flyoutTop(rect: DOMRect, itemCount: number) {
  const estimatedHeight = 18 + itemCount * 28;
  const maxTop = window.innerHeight - estimatedHeight - 12;

  return Math.max(12, Math.min(rect.top - 2, maxTop));
}

function NavDot({
  active = false,
  muted = false,
}: Readonly<{ active?: boolean; muted?: boolean }>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mr-2 size-1.5 rounded-full bg-[var(--item-accent)]",
        active
          ? "opacity-90 shadow-[0_0_6px_color-mix(in_srgb,var(--item-accent)_32%,transparent)]"
          : muted
            ? "opacity-[.18]"
            : "opacity-[.22]",
      )}
    />
  );
}

function PlannedBadge() {
  return (
    <span className="ml-auto shrink-0 rounded-full border border-[rgba(148,163,184,.10)] bg-[rgba(148,163,184,.025)] px-1 py-0 text-[6px] font-medium uppercase tracking-[0.06em] text-[var(--text-faint)]">
      planned
    </span>
  );
}

function FlyoutChildItem({
  item,
  pathname,
  searchParams,
  accent,
  onSelect,
}: Readonly<{
  item: NavigationItem;
  pathname: string;
  searchParams: CurrentSearchParams;
  accent: string;
  onSelect: () => void;
}>) {
  const isCurrent = isReadyActive(pathname, searchParams, item);
  const itemClasses = cn(
    NAV_ITEM_BASE_CLASSES,
    isCurrent ? NAV_ITEM_ACTIVE_CLASSES : NAV_ITEM_IDLE_HOVER_CLASSES,
    item.status === "planned" && NAV_ITEM_PLANNED_STATIC_CLASSES,
  );

  if (item.status === "ready") {
    return (
      <Link
        aria-current={isCurrent ? "page" : undefined}
        className={itemClasses}
        href={item.href}
        onClick={onSelect}
        style={itemStyle(accent)}
      >
        <NavDot active={isCurrent} muted={!isCurrent} />
        <span className={NAV_ITEM_LABEL_CLASSES}>{item.label}</span>
      </Link>
    );
  }

  return (
    <button
      aria-disabled="true"
      className={itemClasses}
      onClick={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
        }
      }}
      style={itemStyle(accent)}
      type="button"
    >
      <NavDot muted />
      <span className={NAV_ITEM_LABEL_CLASSES}>{item.label}</span>
      <PlannedBadge />
    </button>
  );
}

function NavItem({
  item,
  pathname,
  searchParams,
  accent = "var(--accent-blue)",
}: Readonly<{
  item: NavigationItem;
  pathname: string;
  searchParams: CurrentSearchParams;
  accent?: string;
}>) {
  const isCurrent = isReadyActive(pathname, searchParams, item);
  const children = item.children ?? [];
  const isGroupActive = children.some((child) =>
    hasReadyActiveDescendant(pathname, searchParams, child),
  );
  const hasChildren = children.length > 0;
  const isExpandable = hasChildren;
  const flyoutId = useId();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownRef = useRef(false);
  const suppressNextFocusOpenRef = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isFlyoutPinned, setIsFlyoutPinned] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState<FlyoutPosition | null>(
    null,
  );
  const itemClasses = cn(
    NAV_ITEM_BASE_CLASSES,
    isCurrent ? NAV_ITEM_ACTIVE_CLASSES : NAV_ITEM_IDLE_CLASSES,
    item.status === "planned" && !isGroupActive && NAV_ITEM_PLANNED_CLASSES,
  );

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function updateFlyoutPosition() {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    setFlyoutPosition({
      left: rect.right + 8,
      top: flyoutTop(rect, children.length),
    });
  }

  function openFlyout() {
    if (!isExpandable) {
      return;
    }

    clearCloseTimer();
    updateFlyoutPosition();
    setIsFlyoutOpen(true);
  }

  function closeFlyout() {
    clearCloseTimer();
    setIsFlyoutPinned(false);
    setIsFlyoutOpen(false);
  }

  function returnFocusToTrigger() {
    suppressNextFocusOpenRef.current = true;
    triggerRef.current?.focus();
  }

  function scheduleCloseFlyout() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsFlyoutPinned(false);
      setIsFlyoutOpen(false);
    }, FLYOUT_CLOSE_DELAY_MS);
  }

  function handleContainerBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    scheduleCloseFlyout();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeFlyout();
      triggerRef.current?.focus();
      return;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      openFlyout();
      window.requestAnimationFrame(() => {
        flyoutRef.current?.querySelector<HTMLElement>("a, button")?.focus();
      });
    }
  }

  function handleFlyoutKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    closeFlyout();
    returnFocusToTrigger();
  }

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  useEffect(() => {
    if (!isFlyoutOpen || !isExpandable) {
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;

      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      setFlyoutPosition({
        left: rect.right + 8,
        top: flyoutTop(rect, children.length),
      });
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [children.length, isExpandable, isFlyoutOpen]);

  if (isExpandable) {
    const isExpandableActive = isCurrent || isGroupActive;
    const expandableItemClasses = cn(
      itemClasses,
      "cursor-pointer",
      isExpandableActive &&
        "border-[color-mix(in_srgb,var(--item-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--item-accent)_8%,transparent)] text-[var(--text-primary)]",
    );
    const triggerContent = (
      <>
        <NavDot active={isExpandableActive} muted={!isExpandableActive} />
        <span className={NAV_ITEM_LABEL_CLASSES}>{item.label}</span>
        {item.status === "planned" ? <PlannedBadge /> : null}
        <span
          aria-hidden="true"
          className="ml-1.5 shrink-0 text-[9px] text-[var(--text-muted)]"
        >
          ›
        </span>
      </>
    );

    return (
      <div
        className="relative"
        onBlur={handleContainerBlur}
        onFocus={() => {
          if (suppressNextFocusOpenRef.current) {
            suppressNextFocusOpenRef.current = false;
            return;
          }

          if (pointerDownRef.current) {
            return;
          }

          openFlyout();
        }}
        onKeyDown={handleFlyoutKeyDown}
        onMouseEnter={openFlyout}
        onMouseLeave={scheduleCloseFlyout}
      >
        {item.status === "ready" ? (
          <Link
            aria-controls={flyoutId}
            aria-current={isCurrent ? "page" : undefined}
            aria-expanded={isFlyoutOpen}
            className={expandableItemClasses}
            href={item.href}
            onClick={() => {
              pointerDownRef.current = false;
              closeFlyout();
            }}
            onKeyDown={handleTriggerKeyDown}
            onPointerDown={() => {
              pointerDownRef.current = true;
            }}
            ref={(node) => {
              triggerRef.current = node;
            }}
            style={itemStyle(accent)}
          >
            {triggerContent}
          </Link>
        ) : (
          <button
            aria-controls={flyoutId}
            aria-expanded={isFlyoutOpen}
            className={expandableItemClasses}
            onClick={() => {
              pointerDownRef.current = false;

              if (isFlyoutOpen && isFlyoutPinned) {
                closeFlyout();
                return;
              }

              setIsFlyoutPinned(true);
              openFlyout();
            }}
            onKeyDown={handleTriggerKeyDown}
            onPointerDown={() => {
              pointerDownRef.current = true;
            }}
            ref={(node) => {
              triggerRef.current = node;
            }}
            style={itemStyle(accent)}
            type="button"
          >
            {triggerContent}
          </button>
        )}
        {isFlyoutOpen && flyoutPosition ? (
          <div
            aria-label={`${item.label} Unterseiten`}
            className="fixed z-50 w-44 rounded-[12px] border border-[rgba(148,163,184,.16)] bg-[color-mix(in_srgb,var(--surface-2)_92%,#070b13)] py-1 shadow-[0_14px_34px_rgba(0,0,0,.24)]"
            id={flyoutId}
            onMouseEnter={clearCloseTimer}
            ref={flyoutRef}
            style={{
              ...itemStyle(accent),
              left: flyoutPosition.left,
              top: flyoutPosition.top,
            }}
          >
            <div className="space-y-0.5">
              {children.map((child) => (
                <FlyoutChildItem
                  accent={accent}
                  item={child}
                  key={child.href}
                  onSelect={closeFlyout}
                  pathname={pathname}
                  searchParams={searchParams}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (item.status === "ready") {
    return (
      <Link
        aria-current={isCurrent ? "page" : undefined}
        className={itemClasses}
        href={item.href}
        style={itemStyle(accent)}
      >
        <NavDot active={isCurrent} muted={!isCurrent} />
        <span className={NAV_ITEM_LABEL_CLASSES}>{item.label}</span>
      </Link>
    );
  }

  return (
    <span
      aria-disabled="true"
      className={itemClasses}
      style={itemStyle(accent)}
    >
      <NavDot muted />
      <span className={NAV_ITEM_LABEL_CLASSES}>{item.label}</span>
      <PlannedBadge />
    </span>
  );
}

function NavigationSectionBlock({
  section,
  pathname,
  searchParams,
}: Readonly<{
  section: NavigationSection;
  pathname: string;
  searchParams: CurrentSearchParams;
}>) {
  const id = sectionId(section.label);
  const isSectionLandingPage = pathname === section.href;
  const isSectionActive = isCurrentPath(pathname, searchParams, section.href);
  const sectionLabel = `${section.label} Area`;
  const sectionHeaderClasses = cn(
    "flex min-h-[24px] items-center rounded-[9px] border border-[color-mix(in_srgb,var(--section-accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--section-accent)_10%,transparent)] px-2.5 py-1 transition hover:border-[color-mix(in_srgb,var(--section-accent)_38%,transparent)] hover:bg-[color-mix(in_srgb,var(--section-accent)_14%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]",
    isSectionActive &&
      "border-[color-mix(in_srgb,var(--section-accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--section-accent)_16%,transparent)]",
  );

  return (
    <section aria-labelledby={id} style={sectionStyle(section.accent)}>
      <Link
        aria-current={isSectionLandingPage ? "page" : undefined}
        aria-label={`${sectionLabel} öffnen${
          isSectionActive ? " - aktive Area" : ""
        }`}
        className={sectionHeaderClasses}
        href={section.href}
      >
        <h2
          className={cn(
            SECTION_LABEL_CLASSES,
            isSectionActive && "text-[var(--text-primary)]",
          )}
          id={id}
        >
          {section.label}
        </h2>
      </Link>
      <div className="mt-0.5 space-y-0.5">
        {section.items.map((item) => (
          <NavItem
            accent={section.accent}
            item={item}
            key={item.href}
            pathname={pathname}
            searchParams={searchParams}
          />
        ))}
      </div>
    </section>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <aside className="border-b border-[var(--border-default)] bg-[var(--bg-app)] p-2 lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:border-b-0 lg:border-r">
      <div className="flex h-full min-h-0 flex-col rounded-[20px] border border-[rgba(91,124,250,.16)] bg-[color-mix(in_srgb,var(--accent-blue)_4%,#070b13)] px-3 py-3 shadow-[0_8px_22px_rgba(0,0,0,0.12)] lg:h-[calc(100dvh-16px)] 2xl:max-h-[1424px]">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-[10px] border border-[rgba(95,200,215,.22)] bg-[color-mix(in_srgb,var(--surface-2)_86%,var(--accent-blue))]"
          >
            <div className="relative size-5 rounded-[6px] border border-[rgba(184,195,214,.32)] bg-[rgba(7,11,18,.38)]">
              <span className="absolute left-1 top-1 h-1 w-3 rounded-full bg-[rgba(95,200,215,.46)]" />
              <span className="absolute bottom-1 left-1 h-1 w-2 rounded-full bg-[rgba(91,124,250,.48)]" />
              <span className="absolute bottom-1 right-1 size-1 rounded-[2px] bg-[rgba(184,195,214,.46)]" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-secondary)]">
              Life OS
            </p>
            <p className="mt-0.5 truncate text-[10px] font-medium text-[var(--text-muted)]">
              V5 / Linear Calm
            </p>
          </div>
        </div>

        <a
          className="mt-3 inline-flex rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-cyan)] lg:hidden"
          href="#main-content"
        >
          Inhalt
        </a>

        <div className="mt-3 flex items-center gap-2.5 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] px-2.5 py-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--accent-blue)_84%,var(--accent-cyan))] text-xs font-semibold text-[var(--text-primary)]">
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-secondary)]">
              Anton
            </p>
            <p className="mt-0.5 truncate text-[10px] font-medium text-[var(--text-muted)]">
              Student · Werkstudent
            </p>
          </div>
        </div>

        <div
          className="mt-4 flex min-h-[29px] items-center justify-between rounded-[11px] border border-[rgba(95,200,215,.18)] bg-[color-mix(in_srgb,var(--accent-cyan)_4%,#0c1422)] px-3 text-[10px] font-medium text-[var(--text-secondary)]"
          data-prepared-command-search
        >
          <span>Search / Command</span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Prepared
          </span>
        </div>

        <nav
          aria-label="Hauptnavigation"
          className="mt-4 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1"
        >
          <div className="space-y-0.5">
            {sidebarNavigation.primary.map((item) => (
              <NavItem
                item={item}
                key={item.href}
                pathname={pathname}
                searchParams={searchParams}
              />
            ))}
          </div>

          {sidebarNavigation.sections.map((section) => (
            <NavigationSectionBlock
              key={section.label}
              pathname={pathname}
              searchParams={searchParams}
              section={section}
            />
          ))}

          <div className="mt-auto space-y-0.5 border-t border-[var(--border-subtle)] pt-2">
            {sidebarNavigation.utility.map((item) => (
              <NavItem
                accent="var(--text-muted)"
                item={item}
                key={item.href}
                pathname={pathname}
                searchParams={searchParams}
              />
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
