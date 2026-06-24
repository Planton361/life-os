"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  EmptyState,
  Pill,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import {
  contentStateDataAttributes,
  resolveContentStateMeta,
  type ContentStateMeta,
} from "@/features/content-state";
import { cn } from "@/lib/cn";
import type {
  EntertainmentItem,
  EntertainmentStatus,
  EntertainmentType,
  InventoryCategory,
  InventoryItem,
  InventoryStatus,
  JournalEntry,
  JournalMood,
  LifeActivity,
  LifeNote,
  LifeNoteType,
  LifeOverviewMetric,
  LifeOverviewViewModel,
  LifeReviewDot,
  LifeSectionSummary,
} from "../types";

type LifeView = "overview" | "journal" | "notes" | "entertainment" | "inventory";
type Priority = "low" | "medium" | "high";
type DialogKind = "journal" | "note" | "media" | "wishlist" | null;

type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info" | "error";
};

type LifeStyle = CSSProperties & {
  "--accent"?: string;
};

type JournalDraft = {
  title: string;
  mood: JournalMood;
  energyLabel: string;
  reflection: string;
  private: boolean;
};

type NoteDraft = {
  title: string;
  type: LifeNoteType;
  note: string;
  tags: string;
  source: LifeNote["source"];
  intentionallyUnstructured: boolean;
};

type MediaDraft = {
  title: string;
  type: EntertainmentType;
  status: EntertainmentStatus;
  priority: Priority;
  note: string;
  nextAction: string;
};

type WishlistDraft = {
  title: string;
  category: InventoryCategory;
  status: InventoryStatus;
  targetPrice: string;
  priority: Priority;
  budgetFit: InventoryItem["budgetFit"];
  note: string;
};

const lifeAccent = "var(--accent-purple)";

const lifeViews: readonly { value: LifeView; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "journal", label: "Journal" },
  { value: "notes", label: "Notes" },
  { value: "entertainment", label: "Entertainment" },
  { value: "inventory", label: "Inventory" },
];

const noteTypes: readonly LifeNoteType[] = [
  "thought",
  "memory",
  "idea",
  "reflection",
  "quote",
  "question",
  "misc",
];

const mediaTypes: readonly EntertainmentType[] = [
  "movie",
  "series",
  "book",
  "game",
  "video",
  "music",
  "podcast",
  "other",
];

const mediaStatuses: readonly EntertainmentStatus[] = [
  "wishlist",
  "watching",
  "reading",
  "playing",
  "paused",
  "finished",
  "archived",
];

const inventoryCategories: readonly InventoryCategory[] = [
  "tech",
  "desk",
  "clothing",
  "fitness",
  "home",
  "study",
  "software",
  "other",
];

const inventoryStatuses: readonly InventoryStatus[] = [
  "owned",
  "needs_replacement",
  "wishlist",
  "planned_purchase",
  "not_needed",
  "archived",
];

const priorities: readonly Priority[] = ["high", "medium", "low"];

const budgetFits: readonly InventoryItem["budgetFit"][] = [
  "fits",
  "wait",
  "too_expensive",
  "unknown",
];

const moodLabels: Record<JournalMood, string> = {
  calm: "Calm",
  stable: "Stable",
  tired: "Tired",
  stressed: "Stressed",
  overloaded: "Overloaded",
  unclear: "Unclear",
};

const noteTypeLabels: Record<LifeNoteType, string> = {
  thought: "Thought",
  memory: "Memory",
  idea: "Idea",
  reflection: "Reflection",
  quote: "Quote",
  question: "Question",
  misc: "Misc",
};

const noteSourceLabels: Record<LifeNote["source"], string> = {
  quick_capture: "Quick capture",
  manual: "Manual",
  journal: "Journal",
  import: "Import",
  system: "System",
};

const mediaTypeLabels: Record<EntertainmentType, string> = {
  movie: "Movie",
  series: "Series",
  book: "Book",
  game: "Game",
  video: "Video",
  music: "Music",
  podcast: "Podcast",
  other: "Other",
};

const mediaStatusLabels: Record<EntertainmentStatus, string> = {
  wishlist: "Wishlist",
  watching: "Watching",
  reading: "Reading",
  playing: "Playing",
  paused: "Paused",
  finished: "Finished",
  archived: "Archived",
};

const inventoryCategoryLabels: Record<InventoryCategory, string> = {
  tech: "Tech",
  desk: "Desk",
  clothing: "Clothing",
  fitness: "Fitness",
  home: "Home",
  study: "Learning",
  software: "Software",
  other: "Other",
};

const inventoryStatusLabels: Record<InventoryStatus, string> = {
  owned: "Owned",
  needs_replacement: "Needs replacement",
  wishlist: "Wishlist",
  planned_purchase: "Planned purchase",
  not_needed: "Not needed",
  archived: "Archived",
};

const budgetFitLabels: Record<InventoryItem["budgetFit"], string> = {
  fits: "Fits",
  wait: "Wait",
  too_expensive: "Too expensive",
  unknown: "Unknown",
};

const toneAccents: Record<
  "purple" | "cyan" | "blue" | "orange" | "green" | "red" | "gray",
  string
> = {
  purple: "var(--accent-purple)",
  cyan: "var(--accent-cyan)",
  blue: "var(--accent-blue)",
  orange: "var(--accent-orange)",
  green: "var(--accent-green)",
  red: "var(--accent-red)",
  gray: "var(--text-muted)",
};

const moodAccents: Record<JournalMood, string> = {
  calm: "var(--accent-cyan)",
  stable: "var(--accent-purple)",
  tired: "var(--text-muted)",
  stressed: "var(--accent-orange)",
  overloaded: "var(--accent-red)",
  unclear: "var(--text-muted)",
};

const buttonBaseClass =
  "inline-flex min-h-11 items-center justify-center rounded-[12px] border px-4 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

const primaryButtonClass = cn(
  buttonBaseClass,
  "border-[rgba(155,124,246,.34)] bg-[rgba(155,124,246,.92)] text-[var(--bg-app)] hover:bg-[rgba(155,124,246,1)]",
);

const secondaryButtonClass = cn(
  buttonBaseClass,
  "border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
);

const quietButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

const chipButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-[999px] border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

