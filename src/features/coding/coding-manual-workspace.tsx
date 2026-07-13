"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  archiveCodingSessionFormAction,
  createCodingProjectFormAction,
  createCodingSessionFormAction,
  updateCodingProjectFormAction,
  updateCodingSessionFormAction,
} from "@/features/real-data/actions/coding.actions";
import type { CodingOverviewViewModel } from "./types";
import {
  CodingPanel,
  CodingPill,
  EmptyStateCard,
  inputClass,
  primaryButtonClass,
  quietButtonClass,
} from "./components/coding-overview-primitives";

const statuses = ["idea", "active", "paused", "blocked", "completed", "archived"];
const actionMessages: Record<string, { message: string; tone: "error" | "success" }> = {
  auth_blocked: { message: "Anmeldung erforderlich. Coding-Writes sind blockiert.", tone: "error" },
  project_created: { message: "Coding-Projekt erstellt.", tone: "success" },
  project_error: { message: "Coding-Projekt konnte nicht gespeichert werden.", tone: "error" },
  project_updated: { message: "Coding-Projekt aktualisiert.", tone: "success" },
  session_archived: { message: "Coding Session archiviert.", tone: "success" },
  session_created: { message: "Coding Session gespeichert.", tone: "success" },
  session_error: { message: "Coding Session konnte nicht gespeichert werden.", tone: "error" },
  session_updated: { message: "Coding Session aktualisiert.", tone: "success" },
};

function LabeledField({ children, label }: Readonly<{ children: React.ReactNode; label: string }>) {
  return <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]"><span>{label}</span>{children}</label>;
}

