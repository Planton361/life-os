"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { contentStateDataAttributes } from "@/features/content-state";
import { cn } from "@/lib/cn";
import type {
  WorkArchitectureItem,
  WorkArchitectureItemType,
  WorkLogEntry,
  WorkTask,
  WorkWikiEntry,
  WorkWikiType,
  WorkWikiViewModel,
} from "./types";
import {
  DialogShell,
  EmptyState,
  FieldLabel,
  Metric,
  Panel,
  Pill,
  TagList,
  Toast,
  type ToastState,
  createId,
  empty,
  formatDate,
  inputClass,
  matchesSearch,
  mutedAccent,
  normalize,
  optionLabel,
  primaryButtonClass,
  quietButtonClass,
  referenceAccent,
  riskAccent,
  secondaryButtonClass,
  splitLines,
  textareaClass,
  today,
  warningAccent,
  workAccent,
} from "./components/work-page-primitives";

type WikiSegment = "all" | "pinned" | "architecture" | "processes" | "needs_review";
type DialogKind = "wiki" | "architecture" | null;

type WorkWikiSectionProps = {
  [key: `data-${string}`]: string | undefined;
};

type InspectorState =
  | { type: "wiki"; id: string }
  | { type: "architecture"; id: string }
  | null;

type WikiDraft = {
  title: string;
  type: WorkWikiType;
  summary: string;
  body: string;
  tags: string;
  status: WorkWikiEntry["status"];
  relatedLogEntryIds: string[];
  relatedTaskIds: string[];
  relatedArchitectureItemIds: string[];
};

type ArchitectureDraft = {
  title: string;
  type: WorkArchitectureItemType;
  summary: string;
  status: WorkArchitectureItem["status"];
  relatedIds: string[];
  wikiEntryIds: string[];
  note: string;
};

const segments: readonly { label: string; value: WikiSegment }[] = [
  { label: "All", value: "all" },
  { label: "Pinned", value: "pinned" },
  { label: "Architecture", value: "architecture" },
  { label: "Processes", value: "processes" },
  { label: "Needs review", value: "needs_review" },
];

const wikiTypes: readonly WorkWikiType[] = [
  "concept",
  "process",
  "how_to",
  "architecture",
  "decision",
  "reference",
  "glossary",
  "checklist",
];

const architectureTypes: readonly WorkArchitectureItemType[] = [
  "system",
  "module",
  "service",
  "data_flow",
  "process",
  "interface",
  "dependency",
  "concept",
];

const wikiStatusMeta: Record<WorkWikiEntry["status"], { label: string; accent: string }> = {
  draft: { label: "Draft", accent: mutedAccent },
  active: { label: "Active", accent: workAccent },
  needs_review: { label: "Needs review", accent: warningAccent },
  archived: { label: "Archived", accent: mutedAccent },
};

const architectureStatusMeta: Record<
  WorkArchitectureItem["status"],
  { label: string; accent: string }
> = {
  known: { label: "Known", accent: workAccent },
  learning: { label: "Learning", accent: referenceAccent },
  unclear: { label: "Unclear", accent: warningAccent },
  needs_review: { label: "Needs review", accent: riskAccent },
};

const pinnedWikiIds = [
  "wiki-testdata-check",
  "wiki-review-checklist",
  "wiki-domain-key",
];

function selectedValues(event: ChangeEvent<HTMLSelectElement>) {
  return Array.from(event.target.selectedOptions, (option) => option.value);
}

function findWiki(wikiEntries: readonly WorkWikiEntry[], id?: string) {
  return wikiEntries.find((entry) => entry.id === id) ?? null;
}

function findTask(tasks: readonly WorkTask[], id?: string) {
  return tasks.find((task) => task.id === id) ?? null;
}

function findLog(logs: readonly WorkLogEntry[], id?: string) {
  return logs.find((entry) => entry.id === id) ?? null;
}

function findArchitecture(
  architectureItems: readonly WorkArchitectureItem[],
  id?: string,
) {
  return architectureItems.find((item) => item.id === id) ?? null;
}

function initialWikiDraft(viewModel: WorkWikiViewModel): WikiDraft {
  return {
    title: "",
    type: "reference",
    summary: "",
    body: "",
    tags: "",
    status: "active",
    relatedLogEntryIds: viewModel.logs[0] ? [viewModel.logs[0].id] : [],
    relatedTaskIds: viewModel.tasks[0] ? [viewModel.tasks[0].id] : [],
    relatedArchitectureItemIds: viewModel.architectureItems[0]
      ? [viewModel.architectureItems[0].id]
      : [],
  };
}

function initialArchitectureDraft(viewModel: WorkWikiViewModel): ArchitectureDraft {
  return {
    title: "",
    type: "concept",
    summary: "",
    status: "learning",
    relatedIds: [],
    wikiEntryIds: viewModel.wikiEntries[0] ? [viewModel.wikiEntries[0].id] : [],
    note: "",
  };
}

