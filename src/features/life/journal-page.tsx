"use client";

import { useMemo, useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import type { JournalEntry, JournalMood, JournalPageViewModel } from "./types";
import {
  DetailRow,
  DialogError,
  DialogFooter,
  DialogFrame,
  FieldLabel,
  LifeEmptyState,
  LifePageShell,
  LifeSubpageHeader,
  Panel,
  PrivacyPill,
  SaveErrorState,
  StatusPill,
  TagList,
  Toast,
  compactText,
  formatDate,
  inputClass,
  localId,
  moodLabels,
  normalizeTags,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
  type ToastState,
} from "./components/life-workbench-primitives";

type JournalDraft = {
  title: string;
  mood: JournalMood;
  energyLabel: string;
  reflection: string;
  tags: string;
  private: boolean;
};

function createJournalEntry(draft: JournalDraft): JournalEntry {
  const now = new Date().toISOString();

  return {
    id: localId("journal"),
    title: draft.title.trim(),
    date: now,
    mood: draft.mood,
    energyLabel: draft.energyLabel.trim() || "Not labeled",
    summary: compactText(draft.reflection.trim(), 220),
    body: draft.reflection.trim(),
    reflectionPrompt:
      draft.reflection.trim().endsWith("?")
        ? draft.reflection.trim()
        : "Was soll beim naechsten Review offen bleiben?",
    tags: normalizeTags(draft.tags),
    privacy: draft.private ? "sensitive" : "private",
    createdAt: now,
    updatedAt: now,
  };
}

function JournalEntryDialog({
  initialPrompt,
  onClose,
  onSave,
}: Readonly<{
  initialPrompt?: string;
  onClose: () => void;
  onSave: (entry: JournalEntry) => void;
}>) {
  const [draft, setDraft] = useState<JournalDraft>({
    title: initialPrompt ? "Reflection: open prompt" : "",
    mood: "stable",
    energyLabel: "Stable, mentally full",
    reflection: initialPrompt ?? "",
    tags: "",
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

    onSave(createJournalEntry(draft));
  }

  return (
    <DialogFrame
      description="Private local draft only. No diagnosis, therapy flow or persistence runs."
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
            className={cn(inputClass, "min-h-32 resize-y py-3 leading-5")}
            onChange={(event) => update("reflection", event.target.value)}
            value={draft.reflection}
          />
        </label>
        <label>
          <FieldLabel optional>Tags</FieldLabel>
          <input
            className={inputClass}
            onChange={(event) => update("tags", event.target.value)}
            placeholder="open loops, evening"
            value={draft.tags}
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

function JournalEntryInspector({
  entry,
  onClose,
  onToast,
}: Readonly<{
  entry: JournalEntry;
  onClose: () => void;
  onToast: (toast: ToastState) => void;
}>) {
  return (
    <DialogFrame
      description="Full local preview for a private journal entry."
      onClose={onClose}
      title={entry.title}
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="purple">{moodLabels[entry.mood]}</StatusPill>
          <StatusPill tone="cyan" quiet>
            {entry.energyLabel}
          </StatusPill>
          <PrivacyPill privacy={entry.privacy} />
        </div>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {entry.body}
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="Date" value={formatDate(entry.date)} />
          <DetailRow label="Prompt" value={entry.reflectionPrompt} />
        </dl>
        <TagList tags={entry.tags} />
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
          <button
            className={secondaryButtonClass}
            onClick={() =>
              onToast({
                title: "Edit draft prepared",
                body: "Editing is represented locally in this MVP; no persistence runs.",
                tone: "info",
              })
            }
            type="button"
          >
            Edit draft
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

function mostCommonTag(entries: JournalEntry[]) {
  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    entry.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "none";
}

export function JournalPage({
  viewModel,
}: Readonly<{
  viewModel: JournalPageViewModel;
}>) {
  const [entries, setEntries] = useState(viewModel.entries);
  const [search, setSearch] = useState("");
  const [dialogPrompt, setDialogPrompt] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter(
      (entry) =>
        !query ||
        entry.title.toLowerCase().includes(query) ||
        entry.summary.toLowerCase().includes(query) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [entries, search]);

  const latestEntry = entries[0] ?? null;
  const currentPrompt = latestEntry?.reflectionPrompt ?? viewModel.prompts[0];

  function openNewEntry(prompt?: string) {
    setDialogPrompt(prompt);
    setDialogOpen(true);
  }

  function saveEntry(entry: JournalEntry) {
    try {
      setEntries((current) => [entry, ...current]);
      setSaveError(null);
      setDialogOpen(false);
      setToast({
        title: "Journal entry saved locally",
        body: "The entry was added to this browser session only.",
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
    <LifePageShell>
      <LifeSubpageHeader
        header={viewModel.header}
        primaryAction={
          <button className={primaryButtonClass} onClick={() => openNewEntry()} type="button">
            New journal entry
          </button>
        }
        secondaryActions={
          <>
            <button className={secondaryButtonClass} onClick={() => openNewEntry(currentPrompt)} type="button">
              Start reflection
            </button>
            <a className={secondaryButtonClass} href="#reflection-prompts">
              View prompts
            </a>
          </>
        }
      />

      <SaveErrorState message={saveError} />

      <Panel
        action={
          <button className={primaryButtonClass} onClick={() => openNewEntry(currentPrompt)} type="button">
            New journal entry
          </button>
        }
        className="border-[color-mix(in_srgb,var(--accent-purple)_24%,var(--border-subtle))]"
        subtitle="A writing entry point with the latest private context. This is not a diagnosis or therapy product."
        title="Writing Focus"
      >
        {latestEntry ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="purple">{moodLabels[latestEntry.mood]}</StatusPill>
                <StatusPill tone="cyan" quiet>
                  {latestEntry.energyLabel}
                </StatusPill>
                <PrivacyPill privacy={latestEntry.privacy} />
              </div>
              <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--text-primary)]">
                {currentPrompt}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Last entry: {latestEntry.title} / {formatDate(latestEntry.date)}
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Continue last entry
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                {latestEntry.summary}
              </p>
              <button
                className={quietButtonClass}
                onClick={() => setSelectedEntry(latestEntry)}
                type="button"
              >
                Open entry
              </button>
            </div>
          </div>
        ) : (
          <LifeEmptyState
            description="Start a private local journal entry. It will not be persisted in this MVP."
            title="Empty Journal"
          />
        )}
      </Panel>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <Panel
          action={<StatusPill tone="cyan" quiet>{filteredEntries.length} shown</StatusPill>}
          subtitle="Short previews only; open an entry for the full text."
          title="Recent Journal Entries"
        >
          <label>
            <FieldLabel>Search journal</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, summary or tags"
              type="search"
              value={search}
            />
          </label>
          <div className="mt-4 grid gap-3">
            {entries.length === 0 ? (
              <LifeEmptyState
                description="New local journal entries will appear here."
                title="Empty Journal"
              />
            ) : filteredEntries.length === 0 ? (
              <LifeEmptyState
                description="No entries match the current search."
                title="No search results"
              />
            ) : (
              filteredEntries.map((entry) => (
                <article
                  className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3"
                  key={entry.id}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {entry.title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                        {entry.summary}
                      </p>
                    </div>
                    <p className="shrink-0 text-[10px] text-[var(--text-muted)]">
                      {formatDate(entry.date)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusPill tone="purple">{moodLabels[entry.mood]}</StatusPill>
                    <StatusPill tone="cyan" quiet>
                      {entry.energyLabel}
                    </StatusPill>
                    <PrivacyPill privacy={entry.privacy} />
                  </div>
                  <div className="mt-3">
                    <TagList tags={entry.tags} />
                  </div>
                  <button
                    className={quietButtonClass}
                    onClick={() => setSelectedEntry(entry)}
                    type="button"
                  >
                    Open entry
                  </button>
                </article>
              ))
            )}
          </div>
        </Panel>

        <div className="grid gap-2">
          <Panel
            subtitle="Select a prompt to start the same local journal dialog."
            title="Reflection Prompts"
          >
            <div className="grid gap-2" id="reflection-prompts">
              {viewModel.prompts.map((prompt) => (
                <button
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-3 text-left text-xs leading-5 text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  key={prompt}
                  onClick={() => openNewEntry(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </Panel>

          <Panel subtitle="Text-only signals, not scores." title="Journal Pattern">
            <div className="grid gap-3">
              <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3">
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {entries.length}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  entries this week
                </p>
              </div>
              <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Most recent mood
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {latestEntry ? moodLabels[latestEntry.mood] : "none"}
                </p>
              </div>
              <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Common tag
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {mostCommonTag(entries)}
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {dialogOpen ? (
        <JournalEntryDialog
          initialPrompt={dialogPrompt}
          onClose={() => setDialogOpen(false)}
          onSave={saveEntry}
        />
      ) : null}

      {selectedEntry ? (
        <JournalEntryInspector
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onToast={setToast}
        />
      ) : null}

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </LifePageShell>
  );
}
