import Link from "next/link";
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
import { fieldClass, OperationForm } from "./forms";
import { taskDependencyContext } from "@/features/real-data/domain/task-dependencies";
const statusLabel = {
  planned: "Geplant",
  current: "Aktuell",
  completed: "Abgeschlossen",
  retired: "Beendet",
};
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
      <Text name="summary" label="Warum / gewünschte Fähigkeit" large />
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
        Evidence-Quelle
        <select
          aria-label="Evidence-Quelle"
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
          {m ? "Lernschritt reviewen" : "Target reviewen"}
        </summary>
        <SkillCommandForm
          {...formProps}
          operation="review.submit"
          label={m ? "Lernschritt Review" : "Target Review"}
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
            <legend className="text-sm">Evidence auswählen (optional)</legend>
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
  function targetBlock(t: DevelopmentTarget) {
    const milestones = read.milestones.filter((m) => m.target_id === t.id);
    const active = milestones.filter((m) => !m.archived_at);
    const terminal = ["completed", "retired"].includes(t.status);
    return (
      <article
        key={t.id}
        data-target={t.id}
        className="grid min-w-0 gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4"
      >
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
        {!archived && !t.archived_at && !terminal && t.status !== "current" && (
          <SkillCommandForm
            {...formProps}
            operation="target.current"
            payload={{ target_id: t.id }}
            label="Als aktuellen Fokus wählen"
          />
        )}
        {active.map((m, index) => (
          <article
            key={m.id}
            aria-label={`Lernschritt ${m.title}`}
            className="grid gap-2 border-t border-[var(--border-subtle)] pt-3"
          >
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
                          .toSpliced(index - 1, 2, m.id, active[index - 1].id),
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
          </article>
        ))}
        {!archived && !t.archived_at && !terminal && (
          <>
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
            {reviewForm(t)}
          </>
        )}
        {!archived && (
          <details>
            <summary className="cursor-pointer py-2 text-sm">
              Target verwalten
            </summary>
            <div className="grid gap-3">
              {t.archived_at ? (
                <SkillCommandForm
                  {...formProps}
                  operation="target.restore"
                  label="Target wiederherstellen"
                  payload={{ target_id: t.id }}
                />
              ) : (
                <>
                  {!terminal && (
                    <SkillCommandForm
                      {...formProps}
                      operation="target.edit"
                      label="Target speichern"
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
                      label="Target wieder öffnen"
                      payload={{ target_id: t.id }}
                    />
                  )}
                  <SkillCommandForm
                    {...formProps}
                    operation="target.archive"
                    label="Target archivieren"
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
      </article>
    );
  }
  return (
    <div
      data-skill-development
      className="mx-auto grid w-full max-w-[1600px] min-w-0 gap-6 px-2 pb-10 md:px-6"
    >
      <header className="grid gap-3 border-b border-[var(--border-subtle)] pb-5">
        <Link
          className="text-sm text-[var(--text-muted)]"
          href="/portfolio?view=skills"
        >
          Portfolio / Skills
        </Link>
        <h1 className="break-words text-3xl font-semibold">{s.name}</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {archived
            ? "Archiviert"
            : s.status === "paused"
              ? "Pausiert"
              : "Aktiv"}
          {s.area_id &&
            ` · ${data.areas.find((a) => a.id === s.area_id)?.name ?? "Area nicht verfügbar"}`}
        </p>
        {s.summary && (
          <p className="max-w-3xl whitespace-pre-wrap break-words">
            {s.summary}
          </p>
        )}
      </header>
      <div className="grid min-w-0 items-start gap-8 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-6">
          <Panel title="Aktueller Entwicklungsfokus">
            {current ? (
              targetBlock(current)
            ) : (
              <>
                <p>Kein aktueller Entwicklungsfokus.</p>
                {!archived && (
                  <details open={!read.targets.length}>
                    <summary className="cursor-pointer py-2 font-medium">
                      Entwicklungsfokus festlegen
                    </summary>
                    <SkillCommandForm
                      {...formProps}
                      operation="target.create"
                      label="Development Target erstellen"
                    >
                      <Text name="title" label="Titel" required />
                      <Text
                        name="description"
                        label="Gewünschte Fähigkeit / Fokus"
                        large
                      />
                    </SkillCommandForm>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Der neue Fokus startet geplant. Wähle ihn anschließend
                      bewusst als aktuell.
                    </p>
                  </details>
                )}
              </>
            )}
          </Panel>
          {current && !archived && (
            <section aria-label="Nächste Aktion" className="grid gap-2">
              <h2 className="text-lg font-semibold">Nächste Aktion</h2>
              <p className="text-sm">
                {read.milestones.find(
                  (m) =>
                    m.target_id === current.id &&
                    m.status === "current" &&
                    !m.archived_at,
                )?.title ?? current.title}
              </p>
              <Link
                className="w-fit min-h-10 rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-semibold"
                href="/tasks/new"
              >
                Practice-Task anlegen
              </Link>
              <p className="text-sm text-[var(--text-muted)]">
                Ordne den Task anschließend hier dem Skill zu. Ein Abschluss
                erzeugt keine Evidence.
              </p>
            </section>
          )}
          <Panel title="Practice & Anwendung">
            <p className="text-sm text-[var(--text-muted)]">
              Aktuell verknüpfte Tasks; kein Kompetenznachweis und keine
              Übungshistorie.
            </p>
            {!reads.current.length ? (
              <p>Keine verknüpften Practice/Application-Tasks.</p>
            ) : (
              reads.current.map((t) => (
                <article
                  key={t.id}
                  className="grid gap-1 border-t border-[var(--border-subtle)] pt-3"
                >
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
                    data.projects.some((p) => p.id === t.project_id) && (
                      <Link
                        className="text-sm text-[var(--text-muted)]"
                        href={`/projects/${t.project_id}`}
                      >
                        Project ·{" "}
                        {
                          data.projects.find((p) => p.id === t.project_id)!
                            .title
                        }
                      </Link>
                    )}
                  {t.goal_id && data.goals.some((g) => g.id === t.goal_id) && (
                    <Link
                      className="text-sm text-[var(--text-muted)]"
                      href={`/goals/${t.goal_id}`}
                    >
                      Goal · {data.goals.find((g) => g.id === t.goal_id)!.title}
                    </Link>
                  )}
                  {!["done", "canceled"].includes(t.status) && (
                    <p className="text-sm">
                      {
                        taskDependencyContext(data.dependencyGraph, t.id)
                          .availability
                      }
                    </p>
                  )}
                  {!archived && (
                    <OperationForm
                      operation="skill.unlink"
                      label={`Verbindung entfernen: ${t.title}`}
                    >
                      <input type="hidden" name="skillId" value={s.id} />
                      <input
                        type="hidden"
                        aria-label="Task"
                        name="taskId"
                        value={t.id}
                      />
                    </OperationForm>
                  )}
                </article>
              ))
            )}
            {!archived && !current && (
              <Link className="text-sm underline" href="/tasks/new">
                Task anlegen
              </Link>
            )}
            {!archived && (
              <details>
                <summary className="cursor-pointer py-2 text-sm">
                  Task verknüpfen
                </summary>
                <OperationForm
                  operation="skill.link"
                  label="Task mit Skill verknüpfen"
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
          </Panel>
          <details>
            <summary className="cursor-pointer py-2 font-medium">
              Weitere Targets & Verlauf
            </summary>
            <div className="grid gap-4 pt-3">
              {read.targets
                .filter((t) => t.id !== current?.id)
                .map(targetBlock)}
              {current && !archived && (
                <SkillCommandForm
                  {...formProps}
                  operation="target.create"
                  label="Weiteres Target erstellen"
                >
                  <Text name="title" label="Titel" required />
                  <Text
                    name="description"
                    label="Gewünschte Fähigkeit / Fokus"
                    large
                  />
                </SkillCommandForm>
              )}
              {read.reviews.map((r) => (
                <article
                  key={r.id}
                  aria-label={`Review ${r.subject_snapshot.title}`}
                  className="grid gap-2 border-t border-[var(--border-subtle)] py-3"
                >
                  <h3 className="font-medium">
                    {r.subject_snapshot.title} · {r.decision}
                  </h3>
                  <p className="text-sm">
                    {r.reviewed_at.slice(0, 10)} · Cycle {r.cycle}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {r.note}
                  </p>
                  <details>
                    <summary className="cursor-pointer py-2 text-sm">
                      Review-Snapshot anzeigen
                    </summary>
                    <div className="grid gap-2 text-sm">
                      <p className="whitespace-pre-wrap break-words">
                        {r.subject_snapshot.description}
                      </p>
                      <p>Lernschritte beim Review:</p>
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
                        <p>Keine aktiven Lernschritte beim Review.</p>
                      )}
                    </div>
                  </details>
                  <p className="text-sm">
                    {
                      read.review_evidence.filter((x) => x.review_id === r.id)
                        .length
                    }{" "}
                    ausgewählte Evidence-Versionen
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
                          {v?.title ?? "Evidence nicht verfügbar"} ·{" "}
                          {v?.evidence_date} · Version {x.evidence_revision}
                        </p>
                      );
                    })}
                  {read.amendments
                    .filter((a) => a.review_id === r.id)
                    .map((a) => (
                      <p className="text-sm" key={a.id}>
                        {a.kind} · {a.note}
                      </p>
                    ))}
                  <details>
                    <summary className="cursor-pointer py-2 text-sm">
                      Review ergänzen / korrigieren
                    </summary>
                    <SkillCommandForm
                      {...formProps}
                      operation="review.amend"
                      label="Review-Amendment speichern"
                      payload={{ review_id: r.id }}
                    >
                      <label>
                        Art
                        <select
                          aria-label="Art"
                          name="kind"
                          className={fieldClass}
                        >
                          <option value="clarification">Ergänzung</option>
                          <option value="withdrawal">Zurückziehen</option>
                          <option value="mistaken">Irrtümlich</option>
                        </select>
                      </label>
                      <Text name="note" label="Begründung" required large />
                      <p className="text-sm">
                        Ein aktuell referenzierter Abschluss wird dabei atomisch
                        wieder geöffnet.
                      </p>
                    </SkillCommandForm>
                  </details>
                </article>
              ))}
            </div>
          </details>
        </div>
        <aside className="grid min-w-0 gap-6">
          <Panel title="Evidence & Recency">
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">
                  Letzter verknüpfter Task-Abschluss
                </dt>
                <dd>
                  {reads.latestLinkedTaskCompletionAt
                    ? new Date(
                        reads.latestLinkedTaskCompletionAt,
                      ).toLocaleDateString("de-DE", { timeZone: read.timezone })
                    : "Kein gültiger Completion-Zeitpunkt"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Letzte Evidence</dt>
                <dd>
                  {reads.latestEvidenceDate ??
                    "Keine datierte aktuelle Evidence"}
                </dd>
              </div>
            </dl>
            {!reads.currentEvidence.length && (
              <p>Keine aktuelle Skill Evidence.</p>
            )}
            {reads.currentEvidence.map((e) => (
              <article
                key={e.id}
                aria-label={`Evidence ${e.title}`}
                className="grid gap-2 border-t border-[var(--border-subtle)] pt-3"
              >
                <h3 className="break-words font-medium">{e.title}</h3>
                <p className="text-sm">
                  {e.evidence_date} · Version {e.revision}
                  {e.evidence_date > reads.today
                    ? " · Zukünftiges Legacy-Datum (keine Recency)"
                    : ""}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {e.note}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {e.provenance_state === "legacy_unverified"
                    ? "Legacy: ursprüngliche Provenance nicht rekonstruierbar"
                    : "Explizite Beobachtung mit erfasster Provenance"}
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
                {!archived && (
                  <details>
                    <summary className="cursor-pointer py-2 text-sm">
                      Evidence korrigieren / zurückziehen
                    </summary>
                    <div className="grid gap-3">
                      <SkillCommandForm
                        {...formProps}
                        operation="evidence.correct"
                        label="Evidence-Korrektur speichern"
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
                        label="Evidence zurückziehen"
                        payload={{ evidence_id: e.id }}
                      >
                        <Text name="reason" label="Begründung" required large />
                      </SkillCommandForm>
                    </div>
                  </details>
                )}
              </article>
            ))}
            {!archived && (
              <details>
                <summary className="cursor-pointer py-2 text-sm">
                  Evidence hinzufügen
                </summary>
                <SkillCommandForm
                  {...formProps}
                  operation="evidence.create"
                  label="Evidence hinzufügen"
                >
                  {evidenceFields()}
                </SkillCommandForm>
              </details>
            )}
          </Panel>
          <details>
            <summary className="cursor-pointer py-2 font-medium">
              Evidence-History
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
                    {v.operation} · {v.recorded_at.slice(0, 10)} · Evidence{" "}
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
              {!archived &&
                read.evidence
                  .filter((e) => e.withdrawn_at)
                  .map((e) => (
                    <SkillCommandForm
                      key={e.id}
                      {...formProps}
                      operation="evidence.restore"
                      label={`Evidence wiederherstellen: ${e.title}`}
                      payload={{ evidence_id: e.id }}
                    >
                      <Text name="reason" label="Begründung" required large />
                    </SkillCommandForm>
                  ))}
            </div>
          </details>
          <Panel title="Lernmaterial & References">
            {data.relations
              .filter((r) => r.target_type === "skill" && r.target_id === s.id)
              .map((r) => {
                const resource = data.resources.find(
                  (x) => x.id === r.resource_id,
                );
                return resource ? (
                  <div key={r.id} className="grid gap-2">
                    <Link
                      className="break-words text-sm underline"
                      href={`/resources/${resource.id}`}
                    >
                      {resource.title} · Context
                      {resource.archived_at ? " · Archiviert" : ""}
                    </Link>
                    {!archived && (
                      <details>
                        <summary className="cursor-pointer py-2 text-sm">
                          Reference verwalten
                        </summary>
                        <OperationForm
                          operation="resource.unlink"
                          label={`Reference lösen: ${resource.title}`}
                        >
                          <input type="hidden" name="relationId" value={r.id} />
                        </OperationForm>
                      </details>
                    )}
                  </div>
                ) : null;
              })}
            <p className="text-sm text-[var(--text-muted)]">
              Resources bleiben Referenzen und erzeugen keine Evidence.
            </p>
            {!archived && (
              <details>
                <summary className="cursor-pointer py-2 text-sm">
                  Reference verknüpfen
                </summary>
                <OperationForm
                  operation="resource.link"
                  label="Reference mit Skill verknüpfen"
                >
                  <input type="hidden" name="targetType" value="skill" />
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
          </Panel>
          <details>
            <summary className="cursor-pointer py-2 font-medium">
              Skill verwalten
            </summary>
            <div className="grid gap-4 pt-3">
              {archived ? (
                <SkillCommandForm
                  {...formProps}
                  operation="skill.restore"
                  label="Skill wieder öffnen"
                />
              ) : (
                <>
                  <SkillCommandForm
                    {...formProps}
                    operation="skill.edit"
                    label="Skill speichern"
                  >
                    <Text name="name" label="Name" value={s.name} required />
                    <Text
                      name="summary"
                      label="Warum / gewünschte Fähigkeit"
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
        </aside>
      </div>
    </div>
  );
}
