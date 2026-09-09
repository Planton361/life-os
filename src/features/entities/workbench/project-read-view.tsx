import Link from "next/link";
import type { ReactNode } from "react";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import {
  ManagementDisclosure,
  ManagementDisclosureGroup,
} from "./management-disclosure";
import { OperationForm } from "./forms";
import { ProjectResources } from "./project-resources";

import styles from "./project-read-view.module.css";
import { taskTextFields } from "./task-text";

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
    <div data-entity-workbench="project" className={styles.project}>
      <header aria-label="Project Header" className={styles.header}>
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex gap-3 text-sm text-[var(--text-muted)]"
        >
          <Link href="/portfolio">Portfolio</Link>
          <span>/</span>
          <Link href="/portfolio?type=projects">Projects</Link>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-2">
          <h1 className="min-w-0 break-words text-3xl font-semibold">
            {project.title}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {project.archived_at ? "Archiviert" : project.status} ·{" "}
            {area?.name ?? "Keine Area"} · {project.priority}
          </p>
        </div>
        {project.description && (
          <p className="mt-2 max-w-4xl whitespace-pre-wrap break-words text-sm text-[var(--text-secondary)]">
            {project.description}
          </p>
        )}
        {project.target_date && (
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Deadline{" "}
            {project.target_date.slice(0, 10).split("-").reverse().join(".")}
          </p>
        )}
        <ManagementDisclosureGroup className={styles.actions}>
          {!project.archived_at && (
            <>
              <ManagementDisclosure
                label="Bearbeiten"
                panelClassName={styles.editPanel}
              >
                {edit}
              </ManagementDisclosure>
              <ManagementDisclosure
                label="Project verwalten"
                triggerText="⋯"
                panelClassName={styles.menuPanel}
              >
                <OperationForm
                  operation="project.archive"
                  label="Project archivieren"
                >
                  <input type="hidden" name="projectId" value={id} />
                </OperationForm>
              </ManagementDisclosure>
            </>
          )}
        </ManagementDisclosureGroup>
        <section
          aria-label="Next Step"
          className="mt-2 border-l-2 border-[var(--accent-blue)] pl-3"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-blue)]">
            Next Step
          </h2>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">
            {project.next_step || "Noch kein nächster Schritt festgelegt."}
          </p>
        </section>
      </header>
      <div className={styles.workspace} data-project-workspace>
        <section aria-label="Tasks & Progress" className={styles.work}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-blue)]">
                Work
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                Tasks{" "}
                <span className="text-base font-normal text-[var(--text-muted)]">
                  {tasks.length}
                </span>
              </h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {done}/{tasks.length} erledigt
            </p>
          </div>
          <div
            className={styles.taskList}
            data-project-task-list
            tabIndex={0}
            aria-label="Project Task List"
          >
            {tasks.length ? (
              <ul>
                {tasks.map((t) => {
                  const text = taskTextFields(t.description);
                  return (
                    <li key={t.id} className={styles.task}>
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--text-secondary)]">
                          {t.status}
                        </p>
                        <Link
                          className="mt-1 block break-words font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                          href={`/tasks/${t.id}`}
                        >
                          {t.title}
                        </Link>
                        {text.nextAction && (
                          <p className="mt-1 line-clamp-2 break-words text-sm text-[var(--text-secondary)]">
                            {text.nextAction}
                          </p>
                        )}
                        {t.due_at && (
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            Deadline{" "}
                            {t.due_at
                              .slice(0, 10)
                              .split("-")
                              .reverse()
                              .join(".")}
                          </p>
                        )}
                      </div>
                      <Link
                        className="min-h-10 content-center text-sm text-[var(--text-muted)] underline"
                        aria-label={`${t.title}: Details öffnen`}
                        href={`/tasks/${t.id}`}
                      >
                        Details ↗
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-5 text-sm text-[var(--text-muted)]">
                Noch keine Tasks.
              </p>
            )}
          </div>
        </section>
        <aside aria-label="Project Context Rail" className={styles.rail}>
          <ProjectResources data={data} projectId={id} section="primary" />
          <section aria-label="Project Context" className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--text-secondary)]">
              Context
            </h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt className="text-sm text-[var(--text-secondary)]">Goal</dt>
                <dd className="mt-1">
                  {goal ? (
                    <Link
                      className="break-words text-[var(--accent-purple)] hover:underline"
                      href={`/goals/${goal.id}`}
                    >
                      {goal.title}
                      {goal.archived_at ? " · Archiviert" : ""}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--text-secondary)]">
                  Skills · {skills.length}
                </dt>
                <dd
                  title="Aus Tasks / Evidence"
                  className="mt-1 flex flex-wrap gap-x-3 gap-y-1"
                >
                  {skills.length
                    ? skills.map((s) => (
                        <Link
                          key={s.id}
                          className="break-words hover:underline"
                          href={`/skills/${s.id}`}
                        >
                          {s.name}
                        </Link>
                      ))
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--text-secondary)]">Area</dt>
                <dd className="mt-1">{area?.name ?? "—"}</dd>
              </div>
            </dl>
            {!project.archived_at && (
              <ManagementDisclosure label="Beziehungen verwalten">
                {relations}
                <ProjectResources
                  data={data}
                  projectId={id}
                  section="reference-management"
                />
              </ManagementDisclosure>
            )}
          </section>
        </aside>
      </div>
      <div className={styles.secondary} data-project-secondary>
        <ProjectResources
          data={data}
          projectId={id}
          section="additional"
          selectedResource={selectedResource}
        />
        <ProjectResources data={data} projectId={id} section="references" />
      </div>
    </div>
  );
}