const inputClass =
  "mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatMoney(value?: number) {
  if (typeof value !== "number") {
    return "not set";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function normalizeTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function localId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function compactText(value: string, limit = 138) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1).trim()}...`;
}

function getPriorityRank(priority: Priority) {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
}

function FieldLabel({
  children,
  optional = false,
}: Readonly<{
  children: string;
  optional?: boolean;
}>) {
  return (
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
      {children}
      {optional ? (
        <span className="ml-1 font-medium normal-case tracking-normal text-[var(--text-faint)]">
          optional
        </span>
      ) : null}
    </span>
  );
}

function StatusDot({
  accent,
  label,
}: Readonly<{
  accent: string;
  label: string;
}>) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="size-2 rounded-full bg-[var(--accent)]"
        style={accentStyle(accent)}
      />
      <span>{label}</span>
    </span>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className,
  action,
  sectionAttribute,
  stateAttributes,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  sectionAttribute?: Record<string, string>;
  stateAttributes?: Record<string, string>;
}>) {
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "min-w-0 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
      {...stateAttributes}
      {...sectionAttribute}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2
              className="text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
              id={headingId}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function LifePageHeader({
  header,
  onAddMedia,
  onCaptureNote,
  onNewJournal,
  onWishlist,
}: Readonly<{
  header: LifeOverviewViewModel["header"];
  onAddMedia: () => void;
  onCaptureNote: () => void;
  onNewJournal: () => void;
  onWishlist: () => void;
}>) {
  return (
    <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.78)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-4 bg-[linear-gradient(90deg,rgba(155,124,246,.07),transparent_48%)] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-purple)]">
            {header.eyebrow}
          </p>
          <h1 className="mt-2 text-[30px] font-semibold leading-none text-[var(--text-primary)] sm:text-[34px]">
            {header.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {header.summary}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            {header.context}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button className={primaryButtonClass} onClick={onNewJournal} type="button">
            New journal entry
          </button>
          <button
            className={cn(secondaryButtonClass, "hidden sm:inline-flex")}
            onClick={onCaptureNote}
            type="button"
          >
            Capture note
          </button>
          <button
            className={cn(secondaryButtonClass, "hidden sm:inline-flex")}
            onClick={onWishlist}
            type="button"
          >
            Add wishlist item
          </button>
          <button
            className={cn(secondaryButtonClass, "hidden md:inline-flex")}
            onClick={onAddMedia}
            type="button"
          >
            Add media
          </button>
        </div>
      </div>
    </header>
  );
}

function SegmentControl({
  activeView,
  onChange,
}: Readonly<{
  activeView: LifeView;
  onChange: (view: LifeView) => void;
}>) {
  return (
    <section
      aria-label="Life overview views"
      className="flex flex-wrap gap-2 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.68)] p-2"
    >
      {lifeViews.map((view) => {
        const active = view.value === activeView;

        return (
          <button
            aria-pressed={active}
            className={cn(
              chipButtonClass,
              active
                ? "border-[rgba(155,124,246,.42)] bg-[rgba(155,124,246,.16)] text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]",
            )}
            key={view.value}
            onClick={() => onChange(view.value)}
            type="button"
          >
            {view.label}
          </button>
        );
      })}
    </section>
  );
}

function PersonalCheckInCard({
  journalEntries,
  onOpenJournal,
  onStartReflection,
  reviewDots,
  stateAttributes,
  statusLabel,
}: Readonly<{
  journalEntries: JournalEntry[];
  onOpenJournal: () => void;
  onStartReflection: () => void;
  reviewDots: LifeReviewDot[];
  stateAttributes: Record<string, string>;
  statusLabel: string;
}>) {
  const latestEntry = journalEntries[0] ?? null;

  return (
    <Panel
      action={
        <div className="flex flex-wrap gap-2">
          <button className={primaryButtonClass} onClick={onStartReflection} type="button">
            Start reflection
          </button>
          <Link className={secondaryButtonClass} href="/life/journal" onClick={onOpenJournal}>
            Open journal
          </Link>
        </div>
      }
      className="border-[color-mix(in_srgb,var(--accent-purple)_22%,var(--border-subtle))]"
      sectionAttribute={{ "data-life-section": "personal-check-in" }}
      stateAttributes={stateAttributes}
      subtitle="Private reflection, open review prompt and recent journal context without scores or medical labels."
      title="Personal Check-in"
    >
      {!latestEntry ? (
        <EmptyState
          description="Reflexionen erscheinen hier, sobald lokale Journal-Einträge existieren."
          title="Noch kein persönlicher Check-in"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill accent={moodAccents[latestEntry.mood]}>
                {moodLabels[latestEntry.mood]}
              </Pill>
              <Pill accent="var(--accent-cyan)" quiet>
                {statusLabel}
              </Pill>
              {latestEntry.privacy !== "normal" ? (
                <Pill accent="var(--accent-purple)" quiet>
                  Private by default
                </Pill>
              ) : null}
            </div>
            <h3 className="mt-4 text-2xl font-semibold leading-tight text-[var(--text-primary)]">
              {latestEntry.title}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {latestEntry.summary}
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div className="border-t border-[var(--border-subtle)] pt-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                  Last entry
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {formatDate(latestEntry.date)} / {latestEntry.energyLabel}
                </dd>
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-3 sm:col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                  Open review prompt
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {latestEntry.reflectionPrompt}
                </dd>
              </div>
            </dl>
          </div>

          <div className="min-w-0 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.32)] p-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              7-day review trace
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Text labels keep this reflective, not diagnostic.
            </p>
            <ul className="mt-4 grid grid-cols-7 gap-2" aria-label="Seven day review trace">
              {reviewDots.map((dot) => (
                <li className="min-w-0 text-center" key={dot.id}>
                  <span
                    aria-hidden="true"
                    className="mx-auto block size-3 rounded-full bg-[var(--accent)]"
                    style={accentStyle(moodAccents[dot.mood])}
                  />
                  <span className="mt-2 block text-[10px] font-semibold text-[var(--text-secondary)]">
                    {dot.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[9px] text-[var(--text-muted)]">
                    {dot.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Panel>
  );
}

function QuickActions({
  onAddMedia,
  onCaptureNote,
  onNewJournal,
  onWishlist,
}: Readonly<{
  onAddMedia: () => void;
  onCaptureNote: () => void;
  onNewJournal: () => void;
  onWishlist: () => void;
}>) {
  return (
    <section
      aria-label="Life quick actions"
      className="grid grid-cols-2 gap-2 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.68)] p-2 sm:grid-cols-4 lg:hidden"
    >
      <button className={secondaryButtonClass} onClick={onNewJournal} type="button">
        Journal
      </button>
      <button className={secondaryButtonClass} onClick={onCaptureNote} type="button">
        Note
      </button>
      <button className={secondaryButtonClass} onClick={onAddMedia} type="button">
        Media
      </button>
      <button className={secondaryButtonClass} onClick={onWishlist} type="button">
        Wishlist
      </button>
    </section>
  );
}

function LifeSectionCards({
  sections,
  onAction,
  stateAttributes,
}: Readonly<{
  sections: LifeSectionSummary[];
  onAction: (section: LifeSectionSummary) => void;
  stateAttributes: Record<string, string>;
}>) {
  return (
    <Panel
      sectionAttribute={{ "data-life-section": "life-sections" }}
      stateAttributes={stateAttributes}
      subtitle="Each section opens an existing Life route; the overview keeps only personal context depth."
      title="Life Sections"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <article
            className="flex min-h-[230px] flex-col rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,#0f1724)] p-4"
            key={section.id}
            style={accentStyle(toneAccents[section.accent])}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {section.title}
              </h3>
              <Pill accent={toneAccents[section.accent]} quiet>
                {section.openItems}
              </Pill>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
              {section.purpose}
            </p>
            <dl className="mt-4 grid gap-3 text-xs">
              <div>
                <dt className="font-semibold text-[var(--text-faint)]">
                  Last activity
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {section.lastActivity}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--text-faint)]">
                  Next action
                </dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {section.nextAction}
                </dd>
              </div>
            </dl>
            <div className="mt-auto pt-4">
              <Link
                className={quietButtonClass}
                href={section.href}
                onClick={() => onAction(section)}
              >
                Open {section.title.toLowerCase()}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function FilterSelect<TValue extends string>({
  label,
  onChange,
  options,
  value,
}: Readonly<{
  label: string;
  onChange: (value: TValue) => void;
  options: readonly { value: TValue; label: string }[];
  value: TValue;
}>) {
  return (
    <label className="min-w-[150px] flex-1">
      <FieldLabel>{label}</FieldLabel>
      <select
        className={cn(inputClass, "min-h-10")}
        onChange={(event) => onChange(event.target.value as TValue)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LooseNotesPanel({
  noteSearch,
  noteType,
  notes,
  onKeepNote,
  onOpenNote,
  onSearchChange,
  onTagChange,
  onTypeChange,
  selectedTag,
  stateAttributes,
  tags,
  totalCount,
}: Readonly<{
  noteSearch: string;
  noteType: LifeNoteType | "all";
  notes: LifeNote[];
  onKeepNote: (note: LifeNote) => void;
  onOpenNote: (note: LifeNote) => void;
  onSearchChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onTypeChange: (value: LifeNoteType | "all") => void;
  selectedTag: string;
  stateAttributes: Record<string, string>;
  tags: string[];
  totalCount: number;
}>) {
  return (
    <Panel
      action={<Pill accent="var(--accent-cyan)">{notes.length} shown</Pill>}
      sectionAttribute={{ "data-life-section": "loose-notes" }}
      stateAttributes={stateAttributes}
      subtitle="Thoughts are preserved here without automatic task or knowledge conversion."
      title="Loose Notes"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px]">
        <label>
          <FieldLabel>Search life notes</FieldLabel>
          <input
            className={inputClass}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search life notes"
            type="search"
            value={noteSearch}
          />
        </label>
        <FilterSelect
          label="Note type"
          onChange={onTypeChange}
          options={[
            { value: "all", label: "All types" },
            ...noteTypes.map((type) => ({
              value: type,
              label: noteTypeLabels[type],
            })),
          ]}
          value={noteType}
        />
        <FilterSelect
          label="Tag"
          onChange={onTagChange}
          options={[
            { value: "all", label: "All tags" },
            ...tags.map((tag) => ({ value: tag, label: tag })),
          ]}
          value={selectedTag}
        />
      </div>

      <div className="mt-4 grid gap-3">
        {totalCount === 0 ? (
          <EmptyState
            description="Erfasste Gedanken bleiben hier getrennt von Tasks und Resources."
            title="Noch keine losen Notizen"
          />
        ) : notes.length === 0 ? (
          <EmptyState
            description="No notes match the current search or filters. Clear the query or choose a different type or tag."
            title="No life notes found"
          />
        ) : (
          notes.map((note) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3"
              key={note.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Pill accent="var(--accent-cyan)">
                      {noteTypeLabels[note.type]}
                    </Pill>
                    <Pill accent="var(--text-muted)" quiet>
                      {noteSourceLabels[note.source]}
                    </Pill>
                    {note.intentionallyUnstructured ? (
                      <Pill accent="var(--accent-blue)" quiet>
                        Kept loose
                      </Pill>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                    {note.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {compactText(note.snippet)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {note.tags.map((tag) => (
                      <span
                        className="rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] px-2 py-1 text-[10px] text-[var(--text-muted)]"
                        key={tag}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="shrink-0 text-[10px] text-[var(--text-muted)]">
                  {formatDate(note.createdAt)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={quietButtonClass} onClick={() => onOpenNote(note)} type="button">
                  Open note
                </button>
                <button className={quietButtonClass} onClick={() => onKeepNote(note)} type="button">
                  Keep as note
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </Panel>
  );
}

function InventoryWishlistFocus({
  inventoryStatus,
  items,
  onAddWishlist,
  onInventoryStatusChange,
  onPriorityChange,
  priorityFilter,
  stateAttributes,
  totalCount,
}: Readonly<{
  inventoryStatus: InventoryStatus | "all";
  items: InventoryItem[];
  onAddWishlist: () => void;
  onInventoryStatusChange: (status: InventoryStatus | "all") => void;
  onPriorityChange: (priority: Priority | "all") => void;
  priorityFilter: Priority | "all";
  stateAttributes: Record<string, string>;
  totalCount: number;
}>) {
  return (
    <Panel
      action={
        <button className={secondaryButtonClass} onClick={onAddWishlist} type="button">
          Add wishlist item
        </button>
      }
      sectionAttribute={{ "data-life-section": "inventory-focus" }}
      stateAttributes={stateAttributes}
      subtitle="Possessions, replacement needs and wishlist choices stay text-led with budget-fit labels."
      title="Inventory & Wishlist Focus"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FilterSelect
          label="Inventory status"
          onChange={onInventoryStatusChange}
          options={[
            { value: "all", label: "All statuses" },
            ...inventoryStatuses.map((status) => ({
              value: status,
              label: inventoryStatusLabels[status],
            })),
          ]}
          value={inventoryStatus}
        />
        <FilterSelect
          label="Priority"
          onChange={onPriorityChange}
          options={[
            { value: "all", label: "All priorities" },
            ...priorities.map((priority) => ({
              value: priority,
              label: `${priority[0].toUpperCase()}${priority.slice(1)}`,
            })),
          ]}
          value={priorityFilter}
        />
      </div>

      <div className="mt-4 grid gap-3">
        {totalCount === 0 ? (
          <EmptyState
            description="Besitz, Wünsche und Ersatzbedarf erscheinen hier, sobald lokale Einträge existieren."
            title="Noch keine Inventareinträge"
          />
        ) : items.length === 0 ? (
          <EmptyState
            description="No inventory item matches this local filter. Change status or priority to continue."
            title="No inventory matches"
          />
        ) : (
          items.map((item) => (
            <article
              className="rounded-[14px] border border-[color-mix(in_srgb,var(--accent-orange)_18%,var(--border-subtle))] bg-[rgba(11,17,28,.30)] p-3"
              key={item.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {item.note ?? "No note added yet."}
                  </p>
                </div>
                <Pill accent="var(--accent-orange)">
                  {budgetFitLabels[item.budgetFit]}
                </Pill>
              </div>
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-[var(--text-faint)]">Status</dt>
                  <dd className="mt-1 text-[var(--text-secondary)]">
                    {inventoryStatusLabels[item.status]}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-faint)]">Category</dt>
                  <dd className="mt-1 text-[var(--text-secondary)]">
                    {inventoryCategoryLabels[item.category]}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-faint)]">Target price</dt>
                  <dd className="mt-1 text-[var(--text-secondary)]">
                    {formatMoney(item.targetPrice ?? item.estimatedValue)}
                  </dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </div>
      <div className="mt-4">
        <Link className={quietButtonClass} href="/life/inventory">
          Open inventory
        </Link>
      </div>
    </Panel>
  );
}

function EntertainmentShelf({
  items,
  mediaStatus,
  onAddMedia,
  onMediaStatusChange,
  onPriorityChange,
  priorityFilter,
  stateAttributes,
  totalCount,
}: Readonly<{
  items: EntertainmentItem[];
  mediaStatus: EntertainmentStatus | "all";
  onAddMedia: () => void;
  onMediaStatusChange: (status: EntertainmentStatus | "all") => void;
  onPriorityChange: (priority: Priority | "all") => void;
  priorityFilter: Priority | "all";
  stateAttributes: Record<string, string>;
  totalCount: number;
}>) {
  return (
    <Panel
      action={
        <button className={secondaryButtonClass} onClick={onAddMedia} type="button">
          Add media
        </button>
      }
      sectionAttribute={{ "data-life-section": "entertainment-shelf" }}
      stateAttributes={stateAttributes}
      subtitle="A compact personal media shelf without ratings, public profiles or social mechanics."
      title="Entertainment Shelf"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FilterSelect
          label="Media status"
          onChange={onMediaStatusChange}
          options={[
            { value: "all", label: "All statuses" },
            ...mediaStatuses.map((status) => ({
              value: status,
              label: mediaStatusLabels[status],
            })),
          ]}
          value={mediaStatus}
        />
        <FilterSelect
          label="Priority"
          onChange={onPriorityChange}
          options={[
            { value: "all", label: "All priorities" },
            ...priorities.map((priority) => ({
              value: priority,
              label: `${priority[0].toUpperCase()}${priority.slice(1)}`,
            })),
          ]}
          value={priorityFilter}
        />
      </div>

      <div className="mt-4 grid gap-3">
        {totalCount === 0 ? (
          <EmptyState
            description="Medien erscheinen hier, sobald du lokale Einträge erfasst. Keine Social- oder Rating-Integration."
            title="Noch keine Medien"
          />
        ) : items.length === 0 ? (
          <EmptyState
            description="No media item matches the current status or priority filter."
            title="No media matches"
          />
        ) : (
          items.map((item) => (
            <article
              className="rounded-[14px] border border-[color-mix(in_srgb,var(--accent-blue)_18%,var(--border-subtle))] bg-[rgba(11,17,28,.30)] p-3"
              key={item.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Pill accent="var(--accent-blue)">
                      {mediaTypeLabels[item.type]}
                    </Pill>
                    <Pill accent="var(--accent-purple)" quiet>
                      {mediaStatusLabels[item.status]}
                    </Pill>
                    <Pill accent="var(--text-muted)" quiet>
                      {item.priority} priority
                    </Pill>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  {item.note ? (
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      {item.note}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-[10px] text-[var(--text-muted)]">
                  Added {formatDate(item.addedAt)}
                </p>
              </div>
              {item.nextAction ? (
                <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-muted)]">
                    Next:
                  </span>{" "}
                  {item.nextAction}
                </p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </Panel>
  );
}

function PersonalSignals({
  metrics,
  stateAttributes,
}: Readonly<{
  metrics: LifeOverviewMetric[];
  stateAttributes: Record<string, string>;
}>) {
  return (
    <Panel
      sectionAttribute={{ "data-life-section": "personal-signals" }}
      stateAttributes={stateAttributes}
      subtitle="Small text-led signals, no scores or gamification."
      title="Personal Signals"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <article
            className="rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[rgba(11,17,28,.30)] p-3"
            key={metric.id}
            style={accentStyle(toneAccents[metric.tone])}
          >
            <p className="text-2xl font-semibold text-[var(--text-primary)]">
              {metric.value}
            </p>
            <h3 className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">
              {metric.label}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              {metric.helper}
            </p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function RecentPersonalActivity({
  activity,
  stateAttributes,
}: Readonly<{
  activity: LifeActivity[];
  stateAttributes: Record<string, string>;
}>) {
  return (
    <Panel
      sectionAttribute={{ "data-life-section": "recent-activity" }}
      stateAttributes={stateAttributes}
      subtitle="A short activity trace, not analytics."
      title="Recent Personal Activity"
    >
      {activity.length === 0 ? (
        <EmptyState
          description="Lokale persönliche Ereignisse erscheinen hier, sobald sie existieren."
          title="Keine persönliche Aktivität"
        />
      ) : (
        <ol className="grid gap-3">
          {activity.slice(0, 6).map((item) => (
            <li
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3"
              key={item.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    <StatusDot accent={toneAccents[item.tone]} label={item.label} />
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {item.detail}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                  {item.time}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function PrivacyNotes({
  notes,
}: Readonly<{
  notes: string[];
}>) {
  return (
    <Panel
      className="bg-[rgba(15,23,36,.58)]"
      subtitle="Quiet MVP privacy boundaries for personal data."
      title="Privacy Notes"
    >
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {notes.map((note, index) => (
          <li
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]"
            key={`life-privacy-note-${index}`}
          >
            {note}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SaveErrorState({
  message,
}: Readonly<{
  message: string;
}>) {
  return (
    <section
      aria-label="Local save error"
      className="rounded-[16px] border border-[rgba(221,107,95,.34)] bg-[rgba(221,107,95,.08)] px-4 py-3"
      role="alert"
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        Local save error
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
        {message}
      </p>
    </section>
  );
}

function Toast({
  onDismiss,
  toast,
}: Readonly<{
  onDismiss: () => void;
  toast: ToastState | null;
}>) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(onDismiss, 3200);

    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm rounded-[14px] border bg-[color-mix(in_srgb,var(--surface-2)_92%,#070b13)] px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,.26)]",
        toast.tone === "success" && "border-[rgba(66,184,131,.34)]",
        toast.tone === "info" && "border-[rgba(95,200,215,.34)]",
        toast.tone === "error" && "border-[rgba(221,107,95,.34)]",
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1 size-2 rounded-full",
            toast.tone === "success" && "bg-[var(--accent-green)]",
            toast.tone === "info" && "bg-[var(--accent-cyan)]",
            toast.tone === "error" && "bg-[var(--accent-red)]",
          )}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {toast.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {toast.body}
          </p>
        </div>
      </div>
    </div>
  );
}

function DialogFrame({
  children,
  description,
  onClose,
  title,
}: Readonly<{
  children: ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-dialog-title`;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      aria-labelledby={titleId}
      className="max-h-[calc(100dvh-32px)] w-[calc(100vw-24px)] max-w-[700px] overflow-y-auto rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_22px_70px_rgba(0,0,0,.38)] backdrop:bg-[rgba(0,0,0,.54)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]" id={titleId}>
              {title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              {description}
            </p>
          </div>
          <button className={quietButtonClass} onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}

