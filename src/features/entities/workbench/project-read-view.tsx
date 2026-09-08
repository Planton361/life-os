import Link from "next/link";
import type { ReactNode } from "react";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import { ManagementDisclosure } from "./management-disclosure";
import { OperationForm } from "./forms";
import { ProjectResources } from "./project-resources";

const panel =
  "min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5";

export function ProjectReadView({
  data,
  id,
  edit,
  relations,
  selectedResource,
}: {
  data: WorkbenchData;
  id: string;
  edit: ReactNode;
  relations: ReactNode;
  selectedResource?: string;
}) {
  const project = data.projects.find((p) => p.id === id)!;
  const tasks = data.tasks.filter((t) => t.project_id === id && !t.archived_at);
  const done = tasks.filter((t) => t.status === "done").length;
  const goal = data.goals.find((g) => g.id === project.goal_id);
  const skillIds = new Set([
    ...data.taskSkills
      .filter((l) => tasks.some((t) => t.id === l.task_id))
      .map((l) => l.skill_id),
    ...data.evidence
      .filter((e) => e.source_type === "project" && e.source_id === id)
      .map((e) => e.skill_id),
  ]);
  const skills = data.skills.filter((s) => skillIds.has(s.id));
  const area = data.areas.find((a) => a.id === project.area_id);
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
      <section
        aria-label="Project Information"
        className={`${panel} xl:col-start-1 xl:row-start-1`}
      >
        <h2 className="font-semibold">Project Information</h2>
        {project.description && (
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--text-secondary)]">
            {project.description}
          </p>
        )}
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-[var(--text-muted)]">Status</dt>
            <dd>{project.archived_at ? "Archiviert" : project.status}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Priority</dt>
            <dd>{project.priority}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Area</dt>
            <dd>{area?.name ?? "Nicht zugeordnet"}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Deadline</dt>
            <dd>{project.target_date?.slice(0, 10) ?? "Keine Deadline"}</dd>
          </div>
        </dl>
        {!project.archived_at && (
          <ManagementDisclosure label="Bearbeiten">{edit}</ManagementDisclosure>
        )}
      </section>
      <section
        aria-label="Next Step"
        className={`${panel} xl:col-start-1 xl:row-start-2`}
      >
        <h2 className="font-semibold">Next Step</h2>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--text-secondary)]">
          {project.next_step || "Noch kein nächster Schritt festgelegt."}
        </p>
      </section>
      <div className={`${panel} xl:col-start-2 xl:row-start-1 xl:row-span-2`}>
        <ProjectResources
          data={data}
          projectId={id}
          section="primary"
          selectedResource={selectedResource}
        />
      </div>
      <section
        aria-label="Tasks & Progress"
        className={`${panel} xl:col-start-1 xl:row-start-3`}
      >
        <h2 className="font-semibold">
          Tasks & Progress{" "}
          <span className="text-sm font-normal text-[var(--text-muted)]">
            · {done}/{tasks.length} erledigt
          </span>
        </h2>
        {tasks.length ? (
          <ul className="mt-3 grid max-h-64 gap-2 overflow-y-auto text-sm">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-baseline justify-between gap-4"
              >
                <Link
                  className="min-w-0 break-words underline underline-offset-4"
                  href={`/tasks/${t.id}`}
                >
                  {t.title}
                </Link>
                <span className="shrink-0 text-[var(--text-muted)]">
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Noch keine Tasks zugeordnet.
          </p>
        )}
      </section>
      <div className={`${panel} xl:col-start-1 xl:row-start-4`}>
        <ProjectResources data={data} projectId={id} section="additional" />
      </div>
      <section
        aria-label="Project Context"
        className={`${panel} xl:col-start-2 xl:row-start-3`}
      >
        <h2 className="font-semibold">Goals / Skills / Context</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <p>
            Goal ·{" "}
            {goal ? (
              <Link className="underline" href={`/goals/${goal.id}`}>
                {goal.title}
                {goal.archived_at ? " · Archiviert" : ""}
              </Link>
            ) : (
              "Nicht zugeordnet"
            )}
          </p>
          <p className="text-[var(--text-muted)]">
            {skills.length} Skills aus Tasks / Evidence
          </p>
          {skills.map((s) => (
            <Link
              key={s.id}
              className="break-words underline"
              href={`/skills/${s.id}`}
            >
              {s.name}
              {s.archived_at ? " · Archiviert" : ""}
            </Link>
          ))}
        </div>
      </section>
      <div className={`${panel} xl:col-start-2 xl:row-start-4`}>
        <ProjectResources data={data} projectId={id} section="references" />
      </div>
      <section
        aria-label="Lifecycle / Management"
        className="grid min-w-0 gap-2 border-t border-[var(--border-subtle)] pt-3 xl:col-span-2"
      >
        <h2 className="text-sm text-[var(--text-muted)]">
          Lifecycle / Management
        </h2>
        {project.archived_at ? (
          <p className="text-sm">
            Archiviert. Historische Beziehungen bleiben erhalten.
          </p>
        ) : (
          <>
            <ManagementDisclosure label="Beziehungen verwalten">
              {relations}
              <ProjectResources
                data={data}
                projectId={id}
                section="reference-management"
              />
            </ManagementDisclosure>
            <ManagementDisclosure label="Lifecycle verwalten">
              <OperationForm
                operation="project.archive"
                label="Project archivieren"
              >
                <input type="hidden" name="projectId" value={id} />
              </OperationForm>
            </ManagementDisclosure>
          </>
        )}
      </section>
    </div>
  );
}
