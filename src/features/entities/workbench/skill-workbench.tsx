import Link from "next/link";
import { SkillDisclosureBoundary } from "./skill-disclosure-boundary";
import { skillWorkAction, skillTaskReadiness } from "./skill-guidance";
import { actionClass, fieldClass } from "./form-styles";
import type { ReactNode } from "react";
import {
  skillPracticeReads,
  type SkillDevelopmentRead,
  type DevelopmentEvidence,
  type DevelopmentTarget,
  type SkillMilestone,
} from "@/features/real-data/domain/skill-development";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import { SkillCommandForm } from "./skill-command-form";
import { OperationForm } from "./forms";
const statusLabel = {
  planned: "Geplant",
  current: "Aktuell",
  completed: "Abgeschlossen",
  retired: "Beendet",
};
type SkillPresentation = "split" | "information" | "actions";
function SkillColumns({
  information,
  actions,
  presentation = "split",
}: {
  information: ReactNode;
  actions?: ReactNode;
  presentation?: SkillPresentation;
}) {
  if (presentation === "information")
    return (
      <div data-skill-information className="grid min-w-0 gap-2">
        {information}
      </div>
    );
  if (presentation === "actions")
    return (
      <div data-skill-actions className="grid min-w-0 gap-3">
        {actions}
      </div>
    );
  return (
    <div
      data-skill-columns
      className="skill-columns grid min-w-0 items-start gap-4"
    >
      <div data-skill-information className="grid min-w-0 content-start gap-2">
        {information}
      </div>
      {actions && (
        <div
          data-skill-actions
          className="skill-secondary-actions grid min-w-0 content-start gap-3"
        >
          {actions}
        </div>
      )}
    </div>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="grid min-w-0 content-start gap-4 border-t border-[var(--border-subtle)] pt-5"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Text({
  name,
  label,
  value,
  required = false,
  large = false,
}: {
  name: string;
  label: string;
  value?: string | null;
  required?: boolean;
  large?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      {label}
      {large ? (
        <textarea
          name={name}
          defaultValue={value ?? ""}
          className={fieldClass}
          maxLength={8000}
          rows={3}
          required={required}
        />
      ) : (
        <input
          name={name}
          defaultValue={value ?? ""}
          className={fieldClass}
          maxLength={200}
          required={required}
        />
      )}
    </label>
  );
}
export function SkillCapture({
  areas,
}: {
  areas: { id: string; name: string }[];
}) {
  return (
    <SkillCommandForm
      operation="skill.create"
      skillId={null}
      revision={null}
      label="Skill erstellen"
    >
      <Text name="name" label="Name" required />
      <Text
        name="summary"
        label="Warum mir diese Fähigkeit wichtig ist"
        large
      />
      <label className="grid gap-1 text-sm">
        Area
        <select aria-label="Area" name="area_id" className={fieldClass}>
          <option value="">Keine Area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
    </SkillCommandForm>
  );
}
export function SkillWorkbench({
  read,
  data,
}: {
  read: SkillDevelopmentRead;
  data: WorkbenchData;
}) {
  const s = read.skill,
    archived = Boolean(s.archived_at || s.status === "archived"),
    revision = s.development_revision;
  const reads = skillPracticeReads(
    read.practice,
    read.evidence,
    read.as_of,
    read.timezone,
  );
  reads.open.sort(
    (a, b) =>
      (data.tasks.find((t) => t.id === a.id)?.created_at ?? "").localeCompare(
        data.tasks.find((t) => t.id === b.id)?.created_at ?? "",
      ) || a.id.localeCompare(b.id),
  );
  const current = read.targets.find(
    (t) => !t.archived_at && t.status === "current",
  );
  const formProps = { skillId: s.id, revision };
  const sources = [
    ...data.tasks
      .filter((t) => !t.archived_at && t.status !== "archived")
      .map((t) => ({ id: `task:${t.id}`, title: `Task · ${t.title}` })),
    ...data.projects
      .filter((t) => !t.archived_at)
      .map((t) => ({ id: `project:${t.id}`, title: `Project · ${t.title}` })),
    ...data.goals
      .filter((t) => !t.archived_at)
      .map((t) => ({ id: `goal:${t.id}`, title: `Goal · ${t.title}` })),
    ...data.resources
      .filter((t) => !t.archived_at)
      .map((t) => ({ id: `resource:${t.id}`, title: `Resource · ${t.title}` })),
  ];
  const evidenceFields = (e?: DevelopmentEvidence) => (
    <>
      <Text name="title" label="Titel" value={e?.title} required />
      <Text name="note" label="Beobachtung / Kontext" value={e?.note} large />
      <label className="grid gap-1 text-sm">
        Datum
        <input
          name="evidence_date"
          type="date"
          required
          defaultValue={e?.evidence_date}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Quelle
        <select
          aria-label="Quelle"
          name="sourceReference"
          className={fieldClass}
          defaultValue={
            e ? `${e.source_type}:${e.source_id ?? ""}` : "manual_note:"
          }
        >
          <option value="manual_note:">Eigene Beobachtung</option>
          {sources.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
          {e?.source_id &&
            !sources.some(
              (o) => o.id === `${e.source_type}:${e.source_id}`,
            ) && (
              <option value={`${e.source_type}:${e.source_id}`}>
                Quelle nicht verfügbar — neue Quelle wählen
              </option>
            )}
        </select>
      </label>
    </>
  );
  function reviewForm(t: DevelopmentTarget, m?: SkillMilestone) {
    return (
      <details>
        <summary className="cursor-pointer py-2 text-sm">
          {m ? "Lernschritt überprüfen" : "Entwicklungsfokus überprüfen"}
        </summary>
        <SkillCommandForm
          {...formProps}
          operation="review.submit"
          label={m ? "Lernschritt überprüfen" : "Entwicklungsfokus überprüfen"}
          payload={{ target_id: t.id, milestone_id: m?.id ?? null }}
          preview={
            <>
              <p>{m?.title ?? t.title}</p>
              <ul>
                {read.milestones
                  .filter((x) => x.target_id === t.id && !x.archived_at)
                  .map((x) => (
                    <li key={x.id}>
                      {x.title} · {statusLabel[x.status]}
                    </li>
                  ))}
              </ul>
            </>
          }
        >
          <label>
            Entscheidung
            <select
              aria-label="Entscheidung"
              name="decision"
              className={fieldClass}
            >
              <option value="continue">Weiterentwickeln</option>
              <option value="completed">Abgeschlossen</option>
              {!m && <option value="retired">Beendet</option>}
            </select>
          </label>
          <Text name="note" label="Begründung" required large />
          {!m && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="open_milestones_acknowledged" />
              Noch offene Lernschritte bewusst bestätigen
            </label>
          )}
          <fieldset className="grid gap-2">
            <legend className="text-sm">
              Beobachtungen auswählen (optional)
            </legend>
            {reads.currentEvidence.map((e) => (
              <label key={e.id} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  name="evidence"
                  value={`${e.id}:${e.revision}`}
                />
                {e.title} · {e.evidence_date}
              </label>
            ))}
          </fieldset>
        </SkillCommandForm>
      </details>
    );
  }
  const activeSteps = (t: DevelopmentTarget) =>
    read.milestones
      .filter((m) => m.target_id === t.id && !m.archived_at)
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const addStep = (t: DevelopmentTarget) => (
    <details>
      <summary className="cursor-pointer py-2 text-sm">
        Lernschritt hinzufügen
      </summary>
      <SkillCommandForm
        {...formProps}
        operation="milestone.create"
        label="Lernschritt hinzufügen"
        payload={{ target_id: t.id }}
      >
        <Text name="title" label="Titel" required />
        <Text name="description" label="Beschreibung" large />
      </SkillCommandForm>
    </details>
  );
  const stepRow = (
    t: DevelopmentTarget,
    m: SkillMilestone,
    index: number,
    active: SkillMilestone[],
    presentation: SkillPresentation = "split",
  ) => {
    const terminal = ["completed", "retired"].includes(t.status);
    return (
      <article
        key={m.id}
        aria-label={`${presentation === "actions" ? "Aktionen für Lernschritt" : "Lernschritt"} ${m.title}`}
        className={`grid min-w-0 gap-2 rounded-lg border p-3 ${m.status === "current" ? "border-[var(--accent-cyan)] bg-[var(--surface-2)]" : "border-[var(--border-subtle)] text-[var(--text-secondary)]"}`}
      >
        {presentation === "actions" && (
          <h4 className="break-words font-medium">{m.title}</h4>
        )}
        <SkillColumns
          presentation={presentation}
          information={
            <>
              <h4 className="break-words font-medium">
                {m.title} ·{" "}
                <span className="text-sm text-[var(--text-muted)]">
                  {statusLabel[m.status]}
                </span>
              </h4>
              {m.description && (
                <p className="whitespace-pre-wrap break-words text-sm">
                  {m.description}
                </p>
              )}
            </>
          }
          actions={
            <>
              {!archived && !t.archived_at && !terminal && (
                <details>
                  <summary className="cursor-pointer py-2 text-sm">
                    Lernschritt verwalten
                  </summary>
                  <div className="grid gap-3">
                    {m.status !== "completed" ? (
                      <>
                        <SkillCommandForm
                          {...formProps}
                          operation="milestone.edit"
                          label="Lernschritt speichern"
                          payload={{ target_id: t.id, milestone_id: m.id }}
                        >
                          <Text
                            name="title"
                            label="Titel"
                            value={m.title}
                            required
                          />
                          <Text
                            name="description"
                            label="Beschreibung"
                            value={m.description}
                            large
                          />
                        </SkillCommandForm>
                        {t.status === "current" && m.status !== "current" && (
                          <SkillCommandForm
                            {...formProps}
                            operation="milestone.current"
                            label="Als aktuellen Lernschritt wählen"
                            payload={{ target_id: t.id, milestone_id: m.id }}
                          />
                        )}
                        {reviewForm(t, m)}
                      </>
                    ) : (
                      <SkillCommandForm
                        {...formProps}
                        operation="milestone.reopen"
                        label="Lernschritt wieder öffnen"
                        payload={{ target_id: t.id, milestone_id: m.id }}
                      />
                    )}
                    {index > 0 && (
                      <SkillCommandForm
                        {...formProps}
                        operation="milestone.reorder"
                        label="Nach oben"
                        payload={{
                          target_id: t.id,
                          ids: active
                            .map((x) => x.id)
                            .toSpliced(
                              index - 1,
                              2,
                              m.id,
                              active[index - 1].id,
                            ),
                        }}
                      />
                    )}
                    <SkillCommandForm
                      {...formProps}
                      operation="milestone.archive"
                      label="Lernschritt archivieren"
                      payload={{ target_id: t.id, milestone_id: m.id }}
                    />
                  </div>
                </details>
              )}
            </>
          }
        />
      </article>
    );
  };
  function targetBlock(t: DevelopmentTarget) {
    const milestones = read.milestones.filter((m) => m.target_id === t.id);
    const active = activeSteps(t);
    const terminal = ["completed", "retired"].includes(t.status);
    return (
      <article
        key={t.id}
        data-target={t.id}
        className="grid min-w-0 gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4"
      >
        <SkillColumns
          information={
            <>
              <header>
                <h3 className="break-words font-semibold">{t.title}</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  {t.archived_at ? "Archiviert" : statusLabel[t.status]}
                </p>
              </header>
              {t.description && (
                <p className="whitespace-pre-wrap break-words text-sm">
                  {t.description}
                </p>
              )}
            </>
          }
          actions={
            <>
              {!archived &&
                !t.archived_at &&
                !terminal &&
                t.status !== "current" && (
                  <SkillCommandForm
                    {...formProps}
                    operation="target.current"
                    payload={{ target_id: t.id }}
                    label="Als aktuellen Fokus wählen"
                  />
                )}

              {!archived && !t.archived_at && !terminal && (
                <>
                  {t.id !== current?.id && addStep(t)}
                  {reviewForm(t)}
                </>
              )}
              {!archived && (
                <details>
                  <summary className="cursor-pointer py-2 text-sm">
                    Entwicklungsfokus verwalten
                  </summary>
                  <div className="grid gap-3">
                    {t.archived_at ? (
                      <SkillCommandForm
                        {...formProps}
                        operation="target.restore"
                        label="Fokus wiederherstellen"
                        payload={{ target_id: t.id }}
                      />
                    ) : (
                      <>
                        {!terminal && (
                          <SkillCommandForm
                            {...formProps}
                            operation="target.edit"
                            label="Fokus speichern"
                            payload={{ target_id: t.id }}
                          >
                            <Text
                              name="title"
                              label="Titel"
                              value={t.title}
                              required
                            />
                            <Text
                              name="description"
                              label="Beschreibung"
                              value={t.description}
                              large
                            />
                          </SkillCommandForm>
                        )}
                        {terminal && (
                          <SkillCommandForm
                            {...formProps}
                            operation="target.reopen"
                            label="Fokus wieder öffnen"
                            payload={{ target_id: t.id }}
                          />
                        )}
                        <SkillCommandForm
                          {...formProps}
                          operation="target.archive"
                          label="Fokus archivieren"
                          payload={{ target_id: t.id }}
                        />
                      </>
                    )}
                    {!t.archived_at &&
                      !terminal &&
                      milestones
                        .filter((m) => m.archived_at)
                        .map((m) => (
                          <SkillCommandForm
                            key={m.id}
                            {...formProps}
                            operation="milestone.restore"
                            label={`Lernschritt wiederherstellen: ${m.title}`}
                            payload={{ target_id: t.id, milestone_id: m.id }}
                          />
                        ))}
                  </div>
                </details>
              )}
            </>
          }
        />
        {t.id !== current?.id &&
          active.map((m, index) => stepRow(t, m, index, active))}
      </article>
    );
  }
  const createEvidence = !archived && (
    <details>
      <summary className="cursor-pointer py-2 text-sm text-[var(--accent-cyan)]">
        Beobachtung festhalten
      </summary>
      <SkillCommandForm
        {...formProps}
        operation="evidence.create"
        label="Beobachtung festhalten"
      >
        {evidenceFields()}
      </SkillCommandForm>
    </details>
  );
  const primary = skillWorkAction(
    read,
    data.dependencyGraph,
    data.dependencyUnavailable === true,
    data.relations.some(
      (r) => r.target_type === "skill" && r.target_id === s.id,
    ),
  );
  const orderedEvidence = [...reads.currentEvidence].sort(
    (a, b) =>
      b.evidence_date.localeCompare(a.evidence_date) ||
      a.id.localeCompare(b.id),
  );
  const latestReview = [...read.reviews].sort(
    (a, b) =>
      b.reviewed_at.localeCompare(a.reviewed_at) || a.id.localeCompare(b.id),
  )[0];
  const focusCreate = !archived && (
    <details id="skill-focus-create">
      <summary
        className={
          primary.kind === "focus"
            ? `w-fit cursor-pointer ${actionClass}`
            : "cursor-pointer py-2 text-sm text-[var(--accent-cyan)]"
        }
      >
        Entwicklungsfokus festlegen
      </summary>
      <SkillCommandForm
        {...formProps}
        operation="target.create"
        label="Entwicklungsfokus geplant speichern"
      >
        <Text name="title" label="Was möchtest du besser können?" required />
        <Text name="description" label="Was ist dir dabei wichtig?" large />
        <p className="text-sm text-[var(--text-muted)]">
          Der Fokus startet geplant. Wähle ihn anschließend bewusst als aktuell.
        </p>
      </SkillCommandForm>
    </details>
  );
  function practiceRows(tasks: typeof reads.open) {
    return tasks.map((t) => {
      const readiness = skillTaskReadiness(
        data.dependencyGraph,
        t.id,
        data.dependencyUnavailable === true,
      );
      return (
        <article
          key={t.id}
          className="grid min-w-0 gap-1 border-t border-[var(--border-subtle)] py-3"
          aria-label={`Übung ${t.title}`}
        >
          <Link
            className="break-words font-medium text-[var(--text-primary)] underline underline-offset-4"
            href={`/tasks/${t.id}`}
          >
            {t.title}
          </Link>
          <p className="text-sm text-[var(--text-muted)]">{readiness.label}</p>
          {readiness.blockers.map((b, i) =>
            b.task ? (
              <Link
                key={i}
                className="break-words text-sm text-[var(--text-secondary)] underline"
                href={`/tasks/${b.task.id}`}
              >
                Voraussetzung: {b.task.title}
              </Link>
            ) : (
              <p key={i} className="text-sm">
                Voraussetzung nicht verfügbar
              </p>
            ),
          )}
        </article>
      );
    });
  }
  function observations(
    entries: DevelopmentEvidence[],
    presentation: SkillPresentation = "split",
  ) {
    return (
      <>
        {entries.map((e) => (
          <article
            key={e.id}
            aria-label={`${presentation === "actions" ? "Aktionen für Beobachtung" : "Beobachtung"} ${e.title}`}
            className="grid gap-2 border-t border-[var(--border-subtle)] pt-3"
          >
            {presentation === "actions" && (
              <h3 className="break-words font-medium">{e.title}</h3>
            )}
            <SkillColumns
              presentation={presentation}
              information={
                <>
                  <h3 className="break-words font-medium">{e.title}</h3>
                  <p className="text-sm">
                    {e.evidence_date} · Version {e.revision}
                    {e.evidence_date > reads.today
                      ? " · Datum liegt in der Zukunft; keine aktuelle Datierung"
                      : ""}
                  </p>
                  <p className="line-clamp-3 max-w-[70ch] whitespace-pre-wrap break-words text-sm">
                    {e.note}
                  </p>
                  {e.note && e.note.length > 240 && (
                    <details>
                      <summary className="cursor-pointer py-2 text-sm text-[var(--accent-cyan)]">
                        Beobachtung vollständig lesen
                      </summary>
                      <p className="max-w-[70ch] whitespace-pre-wrap break-words text-sm">
                        {e.note}
                      </p>
                    </details>
                  )}
                  <p className="text-xs text-[var(--text-muted)]">
                    {e.provenance_state === "legacy_unverified"
                      ? "Quelle damals nicht verifiziert"
                      : "Ausdrücklich festgehalten"}
                  </p>
                  {typeof e.source_snapshot?.title === "string" && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Erfasste Quelle: {e.source_snapshot.title}
                    </p>
                  )}
                  {e.source_id ? (
                    sources.some(
                      (x) => x.id === `${e.source_type}:${e.source_id}`,
                    ) ? (
                      <Link
                        className="text-sm underline"
                        href={`/${e.source_type === "resource" ? "resources" : e.source_type + "s"}/${e.source_id}`}
                      >
                        Quelle öffnen
                      </Link>
                    ) : (
                      <p className="text-sm">Quelle nicht verfügbar.</p>
                    )
                  ) : (
                    <p className="text-sm">Eigene Beobachtung</p>
                  )}
                </>
              }
              actions={
                <>
                  {!archived && (
                    <details>
                      <summary className="cursor-pointer py-2 text-sm">
                        Beobachtung korrigieren / zurückziehen
                      </summary>
                      <div className="grid gap-3">
                        <SkillCommandForm
                          {...formProps}
                          operation="evidence.correct"
                          label="Korrektur speichern"
                          payload={{ evidence_id: e.id, weight: e.weight }}
                        >
                          {evidenceFields(e)}
                          <Text
                            name="reason"
                            label="Korrekturbegründung"
                            required
                            large
                          />
                        </SkillCommandForm>
                        <SkillCommandForm
                          {...formProps}
                          operation="evidence.withdraw"
                          label="Beobachtung zurückziehen"
                          payload={{ evidence_id: e.id }}
                        >
                          <Text
                            name="reason"
                            label="Begründung"
                            required
                            large
                          />
                        </SkillCommandForm>
                      </div>
                    </details>
                  )}
                </>
              }
            />
          </article>
        ))}
      </>
    );
  }
  return (
    <SkillDisclosureBoundary>
      <div
        data-skill-development
        className="composition-flow w-full min-w-0 gap-4 pb-10"
      >
        <div className="skill-composition composition-frame flex min-w-0 flex-col gap-4">
        <header
          aria-label="Skillidentität"
          className="grid min-w-0 gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] p-4"
        >
          <Link
            className="text-sm text-[var(--text-muted)]"
            href="/portfolio?view=skills"
          >
            Portfolio / Skills
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid min-w-0 gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-blue)]">
                SKILL ·{" "}
                {archived
                  ? "Archiviert"
                  : s.status === "paused"
                    ? "Pausiert"
                    : "Aktiv"}
                {s.area_id &&
                  ` · ${data.areas.find((a) => a.id === s.area_id)?.name ?? "Area nicht verfügbar"}`}
              </p>
              <h1 className="break-words text-3xl font-semibold">{s.name}</h1>
            </div>
            <Link
              href="#skill-management"
              className="min-h-10 text-sm text-[var(--accent-cyan)] underline"
            >
              Skill verwalten
            </Link>
          </div>
          {s.summary && (
            <div className="max-w-[80ch]">
              <p className="text-xs text-[var(--text-muted)]">
                Warum mir diese Fähigkeit wichtig ist
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[var(--text-secondary)]">
                {s.summary}
              </p>
            </div>
          )}
        </header>
        <section
          aria-label="Entwicklungswerkbank"
          data-skill-workbench
          className="skill-workbench grid min-w-0 flex-1 items-start gap-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] p-4"
        >
          <aside
            aria-label="Skillaktionen"
            data-skill-actions
            className="skill-action-rail order-2 grid min-w-0 content-start gap-3 border-t border-[var(--border-subtle)] pt-4"
          >
            <h2 className="text-lg font-semibold">Aktionen</h2>
            <div data-skill-primary>
              {archived ? (
                <SkillCommandForm
                  {...formProps}
                  operation="skill.restore"
                  label="Skill wiederherstellen"
                />
              ) : s.status === "paused" ? (
                <SkillCommandForm
                  {...formProps}
                  operation="skill.edit"
                  payload={{
                    name: s.name,
                    summary: s.summary,
                    area_id: s.area_id,
                    status: "active",
                  }}
                  label="Entwicklung fortsetzen"
                />
              ) : primary.kind === "focus" ? (
                focusCreate
              ) : primary.kind === "planned" ? (
                <details>
                  <summary className={actionClass}>Fokus wählen</summary>
                  {read.targets
                    .filter((t) => !t.archived_at && t.status === "planned")
                    .map((t) => (
                      <SkillCommandForm
                        key={t.id}
                        {...formProps}
                        operation="target.current"
                        payload={{ target_id: t.id }}
                        label={`Fokus wählen: ${t.title}`}
                      />
                    ))}
                </details>
              ) : primary.taskId ? (
                <Link
                  className={`inline-block ${actionClass}`}
                  href={`/tasks/${primary.taskId}`}
                >
                  {primary.label}
                </Link>
              ) : primary.kind === "create" ? (
                <Link
                  className={`inline-block ${actionClass}`}
                  href={`/tasks/new?skill=${s.id}`}
                >
                  {primary.label}
                </Link>
              ) : (
                <details>
                  <summary className={`w-fit cursor-pointer ${actionClass}`}>
                    {primary.label}
                  </summary>
                  <div className="mt-3 grid min-w-0">
                    {practiceRows(reads.open)}
                  </div>
                </details>
              )}
            </div>
            {!archived && (
              <div className="grid min-w-0 gap-2 border-t border-[var(--border-subtle)] pt-3">
                {primary.kind !== "focus" && focusCreate}
                {primary.kind !== "create" &&
                  !primary.empty &&
                  s.status !== "paused" && (
                    <Link
                      className="min-h-10 py-2 text-sm text-[var(--accent-cyan)] underline"
                      href={`/tasks/new?skill=${s.id}`}
                    >
                      Weitere Übungsaufgabe anlegen
                    </Link>
                  )}
                <Link
                  className="min-h-10 py-2 text-sm text-[var(--accent-cyan)] underline"
                  href="#skill-connections"
                >
                  Bestehende Aufgabe verknüpfen
                </Link>
                {createEvidence}
              </div>
            )}{" "}
            {current && !archived && (
              <div className="grid gap-2">
                {addStep(current)}
                {activeSteps(current).length > 0 && (
                  <details>
                    <summary className="cursor-pointer py-2 text-sm">
                      Lernschritte verwalten
                    </summary>
                    <div className="grid gap-3 pt-3">
                      {activeSteps(current).map((m, index, active) =>
                        stepRow(current, m, index, active, "actions"),
                      )}
                    </div>
                  </details>
                )}
              </div>
            )}
            {!archived && orderedEvidence.length > 0 && (
              <details>
                <summary className="cursor-pointer py-2 text-sm">
                  Beobachtungen verwalten
                </summary>
                {observations(orderedEvidence, "actions")}
              </details>
            )}
            <div id="skill-management" className="scroll-mt-6">
              {" "}
              <details>
                <summary className="cursor-pointer py-2 font-medium">
                  Skill verwalten
                </summary>
                <div className="grid gap-4 pt-3">
                  {archived ? (
                    <p className="text-sm">
                      Wiederherstellen setzt den Skill pausiert. Fokus und
                      Lernschritt werden anschließend ausdrücklich gewählt.
                    </p>
                  ) : (
                    <>
                      <SkillCommandForm
                        {...formProps}
                        operation="skill.edit"
                        label="Skill speichern"
                      >
                        <Text
                          name="name"
                          label="Name"
                          value={s.name}
                          required
                        />
                        <Text
                          name="summary"
                          label="Warum mir diese Fähigkeit wichtig ist"
                          value={s.summary}
                          large
                        />
                        <label>
                          Status
                          <select
                            className={fieldClass}
                            aria-label="Status"
                            name="status"
                            defaultValue={s.status}
                          >
                            <option value="active">Aktiv</option>
                            <option value="paused">Pausiert</option>
                          </select>
                        </label>
                        <label>
                          Area
                          <select
                            className={fieldClass}
                            aria-label="Area"
                            name="area_id"
                            defaultValue={s.area_id ?? ""}
                          >
                            <option value="">Keine Area</option>
                            {data.areas
                              .filter((a) => !a.archived_at)
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                          </select>
                        </label>
                      </SkillCommandForm>
                      <SkillCommandForm
                        {...formProps}
                        operation="skill.archive"
                        label="Skill archivieren"
                      />
                    </>
                  )}
                </div>
              </details>
            </div>
          </aside>
          <div className="skill-information-group contents">
            <section aria-label="Aktuelle Entwicklung" className="contents">
              <div
                data-skill-information
                className="order-1 grid min-w-0 gap-3"
              >
                <h2 className="text-lg font-semibold">Aktuelle Entwicklung</h2>
                {primary.empty ? (
                  <p className="text-[var(--text-secondary)]">
                    Was möchtest du als Nächstes besser können?
                  </p>
                ) : current ? (
                  <div className="max-w-[85ch]">
                    <p className="text-xs text-[var(--text-muted)]">
                      Aktueller Entwicklungsfokus
                    </p>
                    <h3 className="mt-1 break-words text-xl font-semibold">
                      {current.title}
                    </h3>
                    {current.description && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--text-secondary)]">
                        {current.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    Kein Entwicklungsfokus festgelegt.
                  </p>
                )}
                {primary.kind === "unavailable" && (
                  <p role="status" className="text-sm text-[var(--text-muted)]">
                    Ausführbarkeit derzeit nicht verfügbar
                  </p>
                )}
              </div>

              {current && (
                <section
                  aria-label="Lernweg"
                  className="order-3 grid min-w-0 gap-3 border-t border-[var(--border-subtle)] pt-4"
                >
                  <h3 className="font-semibold">Lernweg</h3>
                  {activeSteps(current).length ? (
                    <ol className="grid min-w-0 gap-2">
                      {activeSteps(current).map((m, index, active) => (
                        <li key={m.id}>
                          {stepRow(current, m, index, active, "information")}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">
                      Noch keine Lernschritte
                    </p>
                  )}
                </section>
              )}
            </section>
            {reads.open.length > 0 && (
              <section
                aria-label="Üben & Anwenden"
                className="order-4 grid min-w-0 gap-2"
              >
                <SkillColumns
                  presentation="information"
                  information={
                    <>
                      <h2 className="text-base font-semibold">
                        Üben & Anwenden
                      </h2>
                      <p className="text-sm text-[var(--text-muted)]">
                        {reads.open.length} offene verknüpfte Aufgaben. Ein
                        Abschluss erzeugt keine Beobachtung.
                      </p>
                      {practiceRows(reads.open.slice(0, 4))}
                      {reads.open.length > 4 && (
                        <details>
                          <summary className="cursor-pointer py-2 text-sm text-[var(--accent-cyan)]">
                            Alle {reads.open.length} Aufgaben ansehen
                          </summary>
                          {practiceRows(reads.open.slice(4))}
                        </details>
                      )}
                    </>
                  }
                />
              </section>
            )}
            {!primary.empty && (
              <aside
                aria-label="Beobachtungen"
                className="order-5 grid min-w-0 content-start gap-4 border-t border-[var(--border-subtle)] pt-5"
              >
                <SkillColumns
                  presentation="information"
                  information={
                    <>
                      <h2 className="text-lg font-semibold">Beobachtungen</h2>{" "}
                      <dl className="grid gap-2 text-sm">
                        <div>
                          <dt className="text-[var(--text-muted)]">
                            Zuletzt geübt
                          </dt>
                          <dd>
                            {reads.latestLinkedTaskCompletionAt
                              ? new Date(
                                  reads.latestLinkedTaskCompletionAt,
                                ).toLocaleDateString("de-DE", {
                                  timeZone: read.timezone,
                                })
                              : "Noch kein datierter Aufgabenabschluss"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[var(--text-muted)]">
                            Letzte Beobachtung
                          </dt>
                          <dd>
                            {reads.latestEvidenceDate ??
                              "Noch keine datierte Beobachtung"}
                          </dd>
                        </div>
                      </dl>
                      {latestReview && (
                        <div className="grid gap-1 text-sm">
                          <p className="text-[var(--text-muted)]">
                            Letzte Überprüfung ·{" "}
                            {latestReview.reviewed_at.slice(0, 10)}
                          </p>
                          <p className="break-words">
                            {latestReview.subject_snapshot.title}
                          </p>
                          <p className="line-clamp-3 max-w-[70ch] whitespace-pre-wrap break-words text-[var(--text-secondary)]">
                            {latestReview.note}
                          </p>
                          <Link
                            href="#skill-history"
                            className="text-[var(--accent-cyan)] underline"
                          >
                            Entscheidung im Verlauf ansehen
                          </Link>
                        </div>
                      )}
                      {!orderedEvidence.length && (
                        <p className="text-sm text-[var(--text-muted)]">
                          Noch keine Beobachtung festgehalten.
                        </p>
                      )}
                    </>
                  }
                />
                {observations(orderedEvidence.slice(0, 2), "information")}
                {orderedEvidence.length > 2 && (
                  <details>
                    <summary className="cursor-pointer py-2 text-sm text-[var(--accent-cyan)]">
                      Alle {orderedEvidence.length} Beobachtungen ansehen
                    </summary>
                    {observations(orderedEvidence.slice(2), "information")}
                  </details>
                )}
              </aside>
            )}
          </div>
        </section>
        </div>
        <section
          aria-label="Vertiefung"
          className="grid min-w-0 gap-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] p-4 md:p-5"
        >
          <details>
            <summary className="cursor-pointer py-2 font-medium">
              Lernmaterial & Quellen
            </summary>{" "}
            <Panel title="Lernmaterial & Quellen">
              {data.relations
                .filter(
                  (r) => r.target_type === "skill" && r.target_id === s.id,
                )
                .map((r) => {
                  const resource = data.resources.find(
                    (x) => x.id === r.resource_id,
                  );
                  return resource ? (
                    <div key={r.id} className="grid gap-2">
                      <SkillColumns
                        information={
                          <>
                            <Link
                              className="break-words text-sm underline"
                              href={`/resources/${resource.id}`}
                            >
                              {resource.title} · Context
                              {resource.archived_at ? " · Archiviert" : ""}
                            </Link>
                          </>
                        }
                        actions={
                          <>
                            {!archived && (
                              <details>
                                <summary className="cursor-pointer py-2 text-sm">
                                  Quelle verwalten
                                </summary>
                                <OperationForm
                                  operation="resource.unlink"
                                  label={`Quelle lösen: ${resource.title}`}
                                >
                                  <input
                                    type="hidden"
                                    name="relationId"
                                    value={r.id}
                                  />
                                </OperationForm>
                              </details>
                            )}
                          </>
                        }
                      />
                    </div>
                  ) : null;
                })}
              <SkillColumns
                information={
                  <>
                    <p className="text-sm text-[var(--text-muted)]">
                      Material unterstützt das Lernen. Beobachtungen hältst du
                      ausdrücklich fest.
                    </p>
                  </>
                }
                actions={
                  <>
                    {!archived && (
                      <details>
                        <summary className="cursor-pointer py-2 text-sm">
                          Quelle verknüpfen
                        </summary>
                        <OperationForm
                          operation="resource.link"
                          label="Quelle mit Skill verknüpfen"
                        >
                          <input
                            type="hidden"
                            name="targetType"
                            value="skill"
                          />
                          <input type="hidden" name="targetId" value={s.id} />
                          <label>
                            Resource
                            <select
                              className={fieldClass}
                              aria-label="Resource"
                              name="resourceId"
                              required
                            >
                              <option value="">Resource wählen</option>
                              {data.resources
                                .filter(
                                  (r) =>
                                    !r.archived_at &&
                                    !data.relations.some(
                                      (l) =>
                                        l.target_type === "skill" &&
                                        l.target_id === s.id &&
                                        l.resource_id === r.id,
                                    ),
                                )
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.title}
                                  </option>
                                ))}
                            </select>
                          </label>
                        </OperationForm>
                      </details>
                    )}
                  </>
                }
              />
            </Panel>
          </details>
          <div id="skill-history" className="scroll-mt-6">
            {" "}
            <details>
              <summary className="cursor-pointer py-2 font-medium">
                Entwicklungsfokusse & Überprüfungen
              </summary>
              <div className="grid gap-4 pt-3">
                {read.targets.map(targetBlock)}
                <SkillColumns
                  information={null}
                  actions={
                    <>
                      {!archived && (
                        <SkillCommandForm
                          {...formProps}
                          operation="target.create"
                          label="Weiteren Fokus geplant speichern"
                        >
                          <Text name="title" label="Titel" required />
                          <Text
                            name="description"
                            label="Gewünschte Fähigkeit / Fokus"
                            large
                          />
                        </SkillCommandForm>
                      )}
                    </>
                  }
                />
                {read.reviews.map((r) => (
                  <article
                    key={r.id}
                    aria-label={`Überprüfung ${r.subject_snapshot.title}`}
                    className="grid gap-2 border-t border-[var(--border-subtle)] py-3"
                  >
                    <SkillColumns
                      information={
                        <>
                          <h3 className="font-medium">
                            {r.subject_snapshot.title} ·{" "}
                            {r.decision === "completed"
                              ? "Abgeschlossen"
                              : r.decision === "retired"
                                ? "Beendet"
                                : "Weiterentwickeln"}
                          </h3>
                          <p className="text-sm">
                            {r.reviewed_at.slice(0, 10)} · Bearbeitung {r.cycle}
                          </p>
                          <p className="whitespace-pre-wrap break-words text-sm">
                            {r.note}
                          </p>
                          <details>
                            <summary className="cursor-pointer py-2 text-sm">
                              Damals festgehaltenen Stand anzeigen
                            </summary>
                            <div className="grid gap-2 text-sm">
                              <p className="whitespace-pre-wrap break-words">
                                {r.subject_snapshot.description}
                              </p>
                              <p>Lernschritte bei der Überprüfung:</p>
                              {r.milestones_snapshot.length ? (
                                <ol>
                                  {r.milestones_snapshot.map((m) => (
                                    <li key={m.id}>
                                      {m.title} · {statusLabel[m.status]}
                                      {m.description && (
                                        <p className="whitespace-pre-wrap break-words text-[var(--text-muted)]">
                                          {m.description}
                                        </p>
                                      )}
                                    </li>
                                  ))}
                                </ol>
                              ) : (
                                <p>
                                  Keine aktiven Lernschritte bei der
                                  Überprüfung.
                                </p>
                              )}
                            </div>
                          </details>
                          <p className="text-sm">
                            {
                              read.review_evidence.filter(
                                (x) => x.review_id === r.id,
                              ).length
                            }{" "}
                            ausgewählte Beobachtungsversionen
                          </p>
                          {read.review_evidence
                            .filter((x) => x.review_id === r.id)
                            .map((x) => {
                              const v = read.revisions.find(
                                (v) =>
                                  v.evidence_id === x.evidence_id &&
                                  v.revision === x.evidence_revision,
                              );
                              return (
                                <p className="text-sm" key={x.evidence_id}>
                                  {v?.title ?? "Beobachtung nicht verfügbar"} ·{" "}
                                  {v?.evidence_date} · Version{" "}
                                  {x.evidence_revision}
                                </p>
                              );
                            })}
                          {read.amendments
                            .filter((a) => a.review_id === r.id)
                            .map((a) => (
                              <p className="text-sm" key={a.id}>
                                {a.kind === "clarification"
                                  ? "Ergänzung"
                                  : a.kind === "withdrawal"
                                    ? "Zurückgezogen"
                                    : "Irrtümlich"}{" "}
                                · {a.note}
                              </p>
                            ))}
                        </>
                      }
                      actions={
                        <>
                          <details>
                            <summary className="cursor-pointer py-2 text-sm">
                              Entscheidung ergänzen / korrigieren
                            </summary>
                            <SkillCommandForm
                              {...formProps}
                              operation="review.amend"
                              label="Ergänzung speichern"
                              payload={{ review_id: r.id }}
                            >
                              <label>
                                Art
                                <select
                                  aria-label="Art"
                                  name="kind"
                                  className={fieldClass}
                                >
                                  <option value="clarification">
                                    Ergänzung
                                  </option>
                                  <option value="withdrawal">
                                    Zurückziehen
                                  </option>
                                  <option value="mistaken">Irrtümlich</option>
                                </select>
                              </label>
                              <Text
                                name="note"
                                label="Begründung"
                                required
                                large
                              />
                              <p className="text-sm">
                                Ein aktuell referenzierter Abschluss wird dabei
                                atomisch wieder geöffnet.
                              </p>
                            </SkillCommandForm>
                          </details>
                        </>
                      }
                    />
                  </article>
                ))}
              </div>
            </details>
          </div>
          <div id="skill-connections" className="scroll-mt-6">
            <details>
              <summary className="cursor-pointer py-2 font-medium">
                Verknüpfte Aufgaben
              </summary>{" "}
              <Panel title="Verknüpfte Aufgaben">
                <p className="text-sm text-[var(--text-muted)]">
                  Aktuelle Aufgabenverbindungen; Aufgaben bleiben der
                  Arbeitsort.
                </p>
                {!reads.current.length ? (
                  <p>Keine verknüpften Aufgaben.</p>
                ) : (
                  reads.current.map((t) => (
                    <article
                      key={t.id}
                      className="grid gap-1 border-t border-[var(--border-subtle)] pt-3"
                    >
                      <SkillColumns
                        information={
                          <>
                            <Link
                              className="break-words font-medium"
                              href={`/tasks/${t.id}`}
                            >
                              {t.title}
                            </Link>
                            <p className="text-sm">
                              {t.status === "done"
                                ? `Abgeschlossen · ${t.completed_at ? new Date(t.completed_at).toLocaleDateString("de-DE", { timeZone: read.timezone }) : "Datum unbekannt"}`
                                : t.status === "canceled"
                                  ? "Abgebrochen"
                                  : t.status}
                              {t.completed_at && t.linked_at > t.completed_at
                                ? " · Nachträglich verknüpft"
                                : ""}
                            </p>
                            {t.project_id &&
                              data.projects.some(
                                (p) => p.id === t.project_id,
                              ) && (
                                <Link
                                  className="text-sm text-[var(--text-muted)]"
                                  href={`/projects/${t.project_id}`}
                                >
                                  Project ·{" "}
                                  {
                                    data.projects.find(
                                      (p) => p.id === t.project_id,
                                    )!.title
                                  }
                                </Link>
                              )}
                            {t.goal_id &&
                              data.goals.some((g) => g.id === t.goal_id) && (
                                <Link
                                  className="text-sm text-[var(--text-muted)]"
                                  href={`/goals/${t.goal_id}`}
                                >
                                  Goal ·{" "}
                                  {
                                    data.goals.find((g) => g.id === t.goal_id)!
                                      .title
                                  }
                                </Link>
                              )}
                            {!["done", "canceled"].includes(t.status) && (
                              <p className="text-sm">
                                {
                                  skillTaskReadiness(
                                    data.dependencyGraph,
                                    t.id,
                                    data.dependencyUnavailable === true,
                                  ).label
                                }
                              </p>
                            )}
                          </>
                        }
                        actions={
                          <>
                            {!archived && (
                              <OperationForm
                                operation="skill.unlink"
                                label={`Verbindung entfernen: ${t.title}`}
                              >
                                <input
                                  type="hidden"
                                  name="skillId"
                                  value={s.id}
                                />
                                <input
                                  type="hidden"
                                  aria-label="Task"
                                  name="taskId"
                                  value={t.id}
                                />
                              </OperationForm>
                            )}
                          </>
                        }
                      />
                    </article>
                  ))
                )}
                <SkillColumns
                  information={null}
                  actions={
                    <>
                      {!archived && !current && (
                        <Link
                          className="text-sm underline"
                          href={`/tasks/new?skill=${s.id}`}
                        >
                          Task anlegen
                        </Link>
                      )}
                      {!archived && (
                        <details>
                          <summary className="cursor-pointer py-2 text-sm">
                            Aufgabe verknüpfen
                          </summary>
                          <OperationForm
                            operation="skill.link"
                            label="Aufgabe mit Skill verknüpfen"
                          >
                            <input type="hidden" name="skillId" value={s.id} />
                            <label>
                              Task
                              <select
                                className={fieldClass}
                                aria-label="Task"
                                name="taskId"
                                required
                              >
                                <option value="">Task wählen</option>
                                {data.tasks
                                  .filter(
                                    (t) =>
                                      !t.archived_at &&
                                      t.status !== "archived" &&
                                      !read.practice.some((x) => x.id === t.id),
                                  )
                                  .map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.title}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          </OperationForm>
                        </details>
                      )}
                    </>
                  }
                />
              </Panel>
            </details>
          </div>
          <details>
            <summary className="cursor-pointer py-2 font-medium">
              Änderungen an Beobachtungen
            </summary>
            <div className="grid gap-3 pt-3">
              {read.revisions.map((v) => (
                <article
                  key={`${v.evidence_id}:${v.revision}`}
                  className="grid gap-1 border-t border-[var(--border-subtle)] pt-3"
                >
                  <h3 className="break-words text-sm font-medium">
                    {v.title} · Version {v.revision}
                  </h3>
                  <p className="text-xs">
                    {v.operation} · {v.recorded_at.slice(0, 10)} · Beobachtung{" "}
                    {v.evidence_date}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {v.note}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {v.provenance_state === "legacy_unverified"
                      ? "Legacy: Quelle damals nicht verifiziert"
                      : `Erfasste Quelle: ${typeof v.source_snapshot?.title === "string" ? v.source_snapshot.title : v.source_type === "manual_note" ? "Eigene Beobachtung" : v.source_type}`}
                  </p>
                  {v.reason && <p className="text-sm">{v.reason}</p>}
                </article>
              ))}
              <SkillColumns
                information={null}
                actions={
                  <>
                    {!archived &&
                      read.evidence
                        .filter((e) => e.withdrawn_at)
                        .map((e) => (
                          <SkillCommandForm
                            key={e.id}
                            {...formProps}
                            operation="evidence.restore"
                            label={`Beobachtung wiederherstellen: ${e.title}`}
                            payload={{ evidence_id: e.id }}
                          >
                            <Text
                              name="reason"
                              label="Begründung"
                              required
                              large
                            />
                          </SkillCommandForm>
                        ))}
                  </>
                }
              />
            </div>
          </details>
        </section>
      </div>
    </SkillDisclosureBoundary>
  );
}