export function WorkWikiPage({
  viewModel,
}: Readonly<{ viewModel: WorkWikiViewModel }>) {
  const [wikiEntries, setWikiEntries] = useState<WorkWikiEntry[]>(
    viewModel.wikiEntries,
  );
  const [architectureItems, setArchitectureItems] = useState<WorkArchitectureItem[]>(
    viewModel.architectureItems,
  );
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<WikiSegment>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [architectureFilter, setArchitectureFilter] = useState("all");
  const [linkedLogFilter, setLinkedLogFilter] = useState("all");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [inspector, setInspector] = useState<InspectorState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editingWikiId, setEditingWikiId] = useState<string | null>(null);
  const [wikiDraft, setWikiDraft] = useState<WikiDraft>(() =>
    initialWikiDraft(viewModel),
  );
  const [architectureDraft, setArchitectureDraft] = useState<ArchitectureDraft>(() =>
    initialArchitectureDraft(viewModel),
  );

  const dismissToast = useCallback(() => setToast(null), []);
  const query = normalize(search);
  const canUseLocalWorkDrafts = viewModel.profileId === "demo";
  const allTags = useMemo(
    () => Array.from(new Set(wikiEntries.flatMap((entry) => entry.tags))).sort(),
    [wikiEntries],
  );

  const filteredWiki = useMemo(
    () =>
      wikiEntries.filter((entry) => {
        const matchesSegment =
          segment === "all" ||
          (segment === "pinned" && pinnedWikiIds.includes(entry.id)) ||
          (segment === "architecture" && entry.type === "architecture") ||
          (segment === "processes" &&
            ["process", "how_to", "checklist"].includes(entry.type)) ||
          (segment === "needs_review" && entry.status === "needs_review");

        return (
          matchesSegment &&
          (typeFilter === "all" || entry.type === typeFilter) &&
          (statusFilter === "all" || entry.status === statusFilter) &&
          (tagFilter === "all" || entry.tags.includes(tagFilter)) &&
          (architectureFilter === "all" ||
            (architectureFilter === "yes" &&
              entry.relatedArchitectureItemIds.length > 0) ||
            (architectureFilter === "no" &&
              entry.relatedArchitectureItemIds.length === 0)) &&
          (linkedLogFilter === "all" ||
            (linkedLogFilter === "yes" && entry.relatedLogEntryIds.length > 0) ||
            (linkedLogFilter === "no" && entry.relatedLogEntryIds.length === 0)) &&
          matchesSearch(
            [
              entry.title,
              entry.summary,
              entry.body,
              entry.tags.join(" "),
              optionLabel(entry.type),
              wikiStatusMeta[entry.status].label,
            ],
            query,
          )
        );
      }),
    [
      architectureFilter,
      linkedLogFilter,
      query,
      segment,
      statusFilter,
      tagFilter,
      typeFilter,
      wikiEntries,
    ],
  );

  const pinnedReferences = wikiEntries.filter((entry) =>
    pinnedWikiIds.includes(entry.id),
  );
  const needsReview = wikiEntries.filter((entry) => entry.status === "needs_review");
  const recentlyUpdated = wikiEntries
    .slice()
    .sort((first, second) => {
      const firstDate = first.lastReviewedAt ?? "1970-01-01";
      const secondDate = second.lastReviewedAt ?? "1970-01-01";
      return new Date(secondDate).getTime() - new Date(firstDate).getTime();
    });
  const selectedWiki =
    inspector?.type === "wiki" ? findWiki(wikiEntries, inspector.id) : null;
  const selectedArchitecture =
    inspector?.type === "architecture"
      ? findArchitecture(architectureItems, inspector.id)
      : null;

  function openWikiDialog(context: { architectureId?: string; editId?: string } = {}) {
    setDialogError(null);
    setInspector(null);
    setEditingWikiId(context.editId ?? null);

    if (context.editId) {
      const entry = findWiki(wikiEntries, context.editId);
      if (entry) {
        setWikiDraft({
          title: entry.title,
          type: entry.type,
          summary: entry.summary,
          body: entry.body,
          tags: entry.tags.join(", "),
          status: entry.status,
          relatedLogEntryIds: entry.relatedLogEntryIds,
          relatedTaskIds: entry.relatedTaskIds,
          relatedArchitectureItemIds: entry.relatedArchitectureItemIds,
        });
      }
    } else {
      const draft = initialWikiDraft({ ...viewModel, wikiEntries, architectureItems });
      setWikiDraft({
        ...draft,
        relatedArchitectureItemIds: context.architectureId
          ? [context.architectureId]
          : draft.relatedArchitectureItemIds,
      });
    }

    setDialog("wiki");
  }

  function openArchitectureDialog() {
    setDialogError(null);
    setInspector(null);
    setArchitectureDraft(
      initialArchitectureDraft({ ...viewModel, wikiEntries, architectureItems }),
    );
    setDialog("architecture");
  }

  function closeDialog() {
    setDialog(null);
    setDialogError(null);
    setEditingWikiId(null);
  }

  function submitWikiEntry() {
    if (empty(wikiDraft.title) || empty(wikiDraft.summary)) {
      setDialogError("Complete Title and Summary before saving.");
      return;
    }

    const entry: WorkWikiEntry = {
      id: editingWikiId ?? createId("work-wiki-local"),
      title: wikiDraft.title.trim(),
      type: wikiDraft.type,
      summary: wikiDraft.summary.trim(),
      body: wikiDraft.body.trim() || wikiDraft.summary.trim(),
      tags: splitLines(wikiDraft.tags),
      status: wikiDraft.status,
      lastReviewedAt:
        wikiDraft.status === "active" ? today() : findWiki(wikiEntries, editingWikiId ?? "")?.lastReviewedAt,
      relatedArchitectureItemIds: wikiDraft.relatedArchitectureItemIds,
      relatedLogEntryIds: wikiDraft.relatedLogEntryIds,
      relatedTaskIds: wikiDraft.relatedTaskIds,
    };

    setWikiEntries((current) =>
      editingWikiId
        ? current.map((item) => (item.id === editingWikiId ? entry : item))
        : [entry, ...current],
    );
    setToast({
      title: "Wiki entry saved locally",
      body: "This is personal work reference only, not official documentation.",
      tone: "success",
    });
    closeDialog();
  }

  function submitArchitectureNote() {
    if (empty(architectureDraft.title) || empty(architectureDraft.summary)) {
      setDialogError("Complete Title and Summary before saving.");
      return;
    }

    const item: WorkArchitectureItem = {
      id: createId("work-architecture-local"),
      title: architectureDraft.title.trim(),
      type: architectureDraft.type,
      summary: architectureDraft.summary.trim(),
      status: architectureDraft.status,
      relatedIds: architectureDraft.relatedIds,
      wikiEntryIds: architectureDraft.wikiEntryIds,
      note: architectureDraft.note.trim() || "Local architecture note without system details.",
    };

    setArchitectureItems((current) => [item, ...current]);
    setToast({
      title: "Architecture note saved locally",
      body: "No architecture scanner or company system was used.",
      tone: "success",
    });
    closeDialog();
  }

  function markReviewed(entry: WorkWikiEntry) {
    setWikiEntries((current) =>
      current.map((item) =>
        item.id === entry.id
          ? { ...item, status: "active", lastReviewedAt: today() }
          : item,
      ),
    );
    setToast({
      title: "Wiki entry marked reviewed",
      body: "The review status changed only in local UI state.",
      tone: "success",
    });
  }

  function reviewEntries() {
    setSegment("needs_review");
    setToast({
      title: needsReview.length > 0 ? "Needs review filtered" : "No review entries",
      body:
        needsReview.length > 0
          ? "Showing local wiki entries that need review."
          : "All current wiki entries are active, draft or archived.",
      tone: "info",
    });
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-4 pb-8"
      data-work-wiki-section="page"
      {...contentStateDataAttributes(
        viewModel.contentStates.page,
        viewModel.profileId,
      )}
    >
      <WorkWikiHeader
        canUseLocalWorkDrafts={canUseLocalWorkDrafts}
        hasReviewEntries={needsReview.length > 0}
        onAddArchitecture={openArchitectureDialog}
        onAddWiki={() => openWikiDialog()}
        onReviewEntries={reviewEntries}
      />

      <WikiLookupFilters
        architectureFilter={architectureFilter}
        linkedLogFilter={linkedLogFilter}
        onArchitectureFilter={setArchitectureFilter}
        onLinkedLogFilter={setLinkedLogFilter}
        onSearch={setSearch}
        onSegment={setSegment}
        onStatusFilter={setStatusFilter}
        onTagFilter={setTagFilter}
        onTypeFilter={setTypeFilter}
        search={search}
        sectionProps={{
          "data-work-wiki-section": "search-filters",
          ...contentStateDataAttributes(
            viewModel.contentStates.searchFilters,
            viewModel.profileId,
          ),
        }}
        segment={segment}
        statusFilter={statusFilter}
        tagFilter={tagFilter}
        tags={allTags}
        typeFilter={typeFilter}
      />

      <PinnedReferences
        entries={pinnedReferences}
        onOpen={(entry) => setInspector({ type: "wiki", id: entry.id })}
        profileId={viewModel.profileId}
        state={viewModel.contentStates.pinnedReferences}
      />

      <WikiNeedsReviewPanel
        entries={needsReview}
        onReview={markReviewed}
        onOpen={(entry) => setInspector({ type: "wiki", id: entry.id })}
        profileId={viewModel.profileId}
        state={viewModel.contentStates.needsReview}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <WikiLookupPanel
          canUseLocalWorkDrafts={canUseLocalWorkDrafts}
          entries={filteredWiki}
          onAddWiki={() => openWikiDialog()}
          onOpen={(entry) => setInspector({ type: "wiki", id: entry.id })}
          profileId={viewModel.profileId}
          query={query}
          state={viewModel.contentStates.wikiLookup}
        />
        <div className="grid gap-4 content-start">
          <ArchitectureNotesPanel
            architectureItems={architectureItems}
            canUseLocalWorkDrafts={canUseLocalWorkDrafts}
            onAddArchitecture={openArchitectureDialog}
            onOpen={(item) => setInspector({ type: "architecture", id: item.id })}
            profileId={viewModel.profileId}
            state={viewModel.contentStates.architectureNotes}
          />
          <WikiCategories
            entries={wikiEntries}
            profileId={viewModel.profileId}
            state={viewModel.contentStates.wikiCategories}
          />
          <RecentlyUpdatedWiki
            entries={recentlyUpdated}
            onOpen={(entry) => setInspector({ type: "wiki", id: entry.id })}
          />
          <LinkedWorkLogs logs={viewModel.logs} wikiEntries={wikiEntries} />
        </div>
      </div>

      {dialog ? (
        <DialogShell labelledBy="work-wiki-dialog-heading" onClose={closeDialog} open>
          <WorkWikiDialog
            architectureDraft={architectureDraft}
            architectureItems={architectureItems}
            dialog={dialog}
            dialogError={dialogError}
            isEditingWiki={Boolean(editingWikiId)}
            logs={viewModel.logs}
            onArchitectureDraft={setArchitectureDraft}
            onClose={closeDialog}
            onSubmitArchitecture={submitArchitectureNote}
            onSubmitWiki={submitWikiEntry}
            onWikiDraft={setWikiDraft}
            tasks={viewModel.tasks}
            wikiDraft={wikiDraft}
            wikiEntries={wikiEntries}
          />
        </DialogShell>
      ) : null}

      <WorkWikiInspector
        architectureItems={architectureItems}
        logs={viewModel.logs}
        onAddWiki={(architectureId) => openWikiDialog({ architectureId })}
        onClose={() => setInspector(null)}
        onEditWiki={(entry) => openWikiDialog({ editId: entry.id })}
        onMarkReviewed={markReviewed}
        selectedArchitecture={selectedArchitecture}
        selectedWiki={selectedWiki}
        tasks={viewModel.tasks}
        wikiEntries={wikiEntries}
      />
      <Toast onDismiss={dismissToast} toast={toast} />
    </div>
  );
}