function DialogError({ error }: Readonly<{ error: string | null }>) {
  if (!error) {
    return null;
  }

  return (
    <p
      className="rounded-[12px] border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.08)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]"
      role="alert"
    >
      {error}
    </p>
  );
}

function DialogFooter({
  onCancel,
  submitLabel,
}: Readonly<{
  onCancel: () => void;
  submitLabel: string;
}>) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
      <button className={secondaryButtonClass} onClick={onCancel} type="button">
        Cancel
      </button>
      <button className={primaryButtonClass} type="submit">
        {submitLabel}
      </button>
    </div>
  );
}

function NewJournalEntryDialog({
  initialPrompt,
  onClose,
  onSave,
}: Readonly<{
  initialPrompt?: string;
  onClose: () => void;
  onSave: (draft: JournalDraft) => void;
}>) {
  const [draft, setDraft] = useState<JournalDraft>({
    title: initialPrompt ? "Reflection: open prompt" : "",
    mood: "stable",
    energyLabel: "Stable, mentally full",
    reflection: initialPrompt ?? "",
    private: true,
  });
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof JournalDraft>(key: K, value: JournalDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim() || !draft.reflection.trim()) {
      setError("Title and reflection are required.");
      return;
    }

    onSave(draft);
  }

  return (
    <DialogFrame
      description="Local mock save only. No analysis, diagnosis or persistence runs."
      onClose={onClose}
      title="New journal entry"
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <DialogError error={error} />
        <label>
          <FieldLabel>Title *</FieldLabel>
          <input
            autoFocus
            className={inputClass}
            onChange={(event) => update("title", event.target.value)}
            value={draft.title}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <FieldLabel>Mood label</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("mood", event.target.value as JournalMood)}
              value={draft.mood}
            >
              {Object.entries(moodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Energy label</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => update("energyLabel", event.target.value)}
              value={draft.energyLabel}
            />
          </label>
        </div>
        <label>
          <FieldLabel>Reflection *</FieldLabel>
          <textarea
            className={cn(inputClass, "min-h-28 resize-y py-3 leading-5")}
            onChange={(event) => update("reflection", event.target.value)}
            value={draft.reflection}
          />
        </label>
        <label className="flex items-start gap-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
          <input
            checked={draft.private}
            className="mt-1 size-4 accent-[var(--accent-purple)]"
            onChange={(event) => update("private", event.target.checked)}
            type="checkbox"
          />
          <span>Private by default</span>
        </label>
        <DialogFooter onCancel={onClose} submitLabel="Save locally" />
      </form>
    </DialogFrame>
  );
}

