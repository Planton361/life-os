import Link from "next/link";
import {
  archiveJournalEntryFormAction,
  archiveLifeNoteFormAction,
  createJournalEntryFormAction,
  createLifeNoteFormAction,
  restoreLifeNoteFormAction,
  updateJournalEntryFormAction,
  updateLifeNoteFormAction,
} from "@/features/real-data/actions/life.actions";
import type { EntertainmentWorkspace, InventoryWorkspace, JournalEntry, LifeNote, LifeWorkspace } from "@/features/real-data/domain/life";
import { cn } from "@/lib/cn";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "./components/life-workbench-primitives";

const panel = "rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] p-4";
const label = "text-[11px] font-semibold text-[var(--text-secondary)]";

function navigation(active: "life" | "journal" | "notes") {
  return (
    <nav aria-label="Life context" className="flex flex-wrap gap-2">
      {[["life", "/life", "Life"], ["journal", "/life/journal", "Journal"], ["notes", "/life/notes", "Notes"]].map(([id, href, text]) => (
        <Link className={cn(secondaryButtonClass, id === active && "border-[rgba(155,124,246,.5)] text-[var(--text-primary)]")} href={href} key={id}>{text}</Link>
      ))}
    </nav>
  );
}

function header(active: "life" | "journal" | "notes", title: string, summary: string) {
  return (
    <header className={panel}>
      <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--accent-purple)]">Life / Personal context</p>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-2xl font-semibold text-[var(--text-primary)]">{title}</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{summary}</p></div>
        {navigation(active)}
      </div>
    </header>
  );
}

function feedback(state?: string) {
  if (!state) return null;
  const error = state === "error" || state === "invalid" || state === "auth_blocked";
  const messages: Record<string, string> = {
    archived: "Inhalt archiviert und in der Historie erhalten.", auth_blocked: "Manual-Daten sind ohne aktive Anmeldung nicht verfügbar.", created: "Gespeichert. Der Inhalt wird serverseitig aus der kanonischen Quelle gelesen.", error: "Die Änderung konnte nicht gespeichert werden.", invalid: "Bitte prüfe die Pflichtfelder.", restored: "Note wiederhergestellt.", updated: "Änderungen gespeichert.",
  };
  return <p role={error ? "alert" : "status"} className={cn(panel, "text-sm", error ? "border-[rgba(221,107,95,.35)] text-[var(--accent-red)]" : "border-[rgba(66,184,131,.3)] text-[var(--accent-green)]")}>{messages[state] ?? state}</p>;
}

function Empty({ children }: Readonly<{ children: string }>) {
  return <p className="rounded-[12px] border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-muted)]">{children}</p>;
}

