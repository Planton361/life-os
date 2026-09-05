"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { InboxViewModel } from "@/features/inbox";
import { useToast } from "@/components/feedback/toast-provider";
import { suggestInboxRouteAction } from "@/features/real-data/actions/inbox-ai.actions";
import {
  routeSavedInboxItemAction,
  saveInboxClarificationAction,
  type InboxWorkspaceResult,
} from "@/features/real-data/actions/inbox-workspace.actions";
import type {
  InboxClarificationInput,
  InboxRouteInput,
} from "@/features/real-data/schemas/inbox-workspace.schemas";
import { cn } from "@/lib/cn";

const panel =
  "min-w-0 rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)]";
const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";
const button = `min-h-9 rounded-[12px] border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
const input = `w-full min-w-0 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)] ${focus}`;
const routes: { id: InboxRouteInput["route"]; title: string }[] = [
  { id: "task", title: "Standalone Task" },
  { id: "existing_project", title: "Existing Project" },
  { id: "existing_goal", title: "Existing Goal" },
  { id: "existing_skill", title: "Existing Skill" },
  { id: "project", title: "New Project" },
  { id: "goal", title: "New Goal" },
  { id: "resource", title: "Resource" },
  { id: "note", title: "Note" },
  { id: "archive", title: "Solved / Archive" },
];
function initialFields(
  item: InboxViewModel["activeItem"],
): InboxClarificationInput {
  return {
    inboxItemId: item.id ?? "",
    expectedUpdatedAt: item.clarification?.updatedAt ?? "",
    title: item.fields[0]?.value ?? "",
    body: item.fields[1]?.value ?? "",
    nextAction: item.clarification?.nextAction ?? "",
    missingInfo: item.clarification?.missingInfo ?? "",
    priority: (item.priority ?? "P2") as InboxClarificationInput["priority"],
    energy: item.clarification?.energy ?? null,
    durationMinutes: item.clarification?.durationMinutes ?? null,
    areaId: item.persistedAreaId ?? null,
    reviewNeeded: item.clarification?.reviewNeeded ?? false,
    todayCandidate: item.clarification?.todayCandidate ?? false,
    deadlineHint: item.clarification?.deadlineHint ?? null,
  };
}

function InboxEditor({
  viewModel,
  onDirty,
  onComplete,
}: {
  viewModel: InboxViewModel;
  onDirty: (dirty: boolean) => void;
  onComplete: (result: InboxWorkspaceResult) => void;
}) {
  const item = viewModel.activeItem;
  const [fields, setFields] = useState(() => initialFields(item));
  const [saved, setSaved] = useState(fields);
  const dirty = JSON.stringify(fields) !== JSON.stringify(saved);
  const [route, setRoute] = useState<InboxRouteInput["route"] | "">("");
  const [targetId, setTargetId] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const { notify } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const enabled =
    viewModel.profileId === "manual" &&
    viewModel.quickCapture.enabled &&
    Boolean(item.id);
  useEffect(() => {
    onDirty(dirty || pending);
    return () => onDirty(false);
  }, [dirty, pending, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    // Guard all same-tab navigation, including sidebar links, while edits are unsaved.
    const guard = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a[href]");
      if (
        link &&
        !event.ctrlKey &&
        !event.metaKey &&
        !window.confirm("Ungespeicherte Änderungen verwerfen und wechseln?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", prevent);
      document.removeEventListener("click", guard, true);
    };
  }, [dirty]);
  function change<K extends keyof InboxClarificationInput>(
    key: K,
    value: InboxClarificationInput[K],
  ) {
    setFields((current) => ({ ...current, [key]: value }));
  }
  const targets =
    route === "existing_project"
      ? viewModel.existingTargets.projects
      : route === "existing_goal"
        ? viewModel.existingTargets.goals
        : route === "existing_skill"
          ? viewModel.existingTargets.skills
          : [];
  async function save() {
    if (!formRef.current?.reportValidity()) return;
    startTransition(async () => {
      const result = await saveInboxClarificationAction(fields);
      notify(result.message, result.status === "success" ? "success" : "error");
      setError(result.status === "success" ? "" : result.message);
      if (result.status === "success" && result.updatedAt) {
        const next = { ...fields, expectedUpdatedAt: result.updatedAt };
        setFields(next);
        setSaved(next);
        onDirty(false);
      }
    });
  }
  function complete() {
    if (!route || dirty) return;
    startTransition(async () => {
      const result = await routeSavedInboxItemAction({
        inboxItemId: fields.inboxItemId,
        expectedUpdatedAt: fields.expectedUpdatedAt,
        route,
        targetId: targetId || null,
      });
      notify(result.message, result.status === "success" ? "success" : "error");
      setError(result.status === "success" ? "" : result.message);
      if (result.status === "success") onComplete(result);
    });
  }
  return (
    <>
      <section
        aria-labelledby="active-item-title"
        className={cn(panel, "flex max-h-full min-h-0 flex-col self-start")}
        data-inbox-section="active-item"
      >
        <header className="border-b border-[var(--border-subtle)] p-4">
          <p className="text-[10px] font-semibold uppercase text-[var(--accent-orange)]">
            Active Item
          </p>
          <h2
            id="active-item-title"
            className="mt-1 truncate text-lg font-semibold"
          >
            {item.title}
          </h2>
        </header>
        <div
          className="min-h-0 space-y-4 overflow-y-auto p-4"
          data-inbox-section="active-item-body"
        >
          <details className="rounded-[12px] border border-[var(--border-subtle)] p-3">
            <summary
              className={cn(
                "cursor-pointer text-xs text-[var(--text-muted)]",
                focus,
              )}
            >
              Original Capture
            </summary>
            <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-[var(--accent-blue)] pl-3 text-sm">
              {item.originalCapture}
            </blockquote>
          </details>
          {!enabled && (
            <p role="status" className="text-sm text-[var(--text-muted)]">
              {viewModel.profileId === "demo"
                ? "Demo-Referenz · keine Speicherung."
                : "Speichern erfordert eine angemeldete Manual-Session."}
            </p>
          )}
          <form
            aria-label="Active Item bearbeiten"
            ref={formRef}
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <fieldset
              disabled={!enabled || pending}
              className="space-y-3 disabled:opacity-70"
            >
              <label className="block text-xs text-[var(--text-secondary)]">
                Clean Title
                <input
                  className={cn(input, "mt-1")}
                  value={fields.title}
                  onChange={(event) => change("title", event.target.value)}
                  minLength={2}
                  maxLength={500}
                  required
                />
              </label>
              <label className="block text-xs text-[var(--text-secondary)]">
                Description / Context
                <textarea
                  className={cn(input, "mt-1 resize-y")}
                  rows={4}
                  value={fields.body ?? ""}
                  maxLength={20000}
                  onChange={(event) => change("body", event.target.value)}
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs text-[var(--text-secondary)]">
                  Next Action
                  <textarea
                    className={cn(input, "mt-1 resize-y")}
                    rows={3}
                    maxLength={20000}
                    value={fields.nextAction ?? ""}
                    onChange={(event) =>
                      change("nextAction", event.target.value)
                    }
                  />
                </label>
                <label className="text-xs text-[var(--text-secondary)]">
                  Missing Info
                  <textarea
                    className={cn(input, "mt-1 resize-y")}
                    rows={3}
                    maxLength={20000}
                    value={fields.missingInfo ?? ""}
                    onChange={(event) =>
                      change("missingInfo", event.target.value)
                    }
                  />
                </label>
              </div>
              <section
                aria-labelledby="planning-signals-title"
                className="border-t border-[var(--border-subtle)] pt-3"
              >
                <h3
                  id="planning-signals-title"
                  className="mb-3 text-sm font-semibold"
                >
                  Planning Signals
                </h3>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <label className="text-xs">
                    Priority
                    <select
                      className={cn(input, "mt-1")}
                      aria-label="Priority"
                      value={fields.priority}
                      onChange={(e) =>
                        change(
                          "priority",
                          e.target.value as InboxClarificationInput["priority"],
                        )
                      }
                    >
                      {["none", "P0", "P1", "P2", "P3"].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    Energy
                    <select
                      className={cn(input, "mt-1")}
                      aria-label="Energy"
                      value={fields.energy ?? ""}
                      onChange={(e) =>
                        change(
                          "energy",
                          (e.target.value ||
                            null) as InboxClarificationInput["energy"],
                        )
                      }
                    >
                      <option value="">Keine Angabe</option>
                      {["low", "medium", "high"].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    Effort / Duration (min)
                    <input
                      className={cn(input, "mt-1")}
                      type="number"
                      min={1}
                      max={10080}
                      value={fields.durationMinutes ?? ""}
                      onChange={(e) =>
                        change(
                          "durationMinutes",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    />
                  </label>
                  <label className="text-xs">
                    Area
                    <select
                      className={cn(input, "mt-1")}
                      aria-label="Area"
                      value={fields.areaId ?? ""}
                      onChange={(e) => change("areaId", e.target.value || null)}
                    >
                      <option value="">Keine Area</option>
                      {(viewModel.areas ?? []).map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="col-span-2 text-xs">
                    Deadline hint
                    <input
                      className={cn(input, "mt-1")}
                      type="date"
                      value={fields.deadlineHint ?? ""}
                      onChange={(e) =>
                        change("deadlineHint", e.target.value || null)
                      }
                    />
                  </label>
                  <label className="flex min-h-9 items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={fields.reviewNeeded}
                      onChange={(e) => change("reviewNeeded", e.target.checked)}
                    />
                    Review needed
                  </label>
                  <label className="flex min-h-9 items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={fields.todayCandidate}
                      onChange={(e) =>
                        change("todayCandidate", e.target.checked)
                      }
                    />
                    Today candidate
                  </label>
                </div>
              </section>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  className={cn(
                    button,
                    "border-[var(--accent-cyan)] bg-[color-mix(in_srgb,var(--accent-cyan)_12%,transparent)]",
                  )}
                  type="submit"
                  disabled={!dirty || pending}
                >
                  {pending ? "Speichert …" : "Save"}
                </button>
                <span className="text-xs text-[var(--text-muted)]">
                  {dirty
                    ? "Ungespeicherte Änderungen · vor Wechsel oder Routing speichern."
                    : "Felder und Signale werden gemeinsam gespeichert."}
                </span>
              </div>
            </fieldset>
          </form>
          {error && (
            <p role="alert" className="text-sm text-[var(--accent-red)]">
              {error}
            </p>
          )}
          {enabled && (
            <section
              aria-labelledby="outcome-route-title"
              className="border-t border-[var(--border-subtle)] pt-3"
            >
              <h3 id="outcome-route-title" className="text-sm font-semibold">
                Outcome Route
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Wo gehört dieser Gedanke hin?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {routes
                  .filter(
                    (option) =>
                      option.id !== "existing_skill" ||
                      viewModel.existingTargets.skills.length > 0,
                  )
                  .map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={cn(
                        button,
                        route === option.id &&
                          "border-[var(--accent-cyan)] bg-[color-mix(in_srgb,var(--accent-cyan)_12%,transparent)]",
                      )}
                      aria-pressed={route === option.id}
                      disabled={pending}
                      onClick={() => {
                        setRoute(option.id);
                        setTargetId("");
                      }}
                    >
                      {option.title}
                    </button>
                  ))}
              </div>
              {route.startsWith("existing_") && (
                <label className="mt-3 block text-xs">
                  Bestehendes Ziel
                  <select
                    className={cn(input, "mt-1")}
                    aria-label="Bestehendes Ziel"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    disabled={pending}
                  >
                    <option value="">Ziel auswählen</option>
                    {targets.map((target) => (
                      <option value={target.id} key={target.id}>
                        {target.title}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[var(--text-muted)]">
                    {targets.length
                      ? "Erstellt einen Task mit diesem Kontext. Detailarbeit folgt am Ziel."
                      : "Keine aktiven Ziele vorhanden."}
                  </span>
                </label>
              )}
              {route && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    className={cn(button, "border-[var(--accent-green)]")}
                    type="button"
                    disabled={
                      dirty ||
                      pending ||
                      (route.startsWith("existing_") && !targetId)
                    }
                    onClick={complete}
                  >
                    Route bestätigen
                  </button>
                  <p className="text-xs text-[var(--text-muted)]">
                    {route === "archive"
                      ? "Abschließen ohne neues Ziel. Original Capture bleibt erhalten."
                      : route === "task" || route.startsWith("existing_")
                        ? "Task: Kontext, Priority, Energy, Dauer, Area, Today und Deadline."
                        : route === "project"
                          ? "Project: Kontext, Next Step, Priority, Area und Zieldatum."
                          : route === "goal"
                            ? "Goal: Kontext, Area und Zieldatum."
                            : "Resource: Kontext, Area und Review needed."}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </section>
      <aside
        className="min-h-0 space-y-3 overflow-y-auto"
        aria-label="Sekundärer Inbox Kontext"
      >
        <LocalAssistant itemId={item.id} enabled={enabled} />
        <section
          className={cn(panel, "p-4")}
          aria-labelledby="related-context-title"
        >
          <h2 id="related-context-title" className="text-sm font-semibold">
            Related Context
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Vorhandene lokale Ziele
          </p>
          <ul className="mt-3 space-y-2">
            {[
              ...viewModel.existingTargets.projects,
              ...viewModel.existingTargets.goals,
              ...viewModel.existingTargets.skills,
              ...viewModel.existingTargets.resources,
            ]
              .slice(0, 5)
              .map((target) => (
                <li key={target.id}>
                  {target.href ? (
                    <Link
                      className={cn(
                        "block rounded-lg p-2 text-sm hover:bg-[var(--surface-2)]",
                        focus,
                      )}
                      href={target.href}
                    >
                      <span className="block text-[10px] text-[var(--text-muted)]">
                        {target.type}
                      </span>
                      {target.title}
                    </Link>
                  ) : (
                    <span className="text-sm">{target.title}</span>
                  )}
                </li>
              ))}
          </ul>
          {!Object.values(viewModel.existingTargets).some(
            (targets) => targets.length,
          ) && (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Kein lokaler Kontext vorhanden.
            </p>
          )}
        </section>
      </aside>
    </>
  );
}
function LocalAssistant({
  itemId,
  enabled,
}: {
  itemId?: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    suggestInboxRouteAction,
    null,
  );
  const [dismissed, setDismissed] = useState<typeof state>(null);
  return (
    <section className={cn(panel, "p-4")} aria-labelledby="ai-assistant-title">
      <h2 id="ai-assistant-title" className="text-sm font-semibold">
        AI Assistant
      </h2>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        Optionaler lokaler Vorschlag aus gespeicherten Daten. Keine automatische
        Übernahme.
      </p>
      {enabled && (
        <form action={action} className="mt-3">
          <input type="hidden" name="inboxItemId" value={itemId} />
          <button className={button} disabled={pending}>
            {pending ? "Prüft …" : "Lokalen Vorschlag anzeigen"}
          </button>
        </form>
      )}
      {state && state !== dismissed && (
        <div className="mt-3 space-y-2 text-sm" role="status">
          {state.suggestion ? (
            <>
              <p>
                {
                  {
                    standalone_task: "Standalone Task",
                    add_to_existing: "Existing Project / Goal",
                    create_new: "New Project / Goal",
                    resource: "Resource",
                    solved_archive: "Solved / Archive",
                  }[state.suggestion.route]
                }
              </p>
              <p className="text-[var(--text-secondary)]">
                {state.suggestion.reason}
              </p>
              {state.suggestion.taskDraft && (
                <p className="text-xs text-[var(--text-muted)]">
                  Vorschlag: {state.suggestion.taskDraft.priority} ·{" "}
                  {state.suggestion.taskDraft.energy} ·{" "}
                  {state.suggestion.taskDraft.durationMinutes} min
                </p>
              )}
            </>
          ) : (
            <p>{state.message}</p>
          )}
          <button
            className={button}
            type="button"
            onClick={() => setDismissed(state)}
          >
            Vorschlag schließen
          </button>
        </div>
      )}
    </section>
  );
}
export function InboxPage({
  viewModel,
}: Readonly<{ viewModel: InboxViewModel }>) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState(
    ["raw", "clarify"].includes(params.get("stage") ?? "")
      ? params.get("stage")!
      : "all",
  );
  const [dirty, setDirty] = useState(false);
  const [completed, setCompleted] = useState<InboxWorkspaceResult | null>(null);
  const items = viewModel.queue.filter(
    (item) =>
      (filter === "all" || item.stage === filter) &&
      `${item.title} ${item.note}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const activeId = viewModel.activeItem.id;
  const selectedVisible = items.some((item) => item.id === activeId);
  useEffect(() => {
    if (dirty || window.location.pathname !== "/inbox") return;
    const nextId = selectedVisible ? activeId : items[0]?.id;
    const next = new URLSearchParams();
    if (nextId) next.set("item", nextId);
    if (query) next.set("q", query);
    if (filter !== "all") next.set("stage", filter);
    const href = `/inbox${next.size ? `?${next}` : ""}`;
    if (window.location.pathname + window.location.search !== href) {
      if (nextId && nextId !== activeId)
        router.replace(href, { scroll: false });
      else window.history.replaceState(null, "", href);
    }
  }, [activeId, dirty, filter, items, query, router, selectedVisible]);
  return (
    <div
      id="inbox-page"
      data-profile-id={viewModel.profileId}
      className="mx-auto flex w-full max-w-[2400px] flex-col gap-3 pb-5 2xl:h-[calc(100dvh-32px)] 2xl:min-h-0 2xl:pb-0"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--accent-orange)]">
            Clarify · Route
          </p>
          <h1 className="text-2xl font-semibold">Inbox</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Gedanken bereinigen, zuordnen und weitergehen.
          </p>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {viewModel.queue.length} offen
        </p>
      </header>
      {completed && (
        <div
          className="flex flex-wrap items-center gap-3 text-sm"
          aria-label="Letztes Routing"
        >
          <span>{completed.message}</span>
          {completed.href && (
            <Link
              className={cn(button, "inline-flex items-center")}
              href={completed.href}
            >
              Ziel öffnen
            </Link>
          )}
          <button className={button} onClick={() => setCompleted(null)}>
            Schließen
          </button>
        </div>
      )}
      <div className="grid min-h-0 flex-1 gap-3 2xl:grid-cols-[minmax(260px,.75fr)_minmax(620px,1.8fr)_minmax(270px,.7fr)]">
        <section
          className={cn(panel, "flex min-h-0 flex-col")}
          aria-labelledby="inbox-queue-title"
          data-inbox-section="queue"
        >
          <div className="space-y-3 border-b border-[var(--border-subtle)] p-4">
            <h2 id="inbox-queue-title" className="text-sm font-semibold">
              Inbox Queue
            </h2>
            <label className="block text-xs">
              Search
              <input
                className={cn(input, "mt-1")}
                type="search"
                value={query}
                disabled={dirty}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Titel oder Kontext suchen"
              />
            </label>
            {query && (
              <button
                className={button}
                disabled={dirty}
                onClick={() => setQuery("")}
              >
                Suche leeren
              </button>
            )}
            <div className="flex flex-wrap gap-2" aria-label="Queue filters">
              {[
                { id: "all", title: "Open" },
                { id: "raw", title: "Raw" },
                { id: "clarify", title: "Clarified" },
              ].map((stage) => (
                <button
                  className={cn(
                    button,
                    filter === stage.id && "border-[var(--accent-cyan)]",
                  )}
                  aria-pressed={filter === stage.id}
                  disabled={dirty}
                  key={stage.id}
                  onClick={() => setFilter(stage.id)}
                >
                  {stage.title}
                </button>
              ))}
            </div>
          </div>
          {!items.length && (
            <p className="p-4 text-sm text-[var(--text-muted)]">
              {viewModel.queue.length
                ? "Keine passenden Einträge."
                : "Inbox ist leer. Alle Gedanken sind zugeordnet."}
            </p>
          )}
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  className={cn(
                    "w-full rounded-[14px] border p-3 text-left disabled:cursor-not-allowed",
                    focus,
                    item.id === activeId
                      ? "border-[var(--accent-orange)] bg-[color-mix(in_srgb,var(--accent-orange)_8%,transparent)]"
                      : "border-[var(--border-subtle)] hover:bg-[var(--surface-2)]",
                  )}
                  disabled={dirty}
                  aria-current={item.id === activeId ? "true" : undefined}
                  onClick={() => {
                    const next = new URLSearchParams();
                    next.set("item", item.id);
                    if (query) next.set("q", query);
                    if (filter !== "all") next.set("stage", filter);
                    router.push(`/inbox?${next}`, { scroll: false });
                  }}
                >
                  <span className="block break-words text-sm font-semibold">
                    {item.title}
                  </span>
                  <span className="mt-1 block line-clamp-2 break-words text-xs text-[var(--text-muted)]">
                    {item.note}
                  </span>
                  <span className="mt-2 block text-[10px] text-[var(--text-secondary)]">
                    {item.stage === "raw" ? "Raw" : "Clarified"} · {item.type}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {selectedVisible && viewModel.activeItem.hasSelection ? (
          <InboxEditor
            key={activeId ?? viewModel.activeItem.title}
            viewModel={viewModel}
            onDirty={setDirty}
            onComplete={(result) => {
              setCompleted(result);
              router.refresh();
            }}
          />
        ) : (
          <section
            className={cn(panel, "p-5 2xl:col-span-2")}
            aria-label="Active Item leer"
          >
            <h2 className="text-lg font-semibold">
              {items.length ? "Eintrag auswählen" : "Kein offener Eintrag"}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {items.length
                ? "Wähle links einen Gedanken zur Triage."
                : "Neue Gedanken kommen über Quick Thought oder bestehende Capture-Flows hier an."}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