export function CodingManualWorkspace({ viewModel }: Readonly<{ viewModel: CodingOverviewViewModel }>) {
  const params = useSearchParams();
  const workspace = viewModel.manualWorkspace!;
  const selectedId = params.get("selected") ?? workspace.projects[0]?.id;
  const selected = workspace.projects.find((project) => project.id === selectedId) ?? workspace.projects[0] ?? null;
  const action = actionMessages[params.get("codingAction") ?? ""];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6" id="coding-overview-page">
      <header className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-blue)]">Life OS / Coding</p>
        <h1 className="mt-1 text-[24px] font-semibold text-[var(--text-primary)]">Coding Projects & Sessions</h1>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Kanonische Coding-Projekte, Tasks, Resources und reload-stabile Arbeitslogs.</p>
      </header>

      {action ? <div aria-live="polite" className={`rounded-[12px] border px-3 py-2 text-[11px] ${action.tone === "success" ? "border-[rgba(66,184,131,.34)] text-[var(--accent-green)]" : "border-[rgba(221,107,95,.34)] text-[var(--accent-red)]"}`} data-coding-action-status role="status">{action.message}</div> : null}
      {!workspace.authAvailable ? <EmptyStateCard title="Coding ist auth-blocked" description="Melde dich lokal an, um Coding-Projekte und Sessions zu verwalten." /> : null}

      <div className="grid gap-2 xl:grid-cols-12">
        <CodingPanel className="xl:col-span-3" subtitle="Canonical projects filtered by the Coding area." title="Aktive Coding-Projekte">
          <div className="grid gap-2" data-coding-region="projects">
            {workspace.projects.length ? workspace.projects.map((project) => <Link className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" data-coding-project-card href={`/coding?selected=${project.id}`} key={project.id}><span className="block text-[12px] font-semibold text-[var(--text-primary)]">{project.title}</span><span className="mt-1 block text-[10px] text-[var(--text-muted)]">{project.status} · {project.tasks.length} Tasks · {project.resources.length} Resources</span></Link>) : <EmptyStateCard title="Keine Coding-Projekte" description="Erstelle das erste kanonische Project für die Coding-Area." />}
          </div>
          {workspace.authAvailable ? <form action={createCodingProjectFormAction} aria-label="Coding-Projekt erstellen" className="mt-3 grid gap-2 rounded-[12px] border border-[var(--border-subtle)] p-3">
            <LabeledField label="Titel"><input className={inputClass} name="title" required /></LabeledField>
            <LabeledField label="Beschreibung"><textarea className={inputClass} name="description" /></LabeledField>
            <LabeledField label="Status"><select className={inputClass} defaultValue="active" name="status">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></LabeledField>
            <LabeledField label="Repository-URL"><input className={inputClass} name="repositoryUrl" type="url" /></LabeledField>
            <button className={primaryButtonClass} type="submit">Coding-Projekt erstellen</button>
          </form> : null}
        </CodingPanel>

        <CodingPanel className="xl:col-span-5" subtitle="Project depth from canonical Tasks and Resource relations." title="Project Context">
          {selected ? <div data-coding-region="project-context">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-[18px] font-semibold text-[var(--text-primary)]">{selected.title}</h2><p className="mt-1 text-[11px] text-[var(--text-secondary)]">{selected.description || "Keine Beschreibung."}</p></div><CodingPill>{selected.status}</CodingPill></div>
            <div className="mt-3 flex gap-2"><Link className={quietButtonClass} href={`/portfolio?view=projects&selected=${selected.id}`}>Project öffnen</Link>{selected.repositoryUrl ? <a className={quietButtonClass} href={selected.repositoryUrl} rel="noreferrer" target="_blank">Repository öffnen</a> : null}</div>
            <form action={updateCodingProjectFormAction} aria-label="Coding-Projekt bearbeiten" className="mt-3 grid gap-2 rounded-[12px] border border-[var(--border-subtle)] p-3">
              <input name="projectId" type="hidden" value={selected.id} />
              <LabeledField label="Titel"><input className={inputClass} defaultValue={selected.title} name="title" required /></LabeledField>
              <LabeledField label="Beschreibung"><textarea className={inputClass} defaultValue={selected.description ?? ""} name="description" /></LabeledField>
              <LabeledField label="Status"><select className={inputClass} defaultValue={selected.status} name="status">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></LabeledField>
              <LabeledField label="Repository-URL"><input className={inputClass} defaultValue={selected.repositoryUrl ?? ""} name="repositoryUrl" type="url" /></LabeledField>
              <button className={primaryButtonClass} type="submit">Project speichern</button>
            </form>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <section aria-label="Coding Project Tasks"><h3 className="text-[11px] font-semibold text-[var(--text-primary)]">Tasks</h3>{selected.tasks.length ? <ul className="mt-1 grid gap-1">{selected.tasks.map((task) => <li key={task.id}><Link className="text-[10px] text-[var(--accent-cyan)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" href={`/portfolio?view=tasks&selected=${task.id}`}>{task.title} · {task.status}</Link></li>)}</ul> : <p className="mt-1 text-[10px] text-[var(--text-muted)]">Keine verknüpften Tasks.</p>}</section>
              <section aria-label="Coding Project Resources"><h3 className="text-[11px] font-semibold text-[var(--text-primary)]">Resources</h3>{selected.resources.length ? <ul className="mt-1 grid gap-1">{selected.resources.map((resource) => <li key={resource.id}><Link className="text-[10px] text-[var(--accent-cyan)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]" href={`/resources?selected=${resource.id}`}>{resource.title} · {resource.relationType}</Link></li>)}</ul> : <p className="mt-1 text-[10px] text-[var(--text-muted)]">Keine verknüpften Resources.</p>}</section>
            </div>
          </div> : <EmptyStateCard title="Kein Project ausgewählt" description="Erstelle oder wähle ein Coding-Projekt." />}
        </CodingPanel>

        <CodingPanel className="xl:col-span-4" subtitle="Manual work log; no automatic tracking." title="Session erfassen">
          {selected ? <form action={createCodingSessionFormAction} aria-label="Coding Session erfassen" className="grid gap-2" data-coding-region="session-form">
            <input name="projectId" type="hidden" value={selected.id} />
            <LabeledField label="Datum"><input className={inputClass} defaultValue={today} name="sessionDate" required type="date" /></LabeledField>
            <LabeledField label="Startzeit"><input className={inputClass} name="startTime" type="time" /></LabeledField>
            <LabeledField label="Dauer (Minuten)"><input className={inputClass} min="1" name="durationMinutes" required type="number" /></LabeledField>
            <LabeledField label="Tätigkeit / Fokus"><input className={inputClass} name="activity" required /></LabeledField>
            <LabeledField label="Ergebnis"><textarea className={inputClass} name="outcome" required /></LabeledField>
            <LabeledField label="Notiz"><textarea className={inputClass} name="note" /></LabeledField>
            <button className={primaryButtonClass} type="submit">Session speichern</button>
          </form> : <EmptyStateCard title="Keine Session möglich" description="Eine Session benötigt ein gültiges Coding-Projekt." />}
        </CodingPanel>

        <CodingPanel className="xl:col-span-12" subtitle="Active and archived history, newest first." title="Recent Sessions / Log">
          <div className="grid gap-2 lg:grid-cols-2" data-coding-region="session-log">
            {workspace.sessions.length ? workspace.sessions.map((session) => <article className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3" data-coding-session-card key={session.id}>
              <div className="flex justify-between gap-3"><div><h3 className="text-[12px] font-semibold text-[var(--text-primary)]">{session.activity}</h3><Link className="text-[10px] text-[var(--accent-cyan)]" href={`/portfolio?view=projects&selected=${session.projectId}`}>{session.projectTitle}</Link></div><CodingPill>{session.archivedAt ? "archived" : `${session.durationMinutes} min`}</CodingPill></div>
              <p className="mt-2 text-[10px] text-[var(--text-secondary)]">{session.sessionDate}{session.startTime ? ` · ${session.startTime.slice(0, 5)}` : ""} · {session.outcome}</p>{session.note ? <p className="mt-1 text-[10px] text-[var(--text-muted)]">{session.note}</p> : null}
              {!session.archivedAt ? <form action={updateCodingSessionFormAction} aria-label={`Coding Session bearbeiten ${session.activity}`} className="mt-3 grid gap-2">
                <input name="sessionId" type="hidden" value={session.id} /><input name="projectId" type="hidden" value={session.projectId} />
                <LabeledField label="Datum"><input className={inputClass} defaultValue={session.sessionDate} name="sessionDate" required type="date" /></LabeledField>
                <LabeledField label="Startzeit"><input className={inputClass} defaultValue={session.startTime?.slice(0, 5) ?? ""} name="startTime" type="time" /></LabeledField>
                <LabeledField label="Dauer (Minuten)"><input className={inputClass} defaultValue={session.durationMinutes} min="1" name="durationMinutes" required type="number" /></LabeledField>
                <LabeledField label="Tätigkeit / Fokus"><input className={inputClass} defaultValue={session.activity} name="activity" required /></LabeledField>
                <LabeledField label="Ergebnis"><textarea className={inputClass} defaultValue={session.outcome} name="outcome" required /></LabeledField>
                <LabeledField label="Notiz"><textarea className={inputClass} defaultValue={session.note ?? ""} name="note" /></LabeledField>
                <button className={quietButtonClass} type="submit">Session aktualisieren</button>
              </form> : null}
              {!session.archivedAt ? <form action={archiveCodingSessionFormAction} aria-label={`Coding Session archivieren ${session.activity}`} className="mt-2"><input name="sessionId" type="hidden" value={session.id} /><input name="projectId" type="hidden" value={session.projectId} /><button className={quietButtonClass} type="submit">Session archivieren</button></form> : null}
            </article>) : <EmptyStateCard title="Noch keine Coding Sessions" description="Erfasse die erste manuelle Session für ein Coding-Projekt." />}
          </div>
        </CodingPanel>
      </div>
    </div>
  );
}