function WorkWikiHeader({
  canUseLocalWorkDrafts,
  hasReviewEntries,
  onAddArchitecture,
  onAddWiki,
  onReviewEntries,
}: Readonly<{
  canUseLocalWorkDrafts: boolean;
  hasReviewEntries: boolean;
  onAddArchitecture: () => void;
  onAddWiki: () => void;
  onReviewEntries: () => void;
}>) {
  return (
    <header className="rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
            Work · Reference
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-[var(--text-primary)]">
            Wiki
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Personal work reference, process notes and architecture lookup
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:flex xl:justify-end">
          <button
            className={primaryButtonClass}
            disabled={!canUseLocalWorkDrafts}
            onClick={onAddWiki}
            type="button"
          >
            Add wiki entry
          </button>
          <button
            className={secondaryButtonClass}
            disabled={!canUseLocalWorkDrafts}
            onClick={onAddArchitecture}
            type="button"
          >
            Add architecture note
          </button>
          <button
            className={secondaryButtonClass}
            disabled={!hasReviewEntries}
            onClick={onReviewEntries}
            type="button"
          >
            Review entries
          </button>
        </div>
      </div>
    </header>
  );
}

function WikiLookupFilters({
  architectureFilter,
  linkedLogFilter,
  onArchitectureFilter,
  onLinkedLogFilter,
  onSearch,
  onSegment,
  onStatusFilter,
  onTagFilter,
  onTypeFilter,
  search,
  sectionProps,
  segment,
  statusFilter,
  tagFilter,
  tags,
  typeFilter,
}: Readonly<{
  architectureFilter: string;
  linkedLogFilter: string;
  onArchitectureFilter: (value: string) => void;
  onLinkedLogFilter: (value: string) => void;
  onSearch: (value: string) => void;
  onSegment: (value: WikiSegment) => void;
  onStatusFilter: (value: string) => void;
  onTagFilter: (value: string) => void;
  onTypeFilter: (value: string) => void;
  search: string;
  sectionProps?: WorkWikiSectionProps;
  segment: WikiSegment;
  statusFilter: string;
  tagFilter: string;
  tags: readonly string[];
  typeFilter: string;
}>) {
  return (
    <section
      {...sectionProps}
      aria-label="Wiki lookup filters"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,360px)_1fr]">
        <label htmlFor="work-wiki-search">
          <FieldLabel>Search wiki</FieldLabel>
          <input
            className={inputClass}
            id="work-wiki-search"
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search wiki"
            type="search"
            value={search}
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            id="work-wiki-type-filter"
            label="Type"
            onChange={onTypeFilter}
            options={wikiTypes.map((type) => ({
              label: optionLabel(type),
              value: type,
            }))}
            value={typeFilter}
          />
          <FilterSelect
            id="work-wiki-status-filter"
            label="Status"
            onChange={onStatusFilter}
            options={Object.entries(wikiStatusMeta).map(([value, meta]) => ({
              label: meta.label,
              value,
            }))}
            value={statusFilter}
          />
          <FilterSelect
            id="work-wiki-tag-filter"
            label="Tag"
            onChange={onTagFilter}
            options={tags.map((tag) => ({ label: tag, value: tag }))}
            value={tagFilter}
          />
          <FilterSelect
            id="work-wiki-architecture-filter"
            label="Architecture linked"
            onChange={onArchitectureFilter}
            options={[
              { label: "Has architecture", value: "yes" },
              { label: "No architecture", value: "no" },
            ]}
            value={architectureFilter}
          />
          <FilterSelect
            id="work-wiki-log-filter"
            label="Has linked work log"
            onChange={onLinkedLogFilter}
            options={[
              { label: "Has work log", value: "yes" },
              { label: "No work log", value: "no" },
            ]}
            value={linkedLogFilter}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Wiki segments">
        {segments.map((item, index) => (
          <button
            aria-pressed={segment === item.value}
            className={cn(
              quietButtonClass,
              segment === item.value &&
                "border-[rgba(95,200,215,.42)] bg-[rgba(95,200,215,.13)] text-[var(--text-primary)]",
            )}
            key={`work-wiki-segment-${index}`}
            onClick={() => onSegment(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function FilterSelect({
  id,
  label,
  onChange,
  options,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly { label: string; value: string }[];
  value: string;
}>) {
  return (
    <label htmlFor={id}>
      <FieldLabel>{label}</FieldLabel>
      <select
        className={inputClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PinnedReferences({
  entries,
  onOpen,
  profileId,
  state,
}: Readonly<{
  entries: readonly WorkWikiEntry[];
  onOpen: (entry: WorkWikiEntry) => void;
  profileId: WorkWikiViewModel["profileId"];
  state: WorkWikiViewModel["contentStates"]["pinnedReferences"];
}>) {
  return (
    <Panel
      badge={<Pill accent={referenceAccent}>{entries.length} pinned</Pill>}
      sectionProps={{
        "data-work-wiki-section": "pinned-references",
        ...contentStateDataAttributes(state, profileId),
      }}
      subtitle="Frequently used process, checklist and glossary notes."
      title="Pinned References"
    >
      {entries.length === 0 ? (
        <EmptyState
          description="Pinned references appear when important lookup notes are available."
          title="Keine gepinnten Referenzen"
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {entries.map((entry) => (
            <article
              className="rounded-[15px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4"
              key={entry.id}
            >
              <div className="flex flex-wrap gap-2">
                <Pill accent={referenceAccent}>{optionLabel(entry.type)}</Pill>
                <Pill accent={wikiStatusMeta[entry.status].accent}>
                  {wikiStatusMeta[entry.status].label}
                </Pill>
              </div>
              <h3 className="mt-3 text-[14px] font-semibold leading-5 text-[var(--text-primary)]">
                {entry.title}
              </h3>
              <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                {entry.summary}
              </p>
              <button className={cn(quietButtonClass, "mt-3")} onClick={() => onOpen(entry)} type="button">
                Open entry
              </button>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function WikiNeedsReviewPanel({
  entries,
  onOpen,
  onReview,
  profileId,
  state,
}: Readonly<{
  entries: readonly WorkWikiEntry[];
  onOpen: (entry: WorkWikiEntry) => void;
  onReview: (entry: WorkWikiEntry) => void;
  profileId: WorkWikiViewModel["profileId"];
  state: WorkWikiViewModel["contentStates"]["needsReview"];
}>) {
  return (
    <Panel
      badge={<Pill accent={warningAccent}>{entries.length} review</Pill>}
      sectionProps={{
        "data-work-wiki-section": "needs-review",
        ...contentStateDataAttributes(state, profileId),
      }}
      subtitle="Visible but calm: entries that need a later human pass."
      title="Needs Review"
    >
      {entries.length === 0 ? (
        <EmptyState
          description="Entries that need a later check will appear here."
          title="Keine Wiki-Einträge im Review"
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {entries.map((entry) => (
            <article
              className="rounded-[15px] border border-[rgba(217,146,79,.26)] bg-[rgba(217,146,79,.06)] p-4"
              key={entry.id}
            >
              <h3 className="text-[14px] font-semibold leading-5 text-[var(--text-primary)]">
                {entry.title}
              </h3>
              <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                {entry.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={quietButtonClass} onClick={() => onOpen(entry)} type="button">
                  Open entry
                </button>
                <button className={quietButtonClass} onClick={() => onReview(entry)} type="button">
                  Review entry
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function WikiLookupPanel({
  canUseLocalWorkDrafts,
  entries,
  onAddWiki,
  onOpen,
  profileId,
  query,
  state,
}: Readonly<{
  canUseLocalWorkDrafts: boolean;
  entries: readonly WorkWikiEntry[];
  onAddWiki: () => void;
  onOpen: (entry: WorkWikiEntry) => void;
  profileId: WorkWikiViewModel["profileId"];
  query: string;
  state: WorkWikiViewModel["contentStates"]["wikiLookup"];
}>) {
  return (
    <Panel
      badge={<Pill accent={referenceAccent}>{entries.length} results</Pill>}
      className="border-[rgba(95,200,215,.30)]"
      sectionProps={{
        "data-work-wiki-section": "wiki-lookup",
        ...contentStateDataAttributes(state, profileId),
      }}
      subtitle="Searchable personal work knowledge, not an official company wiki."
      title="Wiki Lookup"
    >
      {entries.length === 0 ? (
        <EmptyState
          actionLabel={canUseLocalWorkDrafts ? "Add wiki entry" : undefined}
          description="No wiki entries match the current lookup filters."
          onAction={canUseLocalWorkDrafts ? onAddWiki : undefined}
          title={query ? "No wiki results" : "Noch keine Wiki-Einträge"}
        />
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <article
              className="rounded-[15px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4 transition hover:border-[var(--border-default)]"
              key={entry.id}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
                    {entry.title}
                  </h3>
                  <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                    {entry.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill accent={referenceAccent}>{optionLabel(entry.type)}</Pill>
                  <Pill accent={wikiStatusMeta[entry.status].accent}>
                    {wikiStatusMeta[entry.status].label}
                  </Pill>
                </div>
              </div>
              <div className="mt-3">
                <TagList tags={entry.tags} />
              </div>
              <p className="mt-3 text-[11px] leading-4 text-[var(--text-muted)]">
                Last reviewed: {entry.lastReviewedAt ? formatDate(entry.lastReviewedAt) : "Not reviewed"} · Work logs:{" "}
                {entry.relatedLogEntryIds.length} · Architecture:{" "}
                {entry.relatedArchitectureItemIds.length}
              </p>
              <button className={cn(quietButtonClass, "mt-3")} onClick={() => onOpen(entry)} type="button">
                Open entry
              </button>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ArchitectureNotesPanel({
  architectureItems,
  canUseLocalWorkDrafts,
  onAddArchitecture,
  onOpen,
  profileId,
  state,
}: Readonly<{
  architectureItems: readonly WorkArchitectureItem[];
  canUseLocalWorkDrafts: boolean;
  onAddArchitecture: () => void;
  onOpen: (item: WorkArchitectureItem) => void;
  profileId: WorkWikiViewModel["profileId"];
  state: WorkWikiViewModel["contentStates"]["architectureNotes"];
}>) {
  return (
    <Panel
      badge={<Pill accent={referenceAccent}>{architectureItems.length}</Pill>}
      sectionProps={{
        "data-work-wiki-section": "architecture-notes",
        ...contentStateDataAttributes(state, profileId),
      }}
      subtitle="Personal architecture notes with text summaries only."
      title="Architecture Notes"
    >
      {architectureItems.length === 0 ? (
        <EmptyState
          actionLabel={canUseLocalWorkDrafts ? "Add architecture note" : undefined}
          description="Add a local architecture note without system names or automation."
          onAction={canUseLocalWorkDrafts ? onAddArchitecture : undefined}
          title="Keine Architektur-Notizen"
        />
      ) : (
        <div className="grid gap-3">
          {architectureItems.map((item) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4"
              key={item.id}
            >
              <div className="flex flex-wrap gap-2">
                <Pill accent={referenceAccent}>{optionLabel(item.type)}</Pill>
                <Pill accent={architectureStatusMeta[item.status].accent}>
                  {architectureStatusMeta[item.status].label}
                </Pill>
              </div>
              <h3 className="mt-3 text-[14px] font-semibold leading-5 text-[var(--text-primary)]">
                {item.title}
              </h3>
              <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                {item.summary}
              </p>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                Related Wiki: {item.wikiEntryIds.length}
              </p>
              <button className={cn(quietButtonClass, "mt-3")} onClick={() => onOpen(item)} type="button">
                Open architecture note
              </button>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function WikiCategories({
  entries,
  profileId,
  state,
}: Readonly<{
  entries: readonly WorkWikiEntry[];
  profileId: WorkWikiViewModel["profileId"];
  state: WorkWikiViewModel["contentStates"]["wikiCategories"];
}>) {
  const counts = wikiTypes.map((type) => ({
    type,
    count: entries.filter((entry) => entry.type === type).length,
  }));

  return (
    <Panel
      sectionProps={{
        "data-work-wiki-section": "wiki-categories",
        ...contentStateDataAttributes(state, profileId),
      }}
      subtitle="Compact category counts."
      title="Wiki Categories"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {counts.map((item) => (
          <Metric
            accent={item.type === "architecture" ? referenceAccent : workAccent}
            key={item.type}
            label={optionLabel(item.type)}
            value={item.count}
          />
        ))}
      </div>
    </Panel>
  );
}

function RecentlyUpdatedWiki({
  entries,
  onOpen,
}: Readonly<{
  entries: readonly WorkWikiEntry[];
  onOpen: (entry: WorkWikiEntry) => void;
}>) {
  return (
    <Panel subtitle="Recently reviewed or edited notes." title="Recently Updated">
      <div className="grid gap-2">
        {entries.slice(0, 5).map((entry) => (
          <button
            className="rounded-[13px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] p-3 text-left transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            key={entry.id}
            onClick={() => onOpen(entry)}
            type="button"
          >
            <span className="block text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
              {entry.title}
            </span>
            <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
              {entry.lastReviewedAt ? formatDate(entry.lastReviewedAt) : "Not reviewed"} ·{" "}
              {wikiStatusMeta[entry.status].label}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function LinkedWorkLogs({
  logs,
  wikiEntries,
}: Readonly<{
  logs: readonly WorkLogEntry[];
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const linkedLogs = logs
    .map((log) => ({
      log,
      wikiCount: wikiEntries.filter((entry) =>
        entry.relatedLogEntryIds.includes(log.id),
      ).length,
    }))
    .filter((item) => item.wikiCount > 0);

  return (
    <Panel subtitle="Recent links between Work Log and Wiki." title="Linked Work Logs">
      {linkedLogs.length === 0 ? (
        <EmptyState
          description="Work logs with wiki references appear here."
          title="No linked work logs"
        />
      ) : (
        <div className="grid gap-2">
          {linkedLogs.slice(0, 5).map(({ log, wikiCount }) => (
            <div
              className="rounded-[13px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] p-3"
              key={log.id}
            >
              <p className="text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
                {log.title}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {formatDate(log.date)} · {wikiCount} wiki links
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function WorkWikiDialog({
  architectureDraft,
  architectureItems,
  dialog,
  dialogError,
  isEditingWiki,
  logs,
  onArchitectureDraft,
  onClose,
  onSubmitArchitecture,
  onSubmitWiki,
  onWikiDraft,
  tasks,
  wikiDraft,
  wikiEntries,
}: Readonly<{
  architectureDraft: ArchitectureDraft;
  architectureItems: readonly WorkArchitectureItem[];
  dialog: Exclude<DialogKind, null>;
  dialogError: string | null;
  isEditingWiki: boolean;
  logs: readonly WorkLogEntry[];
  onArchitectureDraft: (draft: ArchitectureDraft) => void;
  onClose: () => void;
  onSubmitArchitecture: () => void;
  onSubmitWiki: () => void;
  onWikiDraft: (draft: WikiDraft) => void;
  tasks: readonly WorkTask[];
  wikiDraft: WikiDraft;
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const heading =
    dialog === "wiki"
      ? isEditingWiki
        ? "Edit wiki entry"
        : "Add wiki entry"
      : "Add architecture note";

  return (
    <div className="flex max-h-[calc(100dvh-24px)] flex-col">
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="work-wiki-dialog-heading">
          {heading}
        </h2>
        <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
          Saves are local mock state only. The wiki is personal work reference.
        </p>
      </div>
      <div className="min-h-0 overflow-y-auto p-5">
        {dialogError ? (
          <div className="mb-4 rounded-[14px] border border-[rgba(221,107,95,.32)] bg-[rgba(221,107,95,.08)] p-3 text-[12px] leading-5 text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--accent-red)]">Save error:</span>{" "}
            {dialogError}
          </div>
        ) : null}
        {dialog === "wiki" ? (
          <div className="grid gap-4">
            <TextInput
              id="work-wiki-title"
              label="Title *"
              onChange={(value) => onWikiDraft({ ...wikiDraft, title: value })}
              value={wikiDraft.title}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="work-wiki-type">
                <FieldLabel>Type</FieldLabel>
                <select
                  className={inputClass}
                  id="work-wiki-type"
                  onChange={(event) =>
                    onWikiDraft({
                      ...wikiDraft,
                      type: event.target.value as WorkWikiType,
                    })
                  }
                  value={wikiDraft.type}
                >
                  {wikiTypes.map((type) => (
                    <option key={type} value={type}>
                      {optionLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="work-wiki-status">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="work-wiki-status"
                  onChange={(event) =>
                    onWikiDraft({
                      ...wikiDraft,
                      status: event.target.value as WorkWikiEntry["status"],
                    })
                  }
                  value={wikiDraft.status}
                >
                  {Object.entries(wikiStatusMeta).map(([status, meta]) => (
                    <option key={status} value={status}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <TextArea
              id="work-wiki-summary"
              label="Summary *"
              onChange={(value) => onWikiDraft({ ...wikiDraft, summary: value })}
              value={wikiDraft.summary}
            />
            <TextArea
              id="work-wiki-body"
              label="Body"
              onChange={(value) => onWikiDraft({ ...wikiDraft, body: value })}
              optional
              value={wikiDraft.body}
            />
            <TextInput
              id="work-wiki-tags"
              label="Tags"
              onChange={(value) => onWikiDraft({ ...wikiDraft, tags: value })}
              optional
              value={wikiDraft.tags}
            />
            <MultiSelect
              id="work-wiki-related-logs"
              label="Related work logs"
              onChange={(value) =>
                onWikiDraft({ ...wikiDraft, relatedLogEntryIds: value })
              }
              options={logs.map((log) => ({ label: log.title, value: log.id }))}
              value={wikiDraft.relatedLogEntryIds}
            />
            <MultiSelect
              id="work-wiki-related-tasks"
              label="Related tasks"
              onChange={(value) =>
                onWikiDraft({ ...wikiDraft, relatedTaskIds: value })
              }
              options={tasks.map((task) => ({ label: task.title, value: task.id }))}
              value={wikiDraft.relatedTaskIds}
            />
            <MultiSelect
              id="work-wiki-related-architecture"
              label="Related architecture items"
              onChange={(value) =>
                onWikiDraft({
                  ...wikiDraft,
                  relatedArchitectureItemIds: value,
                })
              }
              options={architectureItems.map((item) => ({
                label: item.title,
                value: item.id,
              }))}
              value={wikiDraft.relatedArchitectureItemIds}
            />
          </div>
        ) : null}
        {dialog === "architecture" ? (
          <div className="grid gap-4">
            <TextInput
              id="work-architecture-title"
              label="Title *"
              onChange={(value) =>
                onArchitectureDraft({ ...architectureDraft, title: value })
              }
              value={architectureDraft.title}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="work-architecture-type">
                <FieldLabel>Type</FieldLabel>
                <select
                  className={inputClass}
                  id="work-architecture-type"
                  onChange={(event) =>
                    onArchitectureDraft({
                      ...architectureDraft,
                      type: event.target.value as WorkArchitectureItemType,
                    })
                  }
                  value={architectureDraft.type}
                >
                  {architectureTypes.map((type) => (
                    <option key={type} value={type}>
                      {optionLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="work-architecture-status">
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  id="work-architecture-status"
                  onChange={(event) =>
                    onArchitectureDraft({
                      ...architectureDraft,
                      status: event.target.value as WorkArchitectureItem["status"],
                    })
                  }
                  value={architectureDraft.status}
                >
                  {Object.entries(architectureStatusMeta).map(([status, meta]) => (
                    <option key={status} value={status}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <TextArea
              id="work-architecture-summary"
              label="Summary *"
              onChange={(value) =>
                onArchitectureDraft({ ...architectureDraft, summary: value })
              }
              value={architectureDraft.summary}
            />
            <MultiSelect
              id="work-architecture-related"
              label="Related items"
              onChange={(value) =>
                onArchitectureDraft({ ...architectureDraft, relatedIds: value })
              }
              options={architectureItems.map((item) => ({
                label: item.title,
                value: item.id,
              }))}
              value={architectureDraft.relatedIds}
            />
            <MultiSelect
              id="work-architecture-wiki-links"
              label="Wiki entries"
              onChange={(value) =>
                onArchitectureDraft({ ...architectureDraft, wikiEntryIds: value })
              }
              options={wikiEntries.map((entry) => ({
                label: entry.title,
                value: entry.id,
              }))}
              value={architectureDraft.wikiEntryIds}
            />
            <TextArea
              id="work-architecture-note"
              label="Note"
              onChange={(value) =>
                onArchitectureDraft({ ...architectureDraft, note: value })
              }
              optional
              value={architectureDraft.note}
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
        <button className={secondaryButtonClass} onClick={onClose} type="button">
          Cancel
        </button>
        <button
          className={primaryButtonClass}
          onClick={dialog === "wiki" ? onSubmitWiki : onSubmitArchitecture}
          type="button"
        >
          Save locally
        </button>
      </div>
    </div>
  );
}

function TextInput({
  id,
  label,
  onChange,
  optional,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string) => void;
  optional?: boolean;
  value: string;
}>) {
  return (
    <label htmlFor={id}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <input
        className={inputClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function TextArea({
  id,
  label,
  onChange,
  optional,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string) => void;
  optional?: boolean;
  value: string;
}>) {
  return (
    <label htmlFor={id}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <textarea
        className={textareaClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function MultiSelect({
  id,
  label,
  onChange,
  options,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string[]) => void;
  options: readonly { label: string; value: string }[];
  value: string[];
}>) {
  return (
    <label htmlFor={id}>
      <FieldLabel optional>{label}</FieldLabel>
      <select
        className={cn(inputClass, "min-h-[124px] py-2")}
        id={id}
        multiple
        onChange={(event) => onChange(selectedValues(event))}
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

function WorkWikiInspector({
  architectureItems,
  logs,
  onAddWiki,
  onClose,
  onEditWiki,
  onMarkReviewed,
  selectedArchitecture,
  selectedWiki,
  tasks,
  wikiEntries,
}: Readonly<{
  architectureItems: readonly WorkArchitectureItem[];
  logs: readonly WorkLogEntry[];
  onAddWiki: (architectureId: string) => void;
  onClose: () => void;
  onEditWiki: (entry: WorkWikiEntry) => void;
  onMarkReviewed: (entry: WorkWikiEntry) => void;
  selectedArchitecture: WorkArchitectureItem | null;
  selectedWiki: WorkWikiEntry | null;
  tasks: readonly WorkTask[];
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const open = Boolean(selectedWiki || selectedArchitecture);

  return (
    <DialogShell labelledBy="work-wiki-inspector-heading" onClose={onClose} open={open} sheet>
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="work-wiki-inspector-heading">
            {selectedWiki?.title ?? selectedArchitecture?.title ?? "Inspector"}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
            Local reference detail. No official company documentation.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {selectedWiki ? (
            <WikiInspectorBody
              architectureItems={architectureItems}
              entry={selectedWiki}
              logs={logs}
              tasks={tasks}
            />
          ) : null}
          {selectedArchitecture ? (
            <ArchitectureInspectorBody
              item={selectedArchitecture}
              wikiEntries={wikiEntries}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          {selectedWiki ? (
            <>
              <button
                className={secondaryButtonClass}
                onClick={() => onEditWiki(selectedWiki)}
                type="button"
              >
                Edit entry
              </button>
              <button
                className={secondaryButtonClass}
                onClick={() => onMarkReviewed(selectedWiki)}
                type="button"
              >
                Mark reviewed
              </button>
            </>
          ) : null}
          {selectedArchitecture ? (
            <button
              className={secondaryButtonClass}
              onClick={() => onAddWiki(selectedArchitecture.id)}
              type="button"
            >
              Add wiki entry
            </button>
          ) : null}
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

function WikiInspectorBody({
  architectureItems,
  entry,
  logs,
  tasks,
}: Readonly<{
  architectureItems: readonly WorkArchitectureItem[];
  entry: WorkWikiEntry;
  logs: readonly WorkLogEntry[];
  tasks: readonly WorkTask[];
}>) {
  const relatedLogs = entry.relatedLogEntryIds
    .map((id) => findLog(logs, id))
    .filter((log): log is WorkLogEntry => Boolean(log));
  const relatedTasks = entry.relatedTaskIds
    .map((id) => findTask(tasks, id))
    .filter((task): task is WorkTask => Boolean(task));
  const relatedArchitecture = entry.relatedArchitectureItemIds
    .map((id) => findArchitecture(architectureItems, id))
    .filter((item): item is WorkArchitectureItem => Boolean(item));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Pill accent={referenceAccent}>{optionLabel(entry.type)}</Pill>
        <Pill accent={wikiStatusMeta[entry.status].accent}>
          {wikiStatusMeta[entry.status].label}
        </Pill>
      </div>
      <InspectorBlock label="Summary" value={entry.summary} />
      <InspectorBlock label="Body" value={entry.body} />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Tags
        </p>
        <div className="mt-2">
          <TagList tags={entry.tags} />
        </div>
      </div>
      <RelationList label="Related Work Logs" items={relatedLogs.map((log) => log.title)} />
      <RelationList label="Related Tasks" items={relatedTasks.map((task) => task.title)} />
      <RelationList
        label="Related Architecture"
        items={relatedArchitecture.map((item) => item.title)}
      />
    </div>
  );
}

function ArchitectureInspectorBody({
  item,
  wikiEntries,
}: Readonly<{
  item: WorkArchitectureItem;
  wikiEntries: readonly WorkWikiEntry[];
}>) {
  const linkedWiki = item.wikiEntryIds
    .map((id) => findWiki(wikiEntries, id))
    .filter((entry): entry is WorkWikiEntry => Boolean(entry));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Pill accent={referenceAccent}>{optionLabel(item.type)}</Pill>
        <Pill accent={architectureStatusMeta[item.status].accent}>
          {architectureStatusMeta[item.status].label}
        </Pill>
      </div>
      <InspectorBlock label="Summary" value={item.summary} />
      <RelationList label="Related Items" items={item.relatedIds} />
      <RelationList label="Wiki Entries" items={linkedWiki.map((entry) => entry.title)} />
      <InspectorBlock label="Note" value={item.note} />
    </div>
  );
}

function InspectorBlock({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
        {value}
      </p>
    </div>
  );
}

function RelationList({
  items,
  label,
}: Readonly<{ items: readonly string[]; label: string }>) {
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 grid gap-2">
          {items.map((item) => (
            <li className="text-[12px] leading-5 text-[var(--text-secondary)]" key={item}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12px] text-[var(--text-muted)]">No links yet.</p>
      )}
    </div>
  );
}
