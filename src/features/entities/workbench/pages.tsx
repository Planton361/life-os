import { ExternalResourceLink } from "@/features/resources/external-resource-link";
import { taskTextFields } from "./task-text";
import { taskStepProgress } from "./task-step-progress";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  readEntityWorkbench,
  type WorkbenchData,
} from "@/features/real-data/supabase/repositories/entity-workbench-read";
import {
  EntityForm,
  OperationForm,
  Choice,
  actionClass,
  fieldClass,
} from "./forms";
import {
  entityRoutes,
  entityLabels,
  type WorkbenchKind,
  type FieldValues,
} from "./types";
import type { ReactNode } from "react";

export function EntityWorkbenchShell({
  kind,
  title,
  children,
}: {
  kind: WorkbenchKind;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      data-entity-workbench={kind}
      className="mx-auto grid w-full max-w-[1600px] gap-6 px-2 pb-10 md:px-6"
    >
      <header className="grid gap-3 border-b border-[var(--border-subtle)] pb-5">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap gap-3 text-sm text-[var(--text-muted)]"
        >
          <Link href={kind === "resource" ? "/resources" : "/portfolio"}>
            {kind === "resource" ? "Knowledge" : "Portfolio"}
          </Link>
          <span>/</span>
          <Link
            href={
              kind === "resource" ? "/resources" : `/portfolio?type=${kind}s`
            }
          >
            {entityLabels[kind]}s
          </Link>
        </nav>
        <h1 className="text-3xl font-semibold">{title}</h1>
      </header>
      {children}
    </div>
  );
}
function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="grid content-start gap-4 rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,36,.6)] p-5"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function collection(data: WorkbenchData, kind: WorkbenchKind) {
  return kind === "skill"
    ? data.skills.map((s) => ({ ...s, title: s.name }))
    : data[`${kind}s` as "tasks" | "projects" | "goals" | "resources"];
}
function titleFor(data: WorkbenchData, kind: WorkbenchKind, id: string) {
  return (
    collection(data, kind).find((r) => r.id === id)?.title ??
    "Nicht mehr verfügbar"
  );
}
function available(
  data: WorkbenchData,
  kind: WorkbenchKind,
  current?: string | null,
) {
  return collection(data, kind)
    .filter((r) => !r.archived_at || r.id === current)
    .map((r) => ({
      id: r.id,
      title: r.title + (r.archived_at ? " (archiviert)" : ""),
    }));
}
const authMessage = (
  <p role="status">
    Diese Entity-Surface benötigt das Manual-Profil und eine lokale Anmeldung.
  </p>
);
export async function WorkbenchList({
  kind,
  searchParams = {},
}: {
  kind: WorkbenchKind;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const data = await readEntityWorkbench();
  if (!data)
    return (
      <EntityWorkbenchShell kind={kind} title={`${entityLabels[kind]}s`}>
        {authMessage}
      </EntityWorkbenchShell>
    );
  const q = String(searchParams.q ?? "").toLocaleLowerCase();
  const archived = searchParams.state === "archived";
  const sort = String(searchParams.sort ?? "recent");
  const rows = collection(data, kind)
    .filter(
      (r) =>
        Boolean(r.archived_at) === archived &&
        `${r.title} ${"description" in r ? r.description : "summary" in r ? r.summary : ""}`
          .toLocaleLowerCase()
          .includes(q),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : b.created_at.localeCompare(a.created_at),
    );
  return (
    <EntityWorkbenchShell
      kind={kind}
      title={`${entityLabels[kind]}s · ${rows.length}`}
    >
      <div>
        <Link
          className={actionClass}
          prefetch={false}
          href={`${entityRoutes[kind]}/new`}
        >
          {entityLabels[kind]} erstellen
        </Link>
      </div>
      <form className="grid gap-3 md:grid-cols-[1fr_200px_200px_auto]">
        <label>
          Suche
          <input
            className={fieldClass}
            name="q"
            defaultValue={String(searchParams.q ?? "")}
          />
        </label>
        <label>
          Lifecycle
          <select
            className={fieldClass}
            name="state"
            defaultValue={archived ? "archived" : "active"}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          Sortierung
          <select name="sort" className={fieldClass} defaultValue={sort}>
            <option value="recent">Zuletzt erstellt</option>
            <option value="title">Titel A–Z</option>
          </select>
        </label>
        <button className={actionClass}>Anwenden</button>
      </form>
      <section aria-label="Entity-Liste" className="grid gap-2">
        {rows.map((r) => (
          <Link
            className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle)] p-4 hover:border-[var(--focus-ring)]"
            href={`${entityRoutes[kind]}/${r.id}`}
            key={r.id}
          >
            <strong>{r.title}</strong>
            <span className="text-sm text-[var(--text-muted)]">
              {r.archived_at
                ? "archived"
                : "status" in r
                  ? r.status
                  : entityLabels[kind]}
            </span>
          </Link>
        ))}
        {!rows.length && <p>Keine passenden Einträge.</p>}
      </section>
    </EntityWorkbenchShell>
  );
}
export async function WorkbenchEditor({
  kind,
  id,
  projectContext,
}: {
  kind: WorkbenchKind;
  id?: string;
  projectContext?: string;
}) {
  if (id && !z.uuid().safeParse(id).success) notFound();
  const data = await readEntityWorkbench();
  if (!data)
    return (
      <EntityWorkbenchShell kind={kind} title={entityLabels[kind]}>
        {authMessage}
      </EntityWorkbenchShell>
    );
  const contextProject =
    kind === "resource" && projectContext
      ? data.projects.find((p) => p.id === projectContext && !p.archived_at)
      : undefined;
  const row = id ? collection(data, kind).find((r) => r.id === id) : undefined;
  if (id && !row) notFound();
  const source =
    kind === "task"
      ? data.scheduleSources.find((s) => s.task_id === id)
      : undefined;
  const sourceHref =
    source?.source_type === "meal"
      ? "/nutrition/meal-planner"
      : source?.source_type === "review"
        ? `/review/${row?.title.startsWith("Weekly") ? "weekly" : "daily"}`
        : source?.source_type === "strength_plan"
          ? "/health/strength"
          : "/health/running";
  const values: FieldValues = {
    priority: "none",
    status:
      kind === "project"
        ? "idea"
        : kind === "goal"
          ? "draft"
          : kind === "skill"
            ? "active"
            : "planned",
    type: "note",
    horizon: "someday",
  };
  if (row) {
    Object.assign(values, row);
    values.areaId = row.area_id;
    if ("description" in row) values.description = row.description;
    if ("summary" in row) {
      values.summary = row.summary;
      values.body = row.summary;
    }
    if ("name" in row) values.name = row.name;
    if (kind === "task") {
      const t = data.tasks.find((t) => t.id === id)!;
      const text = taskTextFields(t.description);
      Object.assign(values, {
        description: text.description,
        nextAction: text.nextAction,
        projectId: t.project_id,
        goalId: t.goal_id,
        durationMinutes: t.duration_minutes,
        plannedDate: t.planned_date,
        dueAt: t.due_at?.slice(0, 10),
      });
    }
    if (kind === "project") {
      const p = data.projects.find((p) => p.id === id)!;
      Object.assign(values, {
        goalId: p.goal_id,
        nextStep: p.next_step,
        deadline: p.target_date?.slice(0, 10),
      });
    }
    if (kind === "goal")
      values.targetDate = data.goals
        .find((g) => g.id === id)!
        .target_date?.slice(0, 10);
  }
  return (
    <EntityWorkbenchShell
      kind={kind}
      title={row?.title ?? `${entityLabels[kind]} erstellen`}
    >
      {contextProject && (
        <p className="text-sm text-[var(--text-muted)]">
          Project:{" "}
          <Link href={`/projects/${contextProject.id}`}>
            {contextProject.title}
          </Link>
          {!id &&
            " · Erst Resource erstellen, dann die Project-Verknüpfung bestätigen."}
        </p>
      )}
      {kind === "resource" && row && "url" in row && (
        <ExternalResourceLink url={row.url} title={row.title} />
      )}
      {row && (
        <p className="text-sm text-[var(--text-muted)]">
          {row.archived_at
            ? "Archiviert · historische Ansicht"
            : "status" in row
              ? row.status
              : "Resource"}{" "}
          · Erstellt {row.created_at.slice(0, 10)}
        </p>
      )}
      {kind === "task" &&
        id &&
        data.tasks.find((t) => t.id === id)?.scheduled_start_at && (
          <p className="text-sm text-[var(--text-muted)]">
            Terminiert:{" "}
            {new Intl.DateTimeFormat("de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: data.timezone,
            }).format(
              new Date(
                data.tasks.find((t) => t.id === id)!.scheduled_start_at!,
              ),
            )}{" "}
            · <Link href="/calendar">Calendar öffnen</Link>
          </p>
        )}
      <div
        className={`grid gap-6 ${id ? "xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]" : "mx-auto w-full max-w-[1000px]"}`}
      >
        <Block title={id ? "Informationen bearbeiten" : "Bewusst erstellen"}>
          <EntityForm
            kind={kind}
            id={id}
            values={values}
            projectContext={contextProject?.id}
            areas={data.areas
              .filter((a) => !a.archived_at || a.id === row?.area_id)
              .map((a) => ({
                id: a.id,
                title: a.name + (a.archived_at ? " (archiviert)" : ""),
              }))}
            projects={available(
              data,
              "project",
              String(values.projectId ?? ""),
            )}
            goals={available(data, "goal", String(values.goalId ?? ""))}
            archived={Boolean(row?.archived_at)}
            sourceOwned={Boolean(source)}
          />
        </Block>
        {id && row && (
          <aside className="grid content-start gap-5">
            <Relations
              kind={kind}
              id={id}
              data={data}
              archived={Boolean(row.archived_at)}
              projectContext={contextProject?.id}
            />
            <Progress kind={kind} id={id} data={data} />
            <Block title="Lifecycle">
              {source ? (
                <>
                  <p>Planung und Lifecycle gehören zur verknüpften Quelle.</p>
                  <Link className="text-[var(--accent-cyan)]" href={sourceHref}>
                    Quelle öffnen
                  </Link>
                </>
              ) : row.archived_at ? (
                kind === "resource" ? (
                  <OperationForm
                    operation="resource.restore"
                    label="Resource wiederherstellen"
                  >
                    <Hidden name="resourceId" value={id} />
                  </OperationForm>
                ) : (
                  <p>Archiviert. Historische Beziehungen bleiben erhalten.</p>
                )
              ) : (
                <>
                  {kind === "task" && (
                    <>
                      <Link
                        href="/calendar"
                        className="text-[var(--accent-cyan)]"
                      >
                        Im Calendar planen
                      </Link>
                      <OperationForm
                        operation={
                          values.status === "done"
                            ? "task.reopen"
                            : "task.complete"
                        }
                        label={
                          values.status === "done"
                            ? "Task wieder öffnen"
                            : "Task abschließen"
                        }
                      >
                        <Hidden name="taskId" value={id} />
                      </OperationForm>
                    </>
                  )}
                  <OperationForm
                    operation={`${kind}.archive`}
                    label={`${entityLabels[kind]} archivieren`}
                  >
                    <Hidden name={`${kind}Id`} value={id} />
                  </OperationForm>
                </>
              )}
            </Block>
          </aside>
        )}
      </div>
    </EntityWorkbenchShell>
  );
}
function Relations({
  kind,
  id,
  data,
  archived,
  projectContext,
}: {
  projectContext?: string;
  kind: WorkbenchKind;
  id: string;
  data: WorkbenchData;
  archived: boolean;
}) {
  const links = data.relations
    .filter((r) =>
      ["task", "project", "goal", "skill", "resource"].includes(r.target_type),
    )
    .filter((r) =>
      kind === "resource"
        ? r.resource_id === id
        : r.target_type === kind && r.target_id === id,
    );
  const targets = (
    ["task", "project", "goal", "skill", "resource"] as const
  ).flatMap((k) =>
    available(data, k)
      .filter((r) => r.id !== id)
      .map((r) => ({ ...r, type: k })),
  );
  const taskLinks = data.taskSkills.filter((r) =>
    kind === "task" ? r.task_id === id : kind === "skill" && r.skill_id === id,
  );
  const tasks = data.tasks
    .filter((t) => !t.archived_at)
    .filter((t) =>
      kind === "project"
        ? t.project_id === id
        : kind === "goal"
          ? t.goal_id === id
          : false,
    );
  const projects =
    kind === "goal" ? data.projects.filter((p) => p.goal_id === id) : [];
  const ownTask =
    kind === "task" ? data.tasks.find((t) => t.id === id) : undefined;
  const ownProject =
    kind === "project" ? data.projects.find((p) => p.id === id) : undefined;
  const inheritedGoal = ownTask?.project_id
    ? data.projects.find((p) => p.id === ownTask.project_id)?.goal_id
    : null;
  return (
    <Block title="Beziehungen">
      {inheritedGoal && (
        <p className="text-sm">
          Über Project:{" "}
          <Link href={`/goals/${inheritedGoal}`}>
            {titleFor(data, "goal", inheritedGoal)}
          </Link>
          {ownTask?.goal_id && ownTask.goal_id !== inheritedGoal && (
            <span className="text-[var(--accent-orange)]">
              {" "}
              · Bestehender Goal-Konflikt; direkte Zuordnung bewusst prüfen.
            </span>
          )}
        </p>
      )}
      {ownTask?.project_id && (
        <Link href={`/projects/${ownTask.project_id}`}>
          Project · {titleFor(data, "project", ownTask.project_id)}
        </Link>
      )}
      {(ownTask?.goal_id || ownProject?.goal_id) && (
        <Link href={`/goals/${ownTask?.goal_id || ownProject?.goal_id}`}>
          Goal ·{" "}
          {titleFor(data, "goal", (ownTask?.goal_id || ownProject?.goal_id)!)}
        </Link>
      )}

      {kind === "project" && !archived && (
        <Link className={actionClass} href={`/resources/new?project=${id}`}>
          Resource / externe Referenz erstellen
        </Link>
      )}
      {links.map((r) => (
        <div
          className="grid gap-2 border-b border-[var(--border-subtle)] pb-3"
          key={r.id}
          data-resource-relation={r.resource_id}
        >
          <Link
            className="text-[var(--accent-cyan)]"
            href={
              kind === "resource"
                ? `${entityRoutes[r.target_type as WorkbenchKind]}/${r.target_id}`
                : `/resources/${r.resource_id}`
            }
          >
            {kind === "resource"
              ? titleFor(data, r.target_type as WorkbenchKind, r.target_id)
              : titleFor(data, "resource", r.resource_id)}{" "}
            · {r.relation_type}
          </Link>
          {kind !== "resource" &&
            (() => {
              const resource = data.resources.find(
                (item) => item.id === r.resource_id,
              );
              return resource ? (
                <>
                  <p className="text-sm text-[var(--text-muted)]">
                    {resource.type}
                    {resource.archived_at ? " · archiviert" : ""}
                    {resource.url ? " · Externe Referenz" : ""}
                  </p>
                  {resource.summary && (
                    <p className="line-clamp-3 break-words text-sm">
                      {resource.summary}
                    </p>
                  )}
                  <ExternalResourceLink
                    url={resource.url}
                    title={resource.title}
                  />
                </>
              ) : null;
            })()}
          {!archived && (
            <OperationForm
              operation="resource.unlink"
              label="Resource-Verknüpfung lösen"
            >
              <Hidden name="relationId" value={r.id} />
            </OperationForm>
          )}
        </div>
      ))}
      {!archived &&
        (kind === "resource" ? (
          <ResourceTargetForm
            id={id}
            targets={targets}
            projectContext={projectContext}
          />
        ) : (
          <OperationForm operation="resource.link" label="Resource verknüpfen">
            <Hidden name="targetId" value={id} />
            <Hidden name="targetType" value={kind} />
            <Choice
              name="resourceId"
              label="Resource"
              options={available(data, "resource")}
              required
            />
          </OperationForm>
        ))}
      {taskLinks.map((l) => (
        <div className="grid gap-2" key={l.id}>
          <Link
            href={
              kind === "task" ? `/skills/${l.skill_id}` : `/tasks/${l.task_id}`
            }
          >
            {kind === "task"
              ? titleFor(data, "skill", l.skill_id)
              : titleFor(data, "task", l.task_id)}{" "}
            · Practice
          </Link>
          {!archived && (
            <OperationForm
              operation="skill.unlink"
              label="Practice-Verknüpfung lösen"
            >
              <Hidden name="taskId" value={l.task_id} />
              <Hidden name="skillId" value={l.skill_id} />
            </OperationForm>
          )}
        </div>
      ))}
      {!archived && (kind === "task" || kind === "skill") && (
        <OperationForm operation="skill.link" label="Practice verknüpfen">
          <Hidden name={kind === "task" ? "taskId" : "skillId"} value={id} />
          <Choice
            name={kind === "task" ? "skillId" : "taskId"}
            label={kind === "task" ? "Skill" : "Task"}
            options={available(data, kind === "task" ? "skill" : "task")}
            required
          />
        </OperationForm>
      )}
      {tasks.map((t) => (
        <div className="grid gap-2" key={t.id}>
          <Link href={`/tasks/${t.id}`}>
            {t.title} · {t.status}
          </Link>
          {!archived && (
            <OperationForm
              operation="task.context"
              label="Task-Zuordnung lösen"
            >
              <Hidden name="taskId" value={t.id} />
              <Hidden
                name={kind === "project" ? "projectId" : "goalId"}
                value=""
              />
            </OperationForm>
          )}
        </div>
      ))}
      {!archived && (kind === "project" || kind === "goal") && (
        <OperationForm operation="task.context" label="Task zuordnen">
          <Hidden
            name={kind === "project" ? "projectId" : "goalId"}
            value={id}
          />
          <Choice
            name="taskId"
            label="Task"
            options={available(data, "task")}
            required
          />
        </OperationForm>
      )}
      {projects.map((p) => (
        <div className="grid gap-2" key={p.id}>
          <Link href={`/projects/${p.id}`}>{p.title}</Link>
          {!archived && (
            <OperationForm
              operation="project.context"
              label="Project-Zuordnung lösen"
            >
              <Hidden name="projectId" value={p.id} />
              <Hidden name="goalId" value="" />
            </OperationForm>
          )}
        </div>
      ))}
      {!archived && kind === "goal" && (
        <OperationForm operation="project.context" label="Project zuordnen">
          <Hidden name="goalId" value={id} />
          <Choice
            name="projectId"
            label="Project"
            options={available(data, "project")}
            required
          />
        </OperationForm>
      )}
    </Block>
  );
}
function ResourceTargetForm({
  id,
  targets,
  projectContext,
}: {
  projectContext?: string;
  id: string;
  targets: { id: string; title: string; type: WorkbenchKind }[];
}) {
  return (
    <div className="grid gap-3">
      {(["task", "project", "goal", "skill", "resource"] as const).map(
        (type) => (
          <details
            key={type}
            open={type === "project" && Boolean(projectContext)}
          >
            <summary className="cursor-pointer text-sm">
              {entityLabels[type]} verknüpfen
            </summary>
            <OperationForm
              operation="resource.link"
              label={`${entityLabels[type]} verknüpfen`}
            >
              <Hidden name="resourceId" value={id} />
              <Hidden name="targetType" value={type} />
              <Choice
                name="targetId"
                label={entityLabels[type]}
                value={type === "project" ? projectContext : undefined}
                options={targets.filter((t) => t.type === type)}
                required
              />
            </OperationForm>
          </details>
        ),
      )}
    </div>
  );
}
function Progress({
  kind,
  id,
  data,
}: {
  kind: WorkbenchKind;
  id: string;
  data: WorkbenchData;
}) {
  const tasks = data.tasks
    .filter((t) => !t.archived_at)
    .filter((t) =>
      kind === "project"
        ? t.project_id === id
        : kind === "goal"
          ? t.goal_id === id
          : kind === "skill"
            ? data.taskSkills.some(
                (l) => l.skill_id === id && l.task_id === t.id,
              )
            : false,
    );
  const evidence = data.evidence.filter((e) =>
    kind === "skill"
      ? e.skill_id === id
      : e.source_type === kind && e.source_id === id,
  );
  return (
    <Block
      title={kind === "skill" ? "Practice & Evidence" : "Arbeit & Fortschritt"}
    >
      {kind === "project" && (
        <p>
          Task progress {tasks.filter((t) => t.status === "done").length}/
          {tasks.length}
        </p>
      )}
      {kind === "goal" && (
        <>
          <p>Kein Outcome-basierter Fortschritt definiert.</p>
          <p>
            {tasks.length} direkte Tasks ·{" "}
            {data.projects.filter((p) => p.goal_id === id).length} Projects
          </p>
        </>
      )}
      {kind === "task" && <TaskSteps id={id} data={data} />}
      {kind === "skill" && (
        <p>
          {evidence.length} Evidence-Einträge ·{" "}
          {tasks.filter((t) => t.status === "done").length} verknüpfte
          abgeschlossene Tasks
        </p>
      )}
      {kind === "resource" && (
        <p>Wissen und Kontext; kein Ausführungsfortschritt.</p>
      )}
      {evidence.map((e) => (
        <article
          className="grid gap-2 border-t border-[var(--border-subtle)] pt-3"
          key={e.id}
        >
          <strong>{e.title}</strong>
          <p className="text-sm">
            {e.evidence_date} · {e.note}
          </p>
          {e.source_id && e.source_type !== "manual_note" && (
            <Link
              href={`${entityRoutes[e.source_type as WorkbenchKind]}/${e.source_id}`}
            >
              Quelle öffnen
            </Link>
          )}
          {kind === "skill" &&
            !data.skills.find((s) => s.id === id)?.archived_at && (
              <OperationForm
                operation="evidence.remove"
                label="Evidence entfernen"
              >
                <Hidden name="evidenceId" value={e.id} />
              </OperationForm>
            )}
        </article>
      ))}
      {kind === "skill" &&
        !data.skills.find((s) => s.id === id)?.archived_at && (
          <OperationForm
            operation="evidence.create"
            label="Evidence hinzufügen"
          >
            <Hidden name="skillId" value={id} />
            <Choice
              name="sourceReference"
              label="Evidence-Quelle"
              value="manual_note:"
              options={[
                { id: "manual_note:", title: "Eigene Beobachtung" },
                ...(["task", "project", "goal", "resource"] as const).flatMap(
                  (k) =>
                    available(data, k).map((r) => ({
                      id: `${k}:${r.id}`,
                      title: `${entityLabels[k]} · ${r.title}`,
                    })),
                ),
              ]}
              required
            />
            <label>
              Titel
              <input name="title" className={fieldClass} required />
            </label>
            <label>
              Datum
              <input
                name="evidenceDate"
                type="date"
                className={fieldClass}
                required
              />
            </label>
            <label>
              Evidence / Kontext
              <textarea name="note" className={fieldClass} />
            </label>
          </OperationForm>
        )}
    </Block>
  );
}

