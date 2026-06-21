"use client";

import { useMemo, useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import type { LifeNote, LifeNoteType, LifeSource, NotesPageViewModel } from "./types";
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
  PrivacyPill,
  SaveErrorState,
  SegmentButton,
  StatusPill,
  TagList,
  Toast,
  compactText,
  formatDate,
  inputClass,
  localId,
  normalizeTags,
  noteSourceLabels,
  noteTypeLabels,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
  type ToastState,
} from "./components/life-workbench-primitives";

type NoteDraft = {
  title: string;
  type: LifeNoteType;
  note: string;
  tags: string;
  source: LifeSource;
  intentionallyUnstructured: boolean;
};

const noteTypes: readonly LifeNoteType[] = [
  "thought",
  "memory",
  "idea",
  "reflection",
  "quote",
  "question",
  "misc",
];

const noteSources: readonly LifeSource[] = [
  "manual",
  "quick_capture",
  "journal",
  "import",
  "system",
];

function createLifeNote(draft: NoteDraft): LifeNote {
  const now = new Date().toISOString();

  return {
    id: localId("note"),
    title: draft.title.trim(),
    type: draft.type,
    createdAt: now,
    updatedAt: now,
    snippet: compactText(draft.note.trim(), 180),
    body: draft.note.trim(),
    tags: normalizeTags(draft.tags),
    source: draft.source,
    intentionallyUnstructured: draft.intentionallyUnstructured,
    privacy: "private",
  };
}

