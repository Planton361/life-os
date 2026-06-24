"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  contentStateDataAttributes,
  resolveContentStateMeta,
  type ContentStateMeta,
} from "@/features/content-state";
import { cn } from "@/lib/cn";
import type {
  EntertainmentItem,
  EntertainmentPageViewModel,
  EntertainmentStatus,
  EntertainmentType,
  LifePriority,
} from "./types";
import {
  DetailRow,
  DialogError,
  DialogFooter,
  DialogFrame,
  FieldLabel,
  FilterSelect,
  LifeEmptyState,
  LifePageShell,
  LifeSubpageHeader,
  Panel,
  SaveErrorState,
  SegmentButton,
  StatusPill,
  Toast,
  compactText,
  formatDate,
  inputClass,
  localId,
  mediaStatusLabels,
  mediaTypeLabels,
  primaryButtonClass,
  priorityLabels,
  priorityRank,
  quietButtonClass,
  secondaryButtonClass,
  type ToastState,
} from "./components/life-workbench-primitives";

type MediaSegment = "current" | "wishlist" | "finished" | "paused" | "all";

type MediaDraft = {
  title: string;
  type: EntertainmentType;
  status: EntertainmentStatus;
  priority: LifePriority;
  note: string;
  nextAction: string;
};

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

const priorities: readonly LifePriority[] = ["high", "medium", "low"];

const segments: readonly { value: MediaSegment; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "wishlist", label: "Wishlist" },
  { value: "finished", label: "Finished" },
  { value: "paused", label: "Paused" },
  { value: "all", label: "All" },
];

function createMediaItem(draft: MediaDraft): EntertainmentItem {
  const now = new Date().toISOString();

  return {
    id: localId("media"),
    title: draft.title.trim(),
    type: draft.type,
    status: draft.status,
    priority: draft.priority,
    note: draft.note.trim() || undefined,
    nextAction: draft.nextAction.trim() || undefined,
    addedAt: now,
    updatedAt: now,
    ratingPersonal: "not_rated",
  };
}

