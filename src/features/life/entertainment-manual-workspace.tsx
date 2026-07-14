import Link from "next/link";
import {
  archiveEntertainmentItemFormAction,
  createEntertainmentItemFormAction,
  restoreEntertainmentItemFormAction,
  updateEntertainmentItemFormAction,
} from "@/features/real-data/actions/life.actions";
import type { EntertainmentItem, EntertainmentMediaType, EntertainmentWorkspace } from "@/features/real-data/domain/life";
import { cn } from "@/lib/cn";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "./components/life-workbench-primitives";

const panel = "rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] p-4";
const label = "text-[11px] font-semibold text-[var(--text-secondary)]";
const typeLabels: Record<EntertainmentMediaType, string> = { book: "Book", movie: "Movie", series: "Series", game: "Game" };
const statusLabels = { planned: "Planned", in_progress: "In progress", completed: "Completed", dropped: "Dropped" } as const;
const returnNames: Record<EntertainmentMediaType, string> = { book: "books", movie: "movies", series: "series", game: "games" };

function Feedback({ state }: Readonly<{ state?: string }>) {
  if (!state) return null;
  const error = state === "error" || state === "invalid" || state === "auth_blocked";
  const messages: Record<string, string> = {
    archived: "Entertainment item archived and kept in history.",
    auth_blocked: "Manual entertainment data requires an active local sign-in.",
    created: "Entertainment item saved.",
    error: "The entertainment item could not be saved.",
    invalid: "Check status, rating and progress fields.",
    restored: "Entertainment item restored.",
    updated: "Entertainment item updated.",
  };
  return <p className={cn(panel, "text-sm", error ? "border-[rgba(221,107,95,.35)] text-[var(--accent-red)]" : "border-[rgba(66,184,131,.3)] text-[var(--accent-green)]")} role={error ? "alert" : "status"}>{messages[state] ?? state}</p>;
}

function Navigation({ active }: Readonly<{ active?: EntertainmentMediaType }>) {
  const links = [
    ["Overview", "/life/entertainment", undefined],
    ["Books", "/life/entertainment/books", "book"],
    ["Movies", "/life/entertainment/movies", "movie"],
    ["Series", "/life/entertainment/series", "series"],
    ["Games", "/life/entertainment/games", "game"],
  ] as const;
  return <nav aria-label="Entertainment collections" className="flex flex-wrap gap-2">{links.map(([text, href, type]) => <Link className={cn(secondaryButtonClass, type === active && "border-[rgba(155,124,246,.5)] text-[var(--text-primary)]")} href={href} key={href}>{text}</Link>)}</nav>;
}

function Empty({ children }: Readonly<{ children: string }>) {
  return <p className="rounded-[12px] border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-muted)]">{children}</p>;
}