function CaptureLifeNoteDialog({
  onClose,
  onSave,
}: Readonly<{
  onClose: () => void;
  onSave: (draft: NoteDraft) => void;
}>) {
  const [draft, setDraft] = useState<NoteDraft>({
    title: "",
    type: "thought",
    note: "",
    tags: "",
    source: "manual",
    intentionallyUnstructured: true,
  });
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof NoteDraft>(key: K, value: NoteDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim() || !draft.note.trim()) {
      setError("Title and note are required.");
      return;
    }

    onSave(draft);
  }

  return (
    <DialogFrame
      description="Notes stay loose unless manually moved later. No task or knowledge conversion happens here."
      onClose={onClose}
      title="Capture note"
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <DialogError error={error} />
        <label>
          <FieldLabel>Title *</FieldLabel>
          <input
            autoFocus
            className={inputClass}
            onChange={(event) => update("title", event.target.value)}
            value={draft.title}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <FieldLabel>Type</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("type", event.target.value as LifeNoteType)}
              value={draft.type}
            >
              {noteTypes.map((type) => (
                <option key={type} value={type}>
                  {noteTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Source</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("source", event.target.value as LifeNote["source"])}
              value={draft.source}
            >
              {Object.entries(noteSourceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <FieldLabel>Note *</FieldLabel>
          <textarea
            className={cn(inputClass, "min-h-28 resize-y py-3 leading-5")}
            onChange={(event) => update("note", event.target.value)}
            value={draft.note}
          />
        </label>
        <label>
          <FieldLabel optional>Tags</FieldLabel>
          <input
            className={inputClass}
            onChange={(event) => update("tags", event.target.value)}
            placeholder="private, idea, later"
            value={draft.tags}
          />
        </label>
        <label className="flex items-start gap-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
          <input
            checked={draft.intentionallyUnstructured}
            className="mt-1 size-4 accent-[var(--accent-cyan)]"
            onChange={(event) =>
              update("intentionallyUnstructured", event.target.checked)
            }
            type="checkbox"
          />
          <span>Keep intentionally unstructured</span>
        </label>
        <DialogFooter onCancel={onClose} submitLabel="Save note locally" />
      </form>
    </DialogFrame>
  );
}

function AddEntertainmentItemDialog({
  onClose,
  onSave,
}: Readonly<{
  onClose: () => void;
  onSave: (draft: MediaDraft) => void;
}>) {
  const [draft, setDraft] = useState<MediaDraft>({
    title: "",
    type: "series",
    status: "wishlist",
    priority: "medium",
    note: "",
    nextAction: "",
  });
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof MediaDraft>(key: K, value: MediaDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError("Title is required.");
      return;
    }

    onSave(draft);
  }

  return (
    <DialogFrame
      description="Local media shelf item only. No social feed, rating profile or external lookup."
      onClose={onClose}
      title="Add media"
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <DialogError error={error} />
        <label>
          <FieldLabel>Title *</FieldLabel>
          <input
            autoFocus
            className={inputClass}
            onChange={(event) => update("title", event.target.value)}
            value={draft.title}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <FieldLabel>Type</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("type", event.target.value as EntertainmentType)}
              value={draft.type}
            >
              {mediaTypes.map((type) => (
                <option key={type} value={type}>
                  {mediaTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Status</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) =>
                update("status", event.target.value as EntertainmentStatus)
              }
              value={draft.status}
            >
              {mediaStatuses.map((status) => (
                <option key={status} value={status}>
                  {mediaStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Priority</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("priority", event.target.value as Priority)}
              value={draft.priority}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <FieldLabel optional>Note</FieldLabel>
          <textarea
            className={cn(inputClass, "min-h-24 resize-y py-3 leading-5")}
            onChange={(event) => update("note", event.target.value)}
            value={draft.note}
          />
        </label>
        <label>
          <FieldLabel optional>Next action</FieldLabel>
          <input
            className={inputClass}
            onChange={(event) => update("nextAction", event.target.value)}
            value={draft.nextAction}
          />
        </label>
        <DialogFooter onCancel={onClose} submitLabel="Add media locally" />
      </form>
    </DialogFrame>
  );
}

function AddWishlistItemDialog({
  onClose,
  onSave,
}: Readonly<{
  onClose: () => void;
  onSave: (draft: WishlistDraft) => void;
}>) {
  const [draft, setDraft] = useState<WishlistDraft>({
    title: "",
    category: "tech",
    status: "wishlist",
    targetPrice: "",
    priority: "medium",
    budgetFit: "unknown",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof WishlistDraft>(key: K, value: WishlistDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError("Title is required.");
      return;
    }

    onSave(draft);
  }

  return (
    <DialogFrame
      description="Local inventory or wishlist item only. Budget fit is a text label, not automated advice."
      onClose={onClose}
      title="Add wishlist item"
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <DialogError error={error} />
        <label>
          <FieldLabel>Title *</FieldLabel>
          <input
            autoFocus
            className={inputClass}
            onChange={(event) => update("title", event.target.value)}
            value={draft.title}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <FieldLabel>Category</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) =>
                update("category", event.target.value as InventoryCategory)
              }
              value={draft.category}
            >
              {inventoryCategories.map((category) => (
                <option key={category} value={category}>
                  {inventoryCategoryLabels[category]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Status</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) =>
                update("status", event.target.value as InventoryStatus)
              }
              value={draft.status}
            >
              {inventoryStatuses.map((status) => (
                <option key={status} value={status}>
                  {inventoryStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <FieldLabel optional>Target price</FieldLabel>
            <input
              className={inputClass}
              inputMode="decimal"
              onChange={(event) => update("targetPrice", event.target.value)}
              placeholder="120"
              type="number"
              value={draft.targetPrice}
            />
          </label>
          <label>
            <FieldLabel>Priority</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("priority", event.target.value as Priority)}
              value={draft.priority}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Budget fit</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) =>
                update("budgetFit", event.target.value as InventoryItem["budgetFit"])
              }
              value={draft.budgetFit}
            >
              {budgetFits.map((fit) => (
                <option key={fit} value={fit}>
                  {budgetFitLabels[fit]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <FieldLabel optional>Note</FieldLabel>
          <textarea
            className={cn(inputClass, "min-h-24 resize-y py-3 leading-5")}
            onChange={(event) => update("note", event.target.value)}
            value={draft.note}
          />
        </label>
        <DialogFooter onCancel={onClose} submitLabel="Add item locally" />
      </form>
    </DialogFrame>
  );
}

function buildPersonalSignals({
  inventory,
  journalEntries,
  notes,
}: {
  inventory: InventoryItem[];
  journalEntries: JournalEntry[];
  notes: LifeNote[];
}): LifeOverviewMetric[] {
  const openWishlist = inventory.filter((item) =>
    ["wishlist", "planned_purchase", "needs_replacement"].includes(item.status),
  ).length;
  const waitItems = inventory.filter((item) => item.budgetFit === "wait").length;

  return [
    {
      id: "journal-count-local",
      label: "Journal entries",
      value: journalEntries.length.toString(),
      helper:
        journalEntries.length > 0
          ? "Reflection exists without becoming a score."
          : "Noch keine lokalen Reflexionen vorhanden.",
      tone: "purple",
    },
    {
      id: "loose-notes-local",
      label: "Loose notes",
      value: notes.length.toString(),
      helper:
        notes.length > 0
          ? "Preserved without task or knowledge conversion."
          : "Keine automatische Task- oder Resource-Konvertierung.",
      tone: "cyan",
    },
    {
      id: "wishlist-open-local",
      label: "Wishlist decisions",
      value: openWishlist.toString(),
      helper:
        openWishlist > 0
          ? "Budget fit needs manual review."
          : "Budget Fit bleibt ein manuelles Planungssignal.",
      tone: "orange",
    },
    {
      id: "budget-wait-local",
      label: "Items marked wait",
      value: waitItems.toString(),
      helper:
        waitItems > 0
          ? "Text status, not alarm color."
          : "Keine Inventarwerte oder Preise als Demo-Fallback.",
      tone: "gray",
    },
  ];
}

function buildJournalEntry(draft: JournalDraft): JournalEntry {
  return {
    id: localId("journal"),
    title: draft.title.trim(),
    date: new Date().toISOString(),
    mood: draft.mood,
    energyLabel: draft.energyLabel.trim() || "Not labeled",
    summary: compactText(draft.reflection.trim(), 220),
    reflectionPrompt:
      draft.reflection.trim().endsWith("?")
        ? draft.reflection.trim()
        : "Was soll beim naechsten Review offen bleiben?",
    body: draft.reflection.trim(),
    tags: [],
    privacy: draft.private ? "sensitive" : "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildLifeNote(draft: NoteDraft): LifeNote {
  return {
    id: localId("note"),
    title: draft.title.trim(),
    type: draft.type,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    snippet: draft.note.trim(),
    body: draft.note.trim(),
    tags: normalizeTags(draft.tags),
    source: draft.source,
    intentionallyUnstructured: draft.intentionallyUnstructured,
    privacy: "private",
  };
}

function buildEntertainmentItem(draft: MediaDraft): EntertainmentItem {
  return {
    id: localId("media"),
    title: draft.title.trim(),
    type: draft.type,
    status: draft.status,
    priority: draft.priority,
    note: draft.note.trim() || undefined,
    nextAction: draft.nextAction.trim() || undefined,
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ratingPersonal: "not_rated",
  };
}

function buildInventoryItem(draft: WishlistDraft): InventoryItem {
  const targetPrice = Number(draft.targetPrice);

  return {
    id: localId("inventory"),
    title: draft.title.trim(),
    category: draft.category,
    status: draft.status,
    owned: draft.status === "owned",
    targetPrice: Number.isFinite(targetPrice) && targetPrice > 0 ? targetPrice : undefined,
    priority: draft.priority,
    budgetFit: draft.budgetFit,
    note: draft.note.trim() || undefined,
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function shouldShow(activeView: LifeView, section: Exclude<LifeView, "overview">) {
  return activeView === "overview" || activeView === section;
}

function stateAttrs(meta: ContentStateMeta, profileId: string) {
  return contentStateDataAttributes(meta, profileId);
}

function buildOverviewContentStates(
  viewModel: LifeOverviewViewModel,
): NonNullable<LifeOverviewViewModel["contentStates"]> {
  return {
    page: resolveContentStateMeta({
      capacity: 8,
      itemCount:
        viewModel.journalEntries.length +
        viewModel.notes.length +
        viewModel.entertainment.length +
        viewModel.inventory.length,
    }),
    personalCheckIn: resolveContentStateMeta({
      capacity: 1,
      itemCount: viewModel.journalEntries.length > 0 ? 1 : 0,
    }),
    lifeSections: resolveContentStateMeta({
      capacity: 4,
      itemCount: viewModel.sections.length,
    }),
    looseNotes: resolveContentStateMeta({
      capacity: 5,
      itemCount: viewModel.notes.length,
    }),
    inventoryFocus: resolveContentStateMeta({
      capacity: 4,
      itemCount: viewModel.inventory.length,
    }),
    entertainmentShelf: resolveContentStateMeta({
      capacity: 4,
      itemCount: viewModel.entertainment.length,
    }),
    recentActivity: resolveContentStateMeta({
      capacity: 5,
      itemCount: viewModel.recentActivity.length,
    }),
    personalSignals: resolveContentStateMeta({
      capacity: 4,
      itemCount: viewModel.metrics.length,
    }),
  };
}

export function LifeOverviewPage({
  viewModel,
}: Readonly<{
  viewModel: LifeOverviewViewModel;
}>) {
  const [journalEntries, setJournalEntries] = useState(viewModel.journalEntries);
  const [notes, setNotes] = useState(viewModel.notes);
  const [entertainment, setEntertainment] = useState(viewModel.entertainment);
  const [inventory, setInventory] = useState(viewModel.inventory);
  const [recentActivity, setRecentActivity] = useState(viewModel.recentActivity);
  const [activeView, setActiveView] = useState<LifeView>("overview");
  const [activeDialog, setActiveDialog] = useState<DialogKind>(null);
  const [reflectionPrompt, setReflectionPrompt] = useState<string | undefined>();
  const [noteSearch, setNoteSearch] = useState("");
  const [noteType, setNoteType] = useState<LifeNoteType | "all">("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [mediaStatus, setMediaStatus] = useState<EntertainmentStatus | "all">("all");
  const [mediaPriority, setMediaPriority] = useState<Priority | "all">("all");
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus | "all">("all");
  const [inventoryPriority, setInventoryPriority] = useState<Priority | "all">("all");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const noteTags = useMemo(
    () => Array.from(new Set(notes.flatMap((note) => note.tags))).sort(),
    [notes],
  );

  const filteredNotes = useMemo(() => {
    const query = noteSearch.trim().toLowerCase();

    return notes.filter((note) => {
      const matchesQuery =
        !query ||
        note.title.toLowerCase().includes(query) ||
        note.snippet.toLowerCase().includes(query) ||
        note.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesType = noteType === "all" || note.type === noteType;
      const matchesTag = selectedTag === "all" || note.tags.includes(selectedTag);

      return matchesQuery && matchesType && matchesTag;
    });
  }, [noteSearch, noteType, notes, selectedTag]);

  const filteredEntertainment = useMemo(() => {
    return entertainment
      .filter(
        (item) =>
          (mediaStatus === "all" || item.status === mediaStatus) &&
          (mediaPriority === "all" || item.priority === mediaPriority),
      )
      .sort(
        (left, right) =>
          getPriorityRank(left.priority) - getPriorityRank(right.priority) ||
          left.title.localeCompare(right.title),
      );
  }, [entertainment, mediaPriority, mediaStatus]);

  const filteredInventory = useMemo(() => {
    return inventory
      .filter(
        (item) =>
          (inventoryStatus === "all" || item.status === inventoryStatus) &&
          (inventoryPriority === "all" || item.priority === inventoryPriority),
      )
      .sort(
        (left, right) =>
          getPriorityRank(left.priority) - getPriorityRank(right.priority) ||
          left.title.localeCompare(right.title),
      );
  }, [inventory, inventoryPriority, inventoryStatus]);

  const metrics = useMemo(
    () => buildPersonalSignals({ inventory, journalEntries, notes }),
    [inventory, journalEntries, notes],
  );
  const profileId = viewModel.profileId ?? "demo";
  const contentStates =
    viewModel.contentStates ?? buildOverviewContentStates(viewModel);

  function showToast(nextToast: ToastState) {
    setToast(nextToast);
  }

  function addLocalActivity(
    label: string,
    detail: string,
    tone: LifeActivity["tone"],
  ) {
    setRecentActivity((current) => [
      {
        id: localId("activity"),
        label,
        detail,
        time: "Just now",
        tone,
      },
      ...current,
    ]);
  }

  function closeDialog() {
    setActiveDialog(null);
    setReflectionPrompt(undefined);
  }

  function runLocalSave(onSave: () => void, successToast: ToastState) {
    try {
      onSave();
      setSaveError(null);
      showToast(successToast);
      closeDialog();
    } catch {
      const message =
        "The local mock save did not complete. No data was persisted or sent anywhere.";
      setSaveError(message);
      showToast({
        title: "Save did not complete",
        body: message,
        tone: "error",
      });
    }
  }

  function handleJournalSave(draft: JournalDraft) {
    runLocalSave(
      () => {
        const entry = buildJournalEntry(draft);
        setJournalEntries((current) => [entry, ...current]);
        addLocalActivity("Journal entry created", entry.title, "purple");
      },
      {
        title: "Journal saved locally",
        body: "The entry was added to this browser session only.",
        tone: "success",
      },
    );
  }

  function handleNoteSave(draft: NoteDraft) {
    runLocalSave(
      () => {
        const note = buildLifeNote(draft);
        setNotes((current) => [note, ...current]);
        addLocalActivity("Note captured", note.title, "cyan");
      },
      {
        title: "Note kept loose",
        body: "No task or knowledge item was created.",
        tone: "success",
      },
    );
  }

  function handleMediaSave(draft: MediaDraft) {
    runLocalSave(
      () => {
        const item = buildEntertainmentItem(draft);
        setEntertainment((current) => [item, ...current]);
        addLocalActivity("Media added", item.title, "purple");
      },
      {
        title: "Media added locally",
        body: "The entertainment shelf changed only in local UI state.",
        tone: "success",
      },
    );
  }

  function handleWishlistSave(draft: WishlistDraft) {
    runLocalSave(
      () => {
        const item = buildInventoryItem(draft);
        setInventory((current) => [item, ...current]);
        addLocalActivity("Wishlist item reviewed", item.title, "orange");
      },
      {
        title: "Wishlist item added",
        body: "Budget fit is stored only as local mock state.",
        tone: "success",
      },
    );
  }

  function openReflection() {
    setReflectionPrompt(journalEntries[0]?.reflectionPrompt);
    setActiveDialog("journal");
  }

  function openJournal() {
    showToast({
      title: "Journal route opened",
      body: "The subpage exists as a prepared Life route.",
      tone: "info",
    });
  }

  function handleSectionAction(section: LifeSectionSummary) {
    showToast({
      title: `${section.title} route opened`,
      body: "This opens the prepared Life subpage; no external integration runs.",
      tone: "info",
    });
  }

  function handleOpenNote(note: LifeNote) {
    showToast({
      title: "Note detail prepared",
      body: `${note.title} stays local on this overview; no detail route is linked yet.`,
      tone: "info",
    });
  }

  function handleKeepNote(note: LifeNote) {
    showToast({
      title: "Kept as note",
      body: `${note.title} was not converted to a task or knowledge item.`,
      tone: "success",
    });
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6"
      id="life-overview-page"
      style={{ "--accent": lifeAccent } as LifeStyle}
      {...stateAttrs(contentStates.page, profileId)}
      data-life-section="page"
    >
      <LifePageHeader
        header={viewModel.header}
        onAddMedia={() => setActiveDialog("media")}
        onCaptureNote={() => setActiveDialog("note")}
        onNewJournal={() => setActiveDialog("journal")}
        onWishlist={() => setActiveDialog("wishlist")}
      />

      {saveError ? <SaveErrorState message={saveError} /> : null}

      {shouldShow(activeView, "journal") ? (
        <PersonalCheckInCard
          journalEntries={journalEntries}
          onOpenJournal={openJournal}
          onStartReflection={openReflection}
          reviewDots={viewModel.reviewDots}
          stateAttributes={stateAttrs(contentStates.personalCheckIn, profileId)}
          statusLabel={viewModel.header.statusLabel}
        />
      ) : null}

      <QuickActions
        onAddMedia={() => setActiveDialog("media")}
        onCaptureNote={() => setActiveDialog("note")}
        onNewJournal={() => setActiveDialog("journal")}
        onWishlist={() => setActiveDialog("wishlist")}
      />

      <SegmentControl activeView={activeView} onChange={setActiveView} />

      {activeView === "overview" ? (
        <LifeSectionCards
          onAction={handleSectionAction}
          sections={viewModel.sections}
          stateAttributes={stateAttrs(contentStates.lifeSections, profileId)}
        />
      ) : null}

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        {shouldShow(activeView, "notes") ? (
          <LooseNotesPanel
            noteSearch={noteSearch}
            noteType={noteType}
            notes={filteredNotes}
            onKeepNote={handleKeepNote}
            onOpenNote={handleOpenNote}
            onSearchChange={setNoteSearch}
            onTagChange={setSelectedTag}
            onTypeChange={setNoteType}
            selectedTag={selectedTag}
            stateAttributes={stateAttrs(contentStates.looseNotes, profileId)}
            tags={noteTags}
            totalCount={notes.length}
          />
        ) : null}

        {shouldShow(activeView, "inventory") ? (
          <InventoryWishlistFocus
            inventoryStatus={inventoryStatus}
            items={filteredInventory}
            onAddWishlist={() => setActiveDialog("wishlist")}
            onInventoryStatusChange={setInventoryStatus}
            onPriorityChange={setInventoryPriority}
            priorityFilter={inventoryPriority}
            stateAttributes={stateAttrs(contentStates.inventoryFocus, profileId)}
            totalCount={inventory.length}
          />
        ) : null}
      </div>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        {shouldShow(activeView, "entertainment") ? (
          <EntertainmentShelf
            items={filteredEntertainment}
            mediaStatus={mediaStatus}
            onAddMedia={() => setActiveDialog("media")}
            onMediaStatusChange={setMediaStatus}
            onPriorityChange={setMediaPriority}
            priorityFilter={mediaPriority}
            stateAttributes={stateAttrs(contentStates.entertainmentShelf, profileId)}
            totalCount={entertainment.length}
          />
        ) : null}

        {activeView === "overview" || activeView === "journal" ? (
          <div className="grid gap-2">
            <RecentPersonalActivity
              activity={recentActivity}
              stateAttributes={stateAttrs(contentStates.recentActivity, profileId)}
            />
            <PersonalSignals
              metrics={metrics}
              stateAttributes={stateAttrs(contentStates.personalSignals, profileId)}
            />
          </div>
        ) : null}
      </div>

      {activeView === "overview" ? (
        <PrivacyNotes notes={viewModel.privacyNotes} />
      ) : null}

      {activeDialog === "journal" ? (
        <NewJournalEntryDialog
          initialPrompt={reflectionPrompt}
          onClose={closeDialog}
          onSave={handleJournalSave}
        />
      ) : null}
      {activeDialog === "note" ? (
        <CaptureLifeNoteDialog onClose={closeDialog} onSave={handleNoteSave} />
      ) : null}
      {activeDialog === "media" ? (
        <AddEntertainmentItemDialog onClose={closeDialog} onSave={handleMediaSave} />
      ) : null}
      {activeDialog === "wishlist" ? (
        <AddWishlistItemDialog onClose={closeDialog} onSave={handleWishlistSave} />
      ) : null}

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}
