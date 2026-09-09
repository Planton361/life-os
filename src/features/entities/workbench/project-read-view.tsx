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
import { ProjectWork } from "./project-work";

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
        </div>
        {project.description && (
          <p className="mt-2 max-w-4xl whitespace-pre-wrap break-words text-sm text-[var(--text-secondary)]">
            {project.description}
          </p>
        )}
        <div
          aria-label="Project Metadata"
          className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--text-secondary)]"
        >
          <span>{project.archived_at ? "Archiviert" : project.status}</span>
          <span>{area?.name ?? "Keine Area"}</span>
          <span>Priority {project.priority}</span>
          {project.target_date && (
            <span>
              Deadline{" "}
              {project.target_date.slice(0, 10).split("-").reverse().join(".")}
            </span>
          )}
        </div>
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
        <ProjectWork data={data} projectId={id} />
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