function Fields({ item, lockedType }: Readonly<{ item?: EntertainmentItem; lockedType?: EntertainmentMediaType }>) {
  return <>
    {lockedType ? <><input name="mediaType" type="hidden" value={lockedType}/><p className={label}>Type<span className="mt-1 block text-sm font-normal text-[var(--text-primary)]">{typeLabels[lockedType]}</span></p></> : <label className={label}>Type<select className={inputClass} defaultValue={item?.mediaType ?? "book"} name="mediaType">{Object.entries(typeLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>}
    <label className={label}>Title<input className={inputClass} defaultValue={item?.title} name="title" required/></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className={label}>Creator or studio<input className={inputClass} defaultValue={item?.creatorOrStudio ?? ""} name="creatorOrStudio"/></label><label className={label}>Release year<input className={inputClass} defaultValue={item?.releaseYear ?? ""} max="3000" min="1000" name="releaseYear" type="number"/></label></div>
    <div className="grid gap-3 sm:grid-cols-3"><label className={label}>Status<select className={inputClass} defaultValue={item?.status ?? "planned"} name="status">{Object.entries(statusLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><label className={label}>Started on<input className={inputClass} defaultValue={item?.startedOn ?? ""} name="startedOn" type="date"/></label><label className={label}>Completed on<input className={inputClass} defaultValue={item?.completedOn ?? ""} name="completedOn" type="date"/></label></div>
    <div className="grid gap-3 sm:grid-cols-4"><label className={label}>Progress<input className={inputClass} defaultValue={item?.progressCurrent ?? ""} min="0" name="progressCurrent" step="any" type="number"/></label><label className={label}>Total<input className={inputClass} defaultValue={item?.progressTotal ?? ""} min="0.01" name="progressTotal" step="any" type="number"/></label><label className={label}>Unit<select className={inputClass} defaultValue={item?.progressUnit ?? ""} name="progressUnit"><option value="">No progress</option><option value="pages">Pages</option><option value="episodes">Episodes</option><option value="percent">Percent</option><option value="hours">Hours</option></select></label><label className={label}>Rating 1–10<input className={inputClass} defaultValue={item?.rating ?? ""} max="10" min="1" name="rating" type="number"/></label></div>
    <label className={label}>Notes<textarea className={cn(inputClass, "min-h-24 py-3")} defaultValue={item?.notes ?? ""} name="notes"/></label>
  </>;
}

function ItemCard({ item, returnTo }: Readonly<{ item: EntertainmentItem; returnTo: string }>) {
  const progress = item.progressUnit ? `${item.progressCurrent ?? "—"}${item.progressTotal !== null ? ` / ${item.progressTotal}` : ""} ${item.progressUnit}` : null;
  return <article className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex flex-wrap gap-2 text-[10px] text-[var(--text-muted)]"><span>{typeLabels[item.mediaType]}</span><span>{statusLabels[item.status]}</span><span>{item.archivedAt ? "Archived" : "Active"}</span></div><h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{item.title}</h3><p className="mt-1 text-xs text-[var(--text-secondary)]">{[item.creatorOrStudio, item.releaseYear].filter(Boolean).join(" · ") || "No creator or release year"}</p></div>{item.rating ? <span className="text-xs font-semibold text-[var(--accent-purple)]">{item.rating}/10</span> : null}</div>
    {progress ? <p className="mt-3 text-xs text-[var(--text-secondary)]">Progress: {progress}</p> : null}
    {item.notes ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">{item.notes}</p> : null}
    {!item.archivedAt ? <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-[var(--accent-purple)]">Edit item</summary><form action={updateEntertainmentItemFormAction} className="mt-3 grid gap-3"><input name="entertainmentItemId" type="hidden" value={item.id}/><input name="returnTo" type="hidden" value={returnTo}/><Fields item={item}/><div className="flex flex-wrap gap-2"><button className={primaryButtonClass} type="submit">Save changes</button><button className={secondaryButtonClass} formAction={archiveEntertainmentItemFormAction} type="submit">Archive</button></div></form></details> : <form action={restoreEntertainmentItemFormAction} className="mt-3"><input name="entertainmentItemId" type="hidden" value={item.id}/><input name="returnTo" type="hidden" value={returnTo}/><button className={secondaryButtonClass} type="submit">Restore item</button></form>}
  </article>;
}

function ItemList({ empty, items, returnTo }: Readonly<{ empty: string; items: EntertainmentItem[]; returnTo: string }>) {
  return <div className="mt-3 grid max-h-[420px] gap-3 overflow-y-auto pr-1">{items.length ? items.map((item) => <ItemCard item={item} key={item.id} returnTo={returnTo}/>) : <Empty>{empty}</Empty>}</div>;
}

export function EntertainmentManualWorkspace({ mediaType, state, workspace }: Readonly<{ mediaType?: EntertainmentMediaType; state?: string; workspace: EntertainmentWorkspace | null }>) {
  const returnTo = mediaType ? returnNames[mediaType] : "overview";
  const items = workspace?.items.filter((item) => !mediaType || item.mediaType === mediaType) ?? [];
  const active = items.filter((item) => !item.archivedAt);
  const archived = items.filter((item) => item.archivedAt);
  const planned = active.filter((item) => item.status === "planned");
  const current = active.filter((item) => item.status === "in_progress");
  const completed = active.filter((item) => item.status === "completed");
  const title = mediaType ? `${typeLabels[mediaType]} Collection` : "Entertainment";
  return <main className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6">
    <header className={panel}><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--accent-purple)]">Life / Entertainment collections</p><div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-2xl font-semibold text-[var(--text-primary)]">{title}</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">Private manual tracking for books, movies, series and games. No external metadata or recommendations.</p></div><Navigation active={mediaType}/></div></header>
    <Feedback state={state}/>
    {workspace ? <><div className="grid min-h-0 gap-2 xl:grid-cols-[minmax(340px,.72fr)_minmax(0,1.28fr)]"><section className={panel}><h2 className="text-base font-semibold text-[var(--text-primary)]">Add {mediaType ? typeLabels[mediaType].toLowerCase() : "media"}</h2><form action={createEntertainmentItemFormAction} className="mt-4 grid gap-3"><input name="returnTo" type="hidden" value={returnTo}/><Fields lockedType={mediaType}/><button className={primaryButtonClass} type="submit">Save item</button></form></section><div className="grid min-h-0 gap-2"><section className={panel}><h2 className="text-base font-semibold text-[var(--text-primary)]">Active collection</h2><ItemList empty={`No active ${mediaType ? typeLabels[mediaType].toLowerCase() : "entertainment"} items yet.`} items={active} returnTo={returnTo}/></section><section className={panel}><h2 className="text-base font-semibold text-[var(--text-primary)]">Archive history</h2><ItemList empty="No archived entertainment items." items={archived} returnTo={returnTo}/></section></div></div>{!mediaType ? <div className="grid gap-2 lg:grid-cols-3"><section className={panel}><h2 className="text-sm font-semibold text-[var(--text-primary)]">Recently active</h2><ItemList empty="Nothing in progress." items={current.slice(0, 5)} returnTo={returnTo}/></section><section className={panel}><h2 className="text-sm font-semibold text-[var(--text-primary)]">Planned</h2><ItemList empty="Nothing planned." items={planned.slice(0, 5)} returnTo={returnTo}/></section><section className={panel}><h2 className="text-sm font-semibold text-[var(--text-primary)]">Completed</h2><ItemList empty="Nothing completed." items={completed.slice(0, 5)} returnTo={returnTo}/></section></div> : null}</> : <Feedback state="auth_blocked"/>}
  </main>;
}