function LifeNoteDialog({
  onClose,
  onSave,
}: Readonly<{
  onClose: () => void;
  onSave: (note: LifeNote) => void;
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

    onSave(createLifeNote(draft));
  }

  return (
    <DialogFrame
      description="Local note only. It will not become a task or knowledge item automatically."
      onClose={onClose}
      title="New note"
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
              onChange={(event) => update("source", event.target.value as LifeSource)}
              value={draft.source}
            >
              {noteSources.map((source) => (
                <option key={source} value={source}>
                  {noteSourceLabels[source]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <FieldLabel>Note *</FieldLabel>
          <textarea
            className={cn(inputClass, "min-h-32 resize-y py-3 leading-5")}
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

function LifeNoteInspector({
  note,
  onClose,
  onToast,
}: Readonly<{
  note: LifeNote;
  onClose: () => void;
  onToast: (toast: ToastState) => void;
}>) {
  return (
    <DialogFrame
      description="Full local preview for a loose note."
      onClose={onClose}
      title={note.title}
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="cyan">{noteTypeLabels[note.type]}</StatusPill>
          <StatusPill tone="blue" quiet>
            {noteSourceLabels[note.source]}
          </StatusPill>
          {note.intentionallyUnstructured ? (
            <StatusPill tone="cyan" quiet>
              Kept loose
            </StatusPill>
          ) : null}
          <PrivacyPill privacy={note.privacy} />
        </div>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {note.body}
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="Created" value={formatDate(note.createdAt)} />
          <DetailRow label="Updated" value={formatDate(note.updatedAt)} />
        </dl>
        <TagList tags={note.tags} />
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
          <button
            className={secondaryButtonClass}
            onClick={() =>
              onToast({
                title: "Edit note prepared",
                body: "Editing is local-only in this MVP.",
                tone: "info",
              })
            }
            type="button"
          >
            Edit note
          </button>
          <button
            className={secondaryButtonClass}
            onClick={() =>
              onToast({
                title: "Kept as note",
                body: "No task or knowledge item was created.",
                tone: "success",
              })
            }
            type="button"
          >
            Keep as note
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

function typeCounts(notes: LifeNote[]) {
  return noteTypes.map((type) => ({
    type,
    count: notes.filter((note) => note.type === type).length,
  }));
}

export function NotesPage({
  viewModel,
}: Readonly<{
  viewModel: NotesPageViewModel;
}>) {
  const [notes, setNotes] = useState(viewModel.notes);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<LifeNoteType | "all">("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [source, setSource] = useState<LifeSource | "all">("all");
  const [keptLoose, setKeptLoose] = useState<"all" | "yes" | "no">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<LifeNote | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const tags = useMemo(
    () => Array.from(new Set(notes.flatMap((note) => note.tags))).sort(),
    [notes],
  );

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notes.filter((note) => {
      const matchesQuery =
        !query ||
        note.title.toLowerCase().includes(query) ||
        note.snippet.toLowerCase().includes(query) ||
        note.body.toLowerCase().includes(query) ||
        note.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesType = activeType === "all" || note.type === activeType;
      const matchesTag = selectedTag === "all" || note.tags.includes(selectedTag);
      const matchesSource = source === "all" || note.source === source;
      const matchesLoose =
        keptLoose === "all" ||
        (keptLoose === "yes" && note.intentionallyUnstructured) ||
        (keptLoose === "no" && !note.intentionallyUnstructured);

      return matchesQuery && matchesType && matchesTag && matchesSource && matchesLoose;
    });
  }, [activeType, keptLoose, notes, search, selectedTag, source]);

  function saveNote(note: LifeNote) {
    try {
      setNotes((current) => [note, ...current]);
      setSaveError(null);
      setDialogOpen(false);
      setToast({
        title: "Note kept as loose note",
        body: "No automatic task or knowledge item was created.",
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

  return (
    <LifePageShell accent="var(--accent-cyan)">
      <LifeSubpageHeader
        header={viewModel.header}
        primaryAction={
          <button className={primaryButtonClass} onClick={() => setDialogOpen(true)} type="button">
            New note
          </button>
        }
        secondaryActions={
          <>
            <button className={secondaryButtonClass} onClick={() => setDialogOpen(true)} type="button">
              Quick capture note
            </button>
            <a className={secondaryButtonClass} href="#note-filters">
              Filter notes
            </a>
          </>
        }
      />

      <SaveErrorState message={saveError} />

      <Panel
        action={<StatusPill tone="cyan" quiet>{filteredNotes.length} shown</StatusPill>}
        className="border-[color-mix(in_srgb,var(--accent-cyan)_24%,var(--border-subtle))]"
        subtitle="A brain dump history for thoughts that should remain loose until manually moved later."
        title="Brain Dump History"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px_160px]">
          <label>
            <FieldLabel>Search notes</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes"
              type="search"
              value={search}
            />
          </label>
          <FilterSelect
            label="Type"
            onChange={setActiveType}
            options={[
              { value: "all", label: "All types" },
              ...noteTypes.map((type) => ({ value: type, label: noteTypeLabels[type] })),
            ]}
            value={activeType}
          />
          <FilterSelect
            label="Source"
            onChange={setSource}
            options={[
              { value: "all", label: "All sources" },
              ...noteSources.map((item) => ({ value: item, label: noteSourceLabels[item] })),
            ]}
            value={source}
          />
          <FilterSelect
            label="Kept loose"
            onChange={setKeptLoose}
            options={[
              { value: "all", label: "All" },
              { value: "yes", label: "Kept loose" },
              { value: "no", label: "Structured later" },
            ]}
            value={keptLoose}
          />
        </div>
        <div className="mt-3" id="note-filters">
          <FilterSelect
            label="Tag"
            onChange={setSelectedTag}
            options={[
              { value: "all", label: "All tags" },
              ...tags.map((tag) => ({ value: tag, label: tag })),
            ]}
            value={selectedTag}
          />
        </div>

        <div className="mt-4 grid gap-3">
          {notes.length === 0 ? (
            <LifeEmptyState
              description="Create a local loose note. It will stay separate from Tasks and Resources."
              title="Empty Notes"
            />
          ) : filteredNotes.length === 0 ? (
            <LifeEmptyState
              description="No notes match the current search or filters."
              title="No search results"
            />
          ) : (
            filteredNotes.map((note) => (
              <article
                className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3"
                key={note.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <StatusPill tone="cyan">{noteTypeLabels[note.type]}</StatusPill>
                      <StatusPill tone="blue" quiet>
                        {noteSourceLabels[note.source]}
                      </StatusPill>
                      {note.intentionallyUnstructured ? (
                        <StatusPill tone="cyan" quiet>
                          Kept loose
                        </StatusPill>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                      {note.title}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      {note.snippet}
                    </p>
                  </div>
                  <p className="shrink-0 text-[10px] text-[var(--text-muted)]">
                    {formatDate(note.createdAt)}
                  </p>
                </div>
                <div className="mt-3">
                  <TagList tags={note.tags} />
                </div>
                <button
                  className={quietButtonClass}
                  onClick={() => setSelectedNote(note)}
                  type="button"
                >
                  Open note
                </button>
              </article>
            ))
          )}
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,.8fr)_minmax(0,.8fr)]">
        <Panel
          action={
            <button className={secondaryButtonClass} onClick={() => setDialogOpen(true)} type="button">
              New note
            </button>
          }
          subtitle="Same local fields as the dialog; this shortcut keeps capture visible on mobile."
          title="New Note Composer"
        >
          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            Use the dialog to capture a loose thought with title, type, body, tags,
            source and the kept-loose checkbox.
          </p>
        </Panel>

        <Panel subtitle="Counts are local mock signals only." title="Note Types">
          <div className="flex flex-wrap gap-2">
            <SegmentButton active={activeType === "all"} onSelect={setActiveType} value="all">
              All / {notes.length}
            </SegmentButton>
            {typeCounts(notes).map(({ type, count }) => (
              <SegmentButton
                active={activeType === type}
                key={type}
                onSelect={setActiveType}
                value={type}
              >
                {noteTypeLabels[type]} / {count}
              </SegmentButton>
            ))}
          </div>
        </Panel>
      </div>

      <Panel subtitle="Context only. No automation or conversion is triggered." title="Recent Capture Sources">
        <div className="grid gap-3 sm:grid-cols-3">
          {noteSources.slice(0, 3).map((item) => (
            <div
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3"
              key={item}
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {noteSourceLabels[item]}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                {notes.filter((note) => note.source === item).length} notes
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {dialogOpen ? (
        <LifeNoteDialog onClose={() => setDialogOpen(false)} onSave={saveNote} />
      ) : null}

      {selectedNote ? (
        <LifeNoteInspector
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onToast={setToast}
        />
      ) : null}

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </LifePageShell>
  );
}
