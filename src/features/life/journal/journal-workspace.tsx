"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { DashboardDialog } from "@/components/dashboard/sections/dashboard-dialog";
import { useToast } from "@/components/feedback/toast-provider";
import {
  saveJournalEntryAction,
  archiveJournalEntryAction,
} from "@/features/real-data/actions/journal.actions";
import type { JournalEntry } from "@/features/real-data/domain/life";
import {
  journalDate,
  journalHistory,
  journalHref,
  journalQuery,
  journalSummary,
  journalTitle,
  type JournalMode,
} from "./journal-model";
import "./journal.css";

function EntryBody({ entry }: { entry: JournalEntry }) {
  return <div className="journal-entry-body">{entry.body}</div>;
}
function EntryEditor({
  entry,
  today,
  onClose,
}: {
  entry?: JournalEntry;
  today: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try {
        const result = await saveJournalEntryAction(data);
        if (!result.ok) {
          setError(result.message);
          notify(result.message, "error");
          return;
        }
        notify(result.message);
        router.replace(`/life/journal?selected=${result.id}`, {
          scroll: false,
        });
        router.refresh();
      } catch {
        setError(
          "Speichern nicht möglich. Dein Text bleibt im Formular erhalten.",
        );
        notify("Speichern nicht möglich. Bitte versuche es erneut.", "error");
      }
    });
  }
  const title = entry ? "Eintrag bearbeiten" : "Neuer Eintrag";
  return (
    <DashboardDialog
      open
      labelledBy="journal-editor-title"
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <div className="journal-dialog-content">
        <div className="journal-dialog-header">
          <h2 id="journal-editor-title">{title}</h2>
          <button
            className="journal-button"
            disabled={pending}
            onClick={onClose}
          >
            Schließen
          </button>
        </div>
        <form aria-label={title} onSubmit={submit}>
          <fieldset disabled={pending} className="journal-fields">
            {entry ? (
              <input type="hidden" name="journalEntryId" value={entry.id} />
            ) : null}
            <label>
              Datum
              <input
                type="date"
                name="entryDate"
                defaultValue={entry?.entryDate ?? today}
                required
              />
            </label>
            <label>
              Titel (optional)
              <input
                autoFocus
                name="title"
                defaultValue={entry?.title ?? ""}
                maxLength={200}
              />
            </label>
            <label>
              Inhalt
              <textarea
                aria-label="Inhalt"
                name="body"
                defaultValue={entry?.body ?? ""}
                rows={9}
                required
                placeholder="Was möchtest du festhalten?"
              />
            </label>
            {error ? (
              <p role="alert" className="journal-error">
                {error}
              </p>
            ) : null}
            <div className="journal-actions">
              <button
                type="button"
                className="journal-button"
                onClick={onClose}
              >
                Abbrechen
              </button>
              <button className="journal-button journal-primary" type="submit">
                {pending ? "Speichert …" : "Speichern"}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </DashboardDialog>
  );
}
function ArchiveDialog({
  entry,
  onClose,
}: {
  entry: JournalEntry;
  onClose: () => void;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function archive() {
    const data = new FormData();
    data.set("journalEntryId", entry.id);
    startTransition(async () => {
      try {
        const result = await archiveJournalEntryAction(data);
        if (!result.ok) {
          setError(result.message);
          notify(result.message, "error");
          return;
        }
        notify(result.message);
        router.replace(`/life/journal?view=archived&selected=${entry.id}`, {
          scroll: false,
        });
        router.refresh();
      } catch {
        setError("Archivieren nicht möglich.");
        notify("Archivieren nicht möglich.", "error");
      }
    });
  }
  return (
    <DashboardDialog
      open
      labelledBy="journal-archive-title"
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <div className="journal-dialog-content">
        <h2 id="journal-archive-title">Eintrag archivieren?</h2>
        <p>„{journalTitle(entry)}“ bleibt im Archiv lesbar.</p>
        {error ? (
          <p role="alert" className="journal-error">
            {error}
          </p>
        ) : null}
        <div className="journal-actions">
          <button
            className="journal-button"
            disabled={pending}
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            className="journal-button"
            disabled={pending}
            onClick={archive}
          >
            {pending ? "Archiviert …" : "Archivieren"}
          </button>
        </div>
      </div>
    </DashboardDialog>
  );
}

export function JournalWorkspace({
  entries,
  today,
  mode,
}: {
  entries: JournalEntry[];
  today: string;
  mode: JournalMode;
}) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = workspaceRef.current;
    // Keep native dialogs modal until their URL transition commits (or a write finishes).
    const preventNativeClose = (event: Event) => event.preventDefault();
    node?.addEventListener("cancel", preventNativeClose, true);
    return () => node?.removeEventListener("cancel", preventNativeClose, true);
  }, []);
  const params = useSearchParams();
  const router = useRouter();
  const query = journalQuery(params);
  const history = journalHistory(entries, query, today);
  const selected = query.selected
    ? entries.find((entry) => entry.id === query.selected)
    : history[0];
  const summary = journalSummary(entries, today);
  const mutable = mode === "manual";
  const available = mode === "manual" || mode === "demo" || mode === "empty";
  const href = (patch: Record<string, string | null>) =>
    journalHref(params, patch);
  const close = () => router.replace(href({ panel: null }), { scroll: false });
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    router.push(
      href({
        q: String(data.get("q") ?? "").trim(),
        period: String(data.get("period") ?? "all"),
        view: String(data.get("view") ?? "active"),
        selected: null,
        panel: null,
      }),
      { scroll: false },
    );
  }
  const detailLink = selected
    ? href({ selected: selected.id, panel: "detail" })
    : "";
  return (
    <div
      id="journal-page"
      data-mode={mode}
      ref={workspaceRef}
    >
      <header className="journal-panel journal-header">
        <div>
          <p className="journal-eyebrow">Persönlich</p>
          <h1>Journal</h1>
          <p>Gedanken festhalten, reflektieren und im Verlauf wiederfinden.</p>
        </div>
        {mutable ? (
          <Link
            className="journal-button journal-primary"
            scroll={false}
            href={href({ panel: "new" })}
          >
            Neuer Eintrag
          </Link>
        ) : null}
      </header>
      {mode !== "manual" ? (
        <div
          className="journal-notice"
          role={mode === "error" ? "alert" : "status"}
        >
          {mode === "demo"
            ? "Demo · Beispiele zum Lesen, ohne Speicherung."
            : mode === "empty"
              ? "Leeres Profil · Zum Schreiben wechsle in das manuelle Profil."
              : mode === "auth-blocked"
                ? "Journal ist ohne aktive Anmeldung nicht verfügbar."
                : "Journal konnte nicht geladen werden. Bitte lade die Seite erneut."}
          {mode !== "error" ? (
            <Link href="/settings">Einstellungen öffnen</Link>
          ) : (
            <button className="journal-button" onClick={() => router.refresh()}>
              Erneut laden
            </button>
          )}
        </div>
      ) : null}
      <section
        className="journal-summary journal-panel"
        aria-label="Journal im Überblick"
      >
        <div>
          <span>Heute</span>
          <strong>{available ? summary.today : "—"}</strong>
          <small>Einträge · {journalDate(today)}</small>
        </div>
        <div>
          <span>Letzte 7 Tage</span>
          <strong>{available ? summary.week : "—"}</strong>
          <small>
            {available
              ? `${summary.days} ${summary.days === 1 ? "Tag" : "Tage"} mit Eintrag`
              : "Nicht verfügbar"}
          </small>
        </div>
        <div>
          <span>Dieser Monat</span>
          <strong>{available ? summary.month : "—"}</strong>
          <small>Einträge bis heute</small>
        </div>
      </section>
      <div
        className="journal-columns"
        data-empty={history.length === 0 && !selected ? "true" : undefined}
      >
        <section
          className="journal-panel journal-history"
          aria-label="Journal-Verlauf"
        >
          <div className="journal-section-header">
            <h2>Verlauf</h2>
            <span>
              {available
                ? `${history.length} ${history.length === 1 ? "Eintrag" : "Einträge"}`
                : "Nicht verfügbar"}
            </span>
          </div>
          {available ? (
            <form
              key={`${query.q}/${query.period}/${query.archived}`}
              aria-label="Journal durchsuchen und filtern"
              onSubmit={filter}
              className="journal-filters"
            >
              <label className="journal-search">
                Suche
                <input
                  name="q"
                  type="search"
                  defaultValue={query.q}
                  placeholder="Titel oder Inhalt"
                />
              </label>
              <label>
                Zeitraum
                <select name="period" defaultValue={query.period}>
                  <option value="all">Gesamter Verlauf</option>
                  <option value="today">Heute</option>
                  <option value="week">Letzte 7 Tage</option>
                  <option value="month">Dieser Monat</option>
                </select>
              </label>
              <label>
                Ansicht
                <select
                  name="view"
                  defaultValue={query.archived ? "archived" : "active"}
                >
                  <option value="active">Aktive Einträge</option>
                  <option value="archived">Archiv</option>
                </select>
              </label>
              <div className="journal-actions">
                <button className="journal-button" type="submit">
                  Anwenden
                </button>
                {query.q || query.period !== "all" || query.archived ? (
                  <Link
                    className="journal-button"
                    href="/life/journal"
                    scroll={false}
                  >
                    Zurücksetzen
                  </Link>
                ) : null}
              </div>
            </form>
          ) : null}
          <div className="journal-scroll" data-journal-list>
            {history.length ? (
              <ul>
                {history.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      className="journal-row"
                      href={href({ selected: entry.id, panel: null })}
                      scroll={false}
                      aria-current={
                        selected?.id === entry.id ? "true" : undefined
                      }
                      data-journal-entry={entry.id}
                    >
                      <time dateTime={entry.entryDate}>
                        {journalDate(entry.entryDate)}
                      </time>
                      <h3>{journalTitle(entry)}</h3>
                      <p>{entry.body}</p>
                      {entry.archivedAt ? <span>Archiviert</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="journal-empty">
                <h3>
                  {!available
                    ? "Einträge nicht verfügbar."
                    : query.q || query.period !== "all"
                      ? "Keine passenden Einträge."
                      : query.archived
                        ? "Noch keine archivierten Einträge."
                        : "Noch keine Journal-Einträge."}
                </h3>
                <p>
                  {!available
                    ? "Nach dem Laden erscheint hier dein Verlauf."
                    : query.q || query.period !== "all"
                      ? "Passe Suche oder Zeitraum an."
                      : "Neue Einträge erscheinen hier chronologisch."}
                </p>
                {mutable && !entries.length ? (
                  <Link
                    className="journal-button journal-primary"
                    href={href({ panel: "new" })}
                    scroll={false}
                  >
                    Neuer Eintrag
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </section>
        <section
          className="journal-panel journal-selection"
          aria-label="Ausgewählter Eintrag"
        >
          <div className="journal-section-header">
            <h2>Ausgewählter Eintrag</h2>
            {selected?.archivedAt ? <span>Archiviert</span> : null}
          </div>
          {selected ? (
            <>
              <div className="journal-selected-heading">
                <time dateTime={selected.entryDate}>
                  {journalDate(selected.entryDate)}
                </time>
                <h3>{journalTitle(selected)}</h3>
              </div>
              <div className="journal-scroll">
                <EntryBody entry={selected} />
              </div>
              <div className="journal-selection-actions">
                <Link
                  className="journal-button"
                  href={detailLink}
                  scroll={false}
                >
                  Details öffnen
                </Link>
                {mutable && !selected.archivedAt ? (
                  <>
                    <Link
                      className="journal-button"
                      href={href({ selected: selected.id, panel: "edit" })}
                      scroll={false}
                    >
                      Bearbeiten
                    </Link>
                    <Link
                      className="journal-button"
                      href={href({ selected: selected.id, panel: "archive" })}
                      scroll={false}
                    >
                      Archivieren
                    </Link>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <div className="journal-empty">
              <h3>
                {query.selected
                  ? "Eintrag nicht verfügbar."
                  : "Raum für deine Gedanken"}
              </h3>
              <p>
                {query.selected
                  ? "Der Eintrag ist nicht zugänglich. Wähle einen Eintrag aus dem Verlauf."
                  : "Wähle einen Eintrag aus dem Verlauf, um ihn hier zu lesen."}
              </p>
            </div>
          )}
        </section>
      </div>
      {mutable &&
      (query.panel === "new" ||
        (query.panel === "edit" && selected && !selected.archivedAt)) ? (
        <EntryEditor
          key={query.panel === "new" ? "new" : selected?.id}
          entry={query.panel === "edit" ? selected : undefined}
          today={today}
          onClose={close}
        />
      ) : null}
      {query.panel === "detail" && selected ? (
        <DashboardDialog open labelledBy="journal-detail-title" onClose={close}>
          <div className="journal-dialog-content">
            <div className="journal-dialog-header">
              <h2 id="journal-detail-title">{journalTitle(selected)}</h2>
              <button className="journal-button" onClick={close}>
                Schließen
              </button>
            </div>
            <p>
              {journalDate(selected.entryDate)}
              {selected.archivedAt ? " · Archiviert" : ""}
            </p>
            <EntryBody entry={selected} />
            {mutable && !selected.archivedAt ? (
              <Link
                className="journal-button"
                href={href({ panel: "edit", selected: selected.id })}
                scroll={false}
              >
                Bearbeiten
              </Link>
            ) : null}
          </div>
        </DashboardDialog>
      ) : null}
      {mutable &&
      query.panel === "archive" &&
      selected &&
      !selected.archivedAt ? (
        <ArchiveDialog entry={selected} onClose={close} />
      ) : null}
    </div>
  );
}