function JournalCard({ entry }: Readonly<{ entry: JournalEntry }>) {
  return (
    <article className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[10px] text-[var(--text-muted)]">{entry.entryDate}</p><h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{entry.title ?? "Untitled entry"}</h3></div><span className="text-[10px] text-[var(--text-muted)]">{entry.archivedAt ? "Archived" : "Active"}</span></div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{entry.body}</p>
      {!entry.archivedAt ? <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-[var(--accent-purple)]">Edit entry</summary><form action={updateJournalEntryFormAction} className="mt-3 grid gap-3"><input name="journalEntryId" type="hidden" value={entry.id}/><label className={label}>Date<input className={inputClass} defaultValue={entry.entryDate} name="entryDate" required type="date"/></label><label className={label}>Title (optional)<input className={inputClass} defaultValue={entry.title ?? ""} maxLength={200} name="title"/></label><label className={label}>Journal text<textarea className={cn(inputClass, "min-h-28 py-3")} defaultValue={entry.body} name="body" required/></label><div className="flex flex-wrap gap-2"><button className={primaryButtonClass} type="submit">Save changes</button><button className={secondaryButtonClass} formAction={archiveJournalEntryFormAction} type="submit">Archive</button></div></form></details> : null}
    </article>
  );
}

function NoteCard({ note }: Readonly<{ note: LifeNote }>) {
  return (
    <article className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-semibold text-[var(--text-primary)]">{note.title}</h3><span className="text-[10px] text-[var(--text-muted)]">{note.archivedAt ? "Archived" : "Active"}</span></div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{note.body}</p>
      {note.relations.length ? <div className="mt-3 flex flex-wrap gap-2" aria-label="Canonical relations">{note.relations.map((relation) => <Link className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" href={relation.href} key={relation.id}>{relation.targetType}: {relation.label}</Link>)}</div> : <p className="mt-3 text-xs text-[var(--text-muted)]">No Project, Goal or Task relations.</p>}
      {!note.archivedAt ? <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-[var(--accent-cyan)]">Edit note</summary><form action={updateLifeNoteFormAction} className="mt-3 grid gap-3"><input name="resourceId" type="hidden" value={note.id}/><label className={label}>Title<input className={inputClass} defaultValue={note.title} name="title" required/></label><label className={label}>Content<textarea className={cn(inputClass, "min-h-28 py-3")} defaultValue={note.body} name="body" required/></label><div className="flex flex-wrap gap-2"><button className={primaryButtonClass} type="submit">Save changes</button><button className={secondaryButtonClass} formAction={archiveLifeNoteFormAction} type="submit">Archive</button></div></form></details> : <form action={restoreLifeNoteFormAction} className="mt-3"><input name="resourceId" type="hidden" value={note.id}/><button className={secondaryButtonClass} type="submit">Restore note</button></form>}
    </article>
  );
}

export function LifeManualOverview({ entertainmentWorkspace, inventoryWorkspace, workspace }: Readonly<{ entertainmentWorkspace: EntertainmentWorkspace | null; inventoryWorkspace: InventoryWorkspace | null; workspace: LifeWorkspace | null }>) {
  const activeJournal = workspace?.journalEntries.filter((item) => !item.archivedAt).length ?? 0;
  const activeNotes = workspace?.notes.filter((item) => !item.archivedAt).length ?? 0;
  const activeEntertainment = entertainmentWorkspace?.items.filter((item) => !item.archivedAt).length ?? 0;
  const activeInventory = inventoryWorkspace?.inventoryItems.filter((item) => !item.archivedAt).length ?? 0;
  const activeWishlist = inventoryWorkspace?.wishlistItems.filter((item) => !item.archivedAt).length ?? 0;
  return <main className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6">{header("life", "Life Overview", "Private context for journal, canonical notes, entertainment, inventory and deliberate purchase decisions.")}{!workspace ? feedback("auth_blocked") : <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4"><Link className={panel} href="/life/journal"><p className="text-xs font-semibold text-[var(--accent-purple)]">Journal</p><p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{activeJournal}</p><p className="text-xs text-[var(--text-muted)]">active entries · {workspace.journalEntries.length - activeJournal} archived</p></Link><Link className={panel} href="/life/notes"><p className="text-xs font-semibold text-[var(--accent-cyan)]">Notes</p><p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{activeNotes}</p><p className="text-xs text-[var(--text-muted)]">active notes · {workspace.notes.length - activeNotes} archived</p></Link><Link className={panel} href="/life/entertainment"><p className="text-xs font-semibold text-[var(--accent-purple)]">Entertainment</p><p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{activeEntertainment}</p><p className="text-xs text-[var(--text-muted)]">active items · {(entertainmentWorkspace?.items.length ?? 0) - activeEntertainment} archived</p></Link><Link className={panel} href="/life/inventory"><p className="text-xs font-semibold text-[var(--accent-cyan)]">Inventory & Wishlist</p><p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{activeInventory}</p><p className="text-xs text-[var(--text-muted)]">owned · {activeWishlist} wishlist</p></Link></div>}</main>;
}

export function JournalManualWorkspace({ state, workspace }: Readonly<{ state?: string; workspace: LifeWorkspace | null }>) {
  const active = workspace?.journalEntries.filter((entry) => !entry.archivedAt) ?? [];
  const archived = workspace?.journalEntries.filter((entry) => entry.archivedAt) ?? [];
  const today = new Date().toISOString().slice(0, 10);
  return <main className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6">{header("journal", "Journal", "Private dated writing. Mood, health and daily or weekly reviews remain separate canonical data.")}{feedback(state)}{workspace ? <div className="grid min-h-0 gap-2 xl:grid-cols-[minmax(320px,.7fr)_minmax(0,1.3fr)]"><section className={panel}><h2 className="text-base font-semibold text-[var(--text-primary)]">New journal entry</h2><form action={createJournalEntryFormAction} className="mt-4 grid gap-3"><label className={label}>Date<input className={inputClass} defaultValue={today} name="entryDate" required type="date"/></label><label className={label}>Title (optional)<input className={inputClass} maxLength={200} name="title"/></label><label className={label}>Journal text<textarea className={cn(inputClass, "min-h-40 py-3")} name="body" required/></label><button className={primaryButtonClass} type="submit">Save entry</button></form></section><div className="grid min-h-0 gap-2"><section className={panel}><h2 className="text-base font-semibold text-[var(--text-primary)]">Active entries</h2><div className="mt-3 grid max-h-[420px] gap-3 overflow-y-auto pr-1">{active.length ? active.map((entry) => <JournalCard entry={entry} key={entry.id}/>) : <Empty>No active journal entries yet.</Empty>}</div></section><section className={panel}><h2 className="text-base font-semibold text-[var(--text-primary)]">Journal history</h2><div className="mt-3 grid max-h-[300px] gap-3 overflow-y-auto pr-1">{archived.length ? archived.map((entry) => <JournalCard entry={entry} key={entry.id}/>) : <Empty>No archived journal entries.</Empty>}</div></section></div></div> : feedback("auth_blocked")}</main>;
}

export function NotesManualWorkspace({ state, workspace }: Readonly<{ state?: string; workspace: LifeWorkspace | null }>) {
  const active = workspace?.notes.filter((note) => !note.archivedAt) ?? [];
  const archived = workspace?.notes.filter((note) => note.archivedAt) ?? [];
  return <main className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6">{header("notes", "Notes", "Personal notes stored as canonical Resources in the Life area. Existing Project, Goal and Task relations remain visible.")}{feedback(state)}{workspace ? <div className="grid min-h-0 gap-2 xl:grid-cols-[minmax(320px,.7fr)_minmax(0,1.3fr)]"><section className={panel}><h2 className="text-base font-semibold text-[var(--text-primary)]">New note</h2><form action={createLifeNoteFormAction} className="mt-4 grid gap-3"><label className={label}>Title<input className={inputClass} name="title" required/></label><label className={label}>Content<textarea className={cn(inputClass, "min-h-40 py-3")} name="body" required/></label><button className={primaryButtonClass} type="submit">Save note</button></form></section><div className="grid min-h-0 gap-2"><section className={panel}><h2 className="text-base font-semibold text-[var(--text-primary)]">Active notes</h2><div className="mt-3 grid max-h-[420px] gap-3 overflow-y-auto pr-1">{active.length ? active.map((note) => <NoteCard key={note.id} note={note}/>) : <Empty>No active notes yet.</Empty>}</div></section><section className={panel}><h2 className="text-base font-semibold text-[var(--text-primary)]">Archived notes</h2><div className="mt-3 grid max-h-[300px] gap-3 overflow-y-auto pr-1">{archived.length ? archived.map((note) => <NoteCard key={note.id} note={note}/>) : <Empty>No archived notes.</Empty>}</div></section></div></div> : feedback("auth_blocked")}</main>;
}