function AddMediaDialog({
  initialStatus = "wishlist",
  onClose,
  onSave,
}: Readonly<{
  initialStatus?: EntertainmentStatus;
  onClose: () => void;
  onSave: (item: EntertainmentItem) => void;
}>) {
  const [draft, setDraft] = useState<MediaDraft>({
    title: "",
    type: "series",
    status: initialStatus,
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

    onSave(createMediaItem(draft));
  }

  return (
    <DialogFrame
      description="Local media shelf item only. No social profile, rating community or external lookup."
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
              onChange={(event) => update("priority", event.target.value as LifePriority)}
              value={draft.priority}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabels[priority]}
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

function MediaInspector({
  item,
  onClose,
  onStatusChange,
  onToast,
}: Readonly<{
  item: EntertainmentItem;
  onClose: () => void;
  onStatusChange: (status: EntertainmentStatus) => void;
  onToast: (toast: ToastState) => void;
}>) {
  return (
    <DialogFrame
      description="Personal media detail. No social or streaming integration is connected."
      onClose={onClose}
      title={item.title}
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="blue">{mediaTypeLabels[item.type]}</StatusPill>
          <StatusPill tone="purple" quiet>
            {mediaStatusLabels[item.status]}
          </StatusPill>
          <StatusPill tone="gray" quiet>
            {priorityLabels[item.priority]} priority
          </StatusPill>
        </div>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {item.note ?? "No personal note yet."}
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="Next action" value={item.nextAction ?? "not set"} />
          <DetailRow label="Added" value={formatDate(item.addedAt)} />
          <DetailRow label="Updated" value={formatDate(item.updatedAt)} />
          <DetailRow label="Personal rating" value={item.ratingPersonal ?? "not_rated"} />
        </dl>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
          <button
            className={secondaryButtonClass}
            onClick={() =>
              onToast({
                title: "Edit prepared",
                body: "Editing is represented as local UI state in this MVP.",
                tone: "info",
              })
            }
            type="button"
          >
            Edit
          </button>
          <button className={secondaryButtonClass} onClick={() => onStatusChange("finished")} type="button">
            Mark finished
          </button>
          <button className={secondaryButtonClass} onClick={() => onStatusChange("paused")} type="button">
            Pause
          </button>
          <button className={secondaryButtonClass} disabled type="button">
            Archive
          </button>
          <button className={primaryButtonClass} onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}

function matchesSegment(item: EntertainmentItem, segment: MediaSegment) {
  if (segment === "current") {
    return ["watching", "reading", "playing"].includes(item.status);
  }

  if (segment === "wishlist") {
    return item.status === "wishlist";
  }

  if (segment === "finished") {
    return item.status === "finished";
  }

  if (segment === "paused") {
    return item.status === "paused";
  }

  return true;
}

function stateAttrs(meta: ContentStateMeta, profileId: string) {
  return contentStateDataAttributes(meta, profileId);
}

function buildContentStates(
  viewModel: EntertainmentPageViewModel,
): NonNullable<EntertainmentPageViewModel["contentStates"]> {
  const currentItems = viewModel.items.filter((item) =>
    ["watching", "reading", "playing"].includes(item.status),
  );
  const wishlistItems = viewModel.items.filter(
    (item) => item.status === "wishlist",
  );
  const finishedPausedItems = viewModel.items.filter((item) =>
    ["finished", "paused"].includes(item.status),
  );

  return {
    page: resolveContentStateMeta({
      capacity: 4,
      itemCount: viewModel.items.length > 0 ? 4 : 0,
    }),
    shelf: resolveContentStateMeta({
      capacity: 6,
      itemCount: viewModel.items.length,
    }),
    currentMedia: resolveContentStateMeta({
      capacity: 5,
      itemCount: currentItems.length,
    }),
    wishlist: resolveContentStateMeta({
      capacity: 5,
      itemCount: wishlistItems.length,
    }),
    finishedPaused: resolveContentStateMeta({
      capacity: 5,
      itemCount: finishedPausedItems.length,
    }),
  };
}

function MediaRow({
  item,
  onOpen,
}: Readonly<{
  item: EntertainmentItem;
  onOpen: (item: EntertainmentItem) => void;
}>) {
  return (
    <article className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="blue">{mediaTypeLabels[item.type]}</StatusPill>
            <StatusPill tone="purple" quiet>
              {mediaStatusLabels[item.status]}
            </StatusPill>
            <StatusPill tone="gray" quiet>
              {priorityLabels[item.priority]}
            </StatusPill>
          </div>
          <h2 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
            {item.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {compactText(item.note ?? "No note added yet.")}
          </p>
        </div>
        <p className="shrink-0 text-[10px] text-[var(--text-muted)]">
          Updated {formatDate(item.updatedAt)}
        </p>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-muted)]">Next:</span>{" "}
        {item.nextAction ?? "Decide later"}
      </p>
      <button className={quietButtonClass} onClick={() => onOpen(item)} type="button">
        Open media
      </button>
    </article>
  );
}

export function EntertainmentPage({
  viewModel,
}: Readonly<{
  viewModel: EntertainmentPageViewModel;
}>) {
  const [items, setItems] = useState(viewModel.items);
  const [segment, setSegment] = useState<MediaSegment>("current");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<LifePriority | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<EntertainmentStatus>("wishlist");
  const [selectedItem, setSelectedItem] = useState<EntertainmentItem | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const profileId = viewModel.profileId ?? "demo";
  const contentStates = viewModel.contentStates ?? buildContentStates(viewModel);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items
      .filter((item) => {
        const matchesQuery =
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.note?.toLowerCase().includes(query) ||
          item.nextAction?.toLowerCase().includes(query);
        const matchesPriority = priority === "all" || item.priority === priority;

        return matchesSegment(item, segment) && matchesQuery && matchesPriority;
      })
      .sort(
        (left, right) =>
          priorityRank(left.priority) - priorityRank(right.priority) ||
          left.title.localeCompare(right.title),
      );
  }, [items, priority, search, segment]);

  const currentItems = items.filter((item) =>
    ["watching", "reading", "playing"].includes(item.status),
  );
  const wishlistItems = items.filter((item) => item.status === "wishlist");
  const finishedPausedItems = items.filter((item) =>
    ["finished", "paused"].includes(item.status),
  );

  function openAddMedia(status: EntertainmentStatus = "wishlist") {
    setDialogStatus(status);
    setDialogOpen(true);
  }

  function saveItem(item: EntertainmentItem) {
    try {
      setItems((current) => [item, ...current]);
      setSaveError(null);
      setDialogOpen(false);
      setToast({
        title: "Media item added locally",
        body: "The shelf changed only in this browser session.",
        tone: "success",
      });
    } catch {
      setSaveError("The local mock save failed. No data was persisted.");
      setToast({
        title: "Save did not complete",
        body: "No data was sent or stored.",
        tone: "error",
      });
    }
  }

  function updateSelectedStatus(status: EntertainmentStatus) {
    if (!selectedItem) {
      return;
    }

    const updated = {
      ...selectedItem,
      status,
      updatedAt: new Date().toISOString(),
    };

    setItems((current) =>
      current.map((item) => (item.id === selectedItem.id ? updated : item)),
    );
    setSelectedItem(updated);
    setToast({
      title: `Media marked ${mediaStatusLabels[status].toLowerCase()}`,
      body: "Status changed locally only.",
      tone: "success",
    });
  }

  return (
    <LifePageShell
      accent="var(--accent-blue)"
      id="life-entertainment-page"
      profileId={profileId}
      sectionAttribute={{ "data-entertainment-section": "page" }}
      stateMeta={contentStates.page}
    >
      <LifeSubpageHeader
        header={viewModel.header}
        primaryAction={
          <button className={primaryButtonClass} onClick={() => openAddMedia()} type="button">
            Add media
          </button>
        }
        secondaryActions={
          <>
            <button className={secondaryButtonClass} onClick={() => openAddMedia("wishlist")} type="button">
              Add to wishlist
            </button>
            <a className={secondaryButtonClass} href="#media-filters">
              Filter shelf
            </a>
          </>
        }
      />

      <SaveErrorState message={saveError} />

      <Panel
        action={<StatusPill tone="blue" quiet>{filteredItems.length} shown</StatusPill>}
        className="border-[color-mix(in_srgb,var(--accent-blue)_24%,var(--border-subtle))]"
        sectionAttribute={{ "data-entertainment-section": "shelf" }}
        stateAttributes={stateAttrs(contentStates.shelf, profileId)}
        subtitle="Personal media status and next actions without ratings community or social mechanics."
        title="Entertainment Shelf"
      >
        <div className="flex flex-wrap gap-2">
          {segments.map((item, index) => (
            <SegmentButton
              active={segment === item.value}
              key={`entertainment-segment-${index}`}
              onSelect={setSegment}
              value={item.value}
            >
              {item.label}
            </SegmentButton>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]" id="media-filters">
          <label>
            <FieldLabel>Search media</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search media"
              type="search"
              value={search}
            />
          </label>
          <FilterSelect
            label="Priority"
            onChange={setPriority}
            options={[
              { value: "all", label: "All priorities" },
              ...priorities.map((item) => ({ value: item, label: priorityLabels[item] })),
            ]}
            value={priority}
          />
        </div>

        <div className="mt-4 grid gap-3">
          {items.length === 0 ? (
            <LifeEmptyState
              description="Medien erscheinen hier, sobald du lokale Einträge erfasst. Keine Social- oder Rating-Integration."
              title="Noch keine Medien"
            />
          ) : filteredItems.length === 0 ? (
            <LifeEmptyState
              description="No media item matches the current segment or search."
              title="No search results"
            />
          ) : (
            filteredItems.map((item) => (
              <MediaRow item={item} key={item.id} onOpen={setSelectedItem} />
            ))
          )}
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-3">
        <Panel
          sectionAttribute={{ "data-entertainment-section": "current-media" }}
          stateAttributes={stateAttrs(contentStates.currentMedia, profileId)}
          subtitle="Currently watching, reading or playing."
          title="Current Media"
        >
          <div className="grid gap-3">
            {currentItems.length === 0 ? (
              <LifeEmptyState
                description="Aktuelle Medien erscheinen hier nur aus lokalen Einträgen."
                title="Nichts aktuell"
              />
            ) : (
              currentItems.slice(0, 5).map((item) => (
                <MediaRow item={item} key={item.id} onOpen={setSelectedItem} />
              ))
            )}
          </div>
        </Panel>

        <Panel
          sectionAttribute={{ "data-entertainment-section": "wishlist" }}
          stateAttributes={stateAttrs(contentStates.wishlist, profileId)}
          subtitle="Remembered media without buying or streaming integration."
          title="Media Wishlist"
        >
          <div className="grid gap-3">
            {wishlistItems.length === 0 ? (
              <LifeEmptyState
                description="Merkliste bleibt lokal und privat; keine externe Watchlist ist verbunden."
                title="Keine Merkliste"
              />
            ) : (
              wishlistItems.slice(0, 5).map((item) => (
                <MediaRow item={item} key={item.id} onOpen={setSelectedItem} />
              ))
            )}
          </div>
        </Panel>

        <Panel
          sectionAttribute={{ "data-entertainment-section": "finished-paused" }}
          stateAttributes={stateAttrs(contentStates.finishedPaused, profileId)}
          subtitle="Quiet reference list, not a rating wall."
          title="Finished / Paused"
        >
          <div className="grid gap-3">
            {finishedPausedItems.length === 0 ? (
              <LifeEmptyState
                description="Abgeschlossene oder pausierte Medien erscheinen hier aus lokalen Einträgen."
                title="Keine abgeschlossenen oder pausierten Medien"
              />
            ) : (
              finishedPausedItems.slice(0, 5).map((item) => (
                <MediaRow item={item} key={item.id} onOpen={setSelectedItem} />
              ))
            )}
          </div>
        </Panel>
      </div>

      {dialogOpen ? (
        <AddMediaDialog
          initialStatus={dialogStatus}
          onClose={() => setDialogOpen(false)}
          onSave={saveItem}
        />
      ) : null}

      {selectedItem ? (
        <MediaInspector
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onStatusChange={updateSelectedStatus}
          onToast={setToast}
        />
      ) : null}

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </LifePageShell>
  );
}