function TaskSteps({ id, data }: { id: string; data: WorkbenchData }) {
  const steps = data.steps.filter((s) => s.task_id === id && !s.archived_at);
  const progress = taskStepProgress(steps);
  const archived = Boolean(data.tasks.find((t) => t.id === id)?.archived_at);
  return (
    <section aria-label="Arbeitsschritte" className="grid gap-4">
      <p>
        {progress.completed} / {progress.total} Schritte erledigt
        {progress.percent !== null ? ` · ${progress.percent} %` : ""}
      </p>
      {!steps.length && (
        <p className="text-sm text-[var(--text-muted)]">
          Noch keine Arbeitsschritte definiert.
        </p>
      )}
      {steps.map((step) => (
        <div
          key={step.id}
          className="grid gap-2 border-t border-[var(--border-subtle)] pt-3"
        >
          <OperationForm
            operation="step.update"
            label="Schritt speichern"
            disabled={archived}
          >
            <Hidden name="taskId" value={id} />
            <Hidden name="stepId" value={step.id} />
            <label>
              Schritt
              <input
                name="title"
                className={fieldClass}
                defaultValue={step.title}
                required
                maxLength={500}
              />
            </label>
            <label>
              Reihenfolge
              <input
                type="number"
                min="0"
                name="position"
                className={fieldClass}
                defaultValue={step.position}
              />
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                name="completed"
                defaultChecked={Boolean(step.completed_at)}
              />
              Erledigt
            </label>
          </OperationForm>
          {!archived && (
            <OperationForm operation="step.archive" label="Schritt entfernen">
              <Hidden name="taskId" value={id} />
              <Hidden name="stepId" value={step.id} />
            </OperationForm>
          )}
        </div>
      ))}
      {!archived && (
        <OperationForm operation="step.create" label="Schritt hinzufügen">
          <Hidden name="taskId" value={id} />
          <Hidden
            name="position"
            value={String((steps.at(-1)?.position ?? -1) + 1)}
          />
          <label>
            Neuer Arbeitsschritt
            <input
              name="title"
              className={fieldClass}
              required
              maxLength={500}
            />
          </label>
        </OperationForm>
      )}
    </section>
  );
}
