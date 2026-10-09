import Link from "next/link";
import { ProjectExport } from "./project-export";
import type { ReactNode } from "react";
import type { WorkbenchData } from "@/features/real-data/runtime/entity-workbench-read";
import { ManagementDialog } from "./management-disclosure";
import { OperationForm } from "./forms";
import {
  ProjectResources,
  ProjectSupportingSummary,
} from "./project-resources";
import { projectResourceUses } from "./project-artifacts";

import styles from "./project-read-view.module.css";
import { ProjectWork } from "./project-work";
import {
  ProjectDepthHistory,
  ProjectDepthResult,
  ProjectDepthResultManagement,
  ProjectDepthReview,
  ProjectDepthStatus,
} from "./project-depth";
import type { ProjectDepthRead } from "@/features/real-data/supabase/repositories/project-depth-repository";
import type { PresentationRead } from "@/features/real-data/runtime/presentation-read";

export function ProjectReadView({
  data,
  id,
  edit,
  relations,
  selectedResource,
  depth,
}: {
  data: WorkbenchData;
  id: string;
  edit: ReactNode;
  relations: ReactNode;
  selectedResource?: string;
  depth?: PresentationRead<ProjectDepthRead>;
}) {
  const project = data.projects.find((p) => p.id === id)!;
  const mutable = !project.archived_at && project.status !== "completed";
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
  const resourceUses = projectResourceUses(data, id);
  const hasSupportingResources = resourceUses.some(
    (use) => use.role !== "primary_artifact" || use.resource.archived_at,
  );
  const hasContext = Boolean(
    goal ||
    area ||
    skills.length ||
    resourceUses.some(
      (use) => use.role === "primary_artifact" && !use.resource.archived_at,
    ),
  );
  const hasWork = tasks.some(
    (task) => !["canceled", "archived"].includes(task.status),
  );
  const showRail = hasContext && hasWork;
  const ContextContainer = hasWork ? "aside" : "details";
  const relationshipManagement = mutable && (
    <ManagementDialog
      label="Beziehungen verwalten"
      initiallyOpen={Boolean(selectedResource)}
      triggerClassName={styles.quiet}
    >
      {relations}
      <ProjectResources
        data={data}
        projectId={id}
        section="reference-management"
        selectedResource={selectedResource}
      />
    </ManagementDialog>
  );
  return (
    <div
      data-entity-workbench="project"
      data-project-detail-variant="B8"
      className={styles.project}
    >
      <div className={styles.frame} data-project-frame>
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex gap-3 text-sm text-[var(--text-muted)]"
        >
          <Link href="/portfolio">Portfolio</Link>
          <span>/</span>
          <Link href="/portfolio?type=projects">Projects</Link>
        </nav>
        <header aria-label="Project Header" className={styles.header}>
          <div className={styles.identity}>
            <div className={styles.title}>
              <p className={styles.entityLabel}>
                Project{" "}
                <span>
                  {project.archived_at
                    ? "Archiviert"
                    : ({
                        active: "Aktiv",
                        planned: "Geplant",
                        idea: "Idee",
                        blocked: "Blockiert",
                        paused: "Pausiert",
                        archived: "Archiviert",
                        completed: "Abgeschlossen",
                      }[project.status] ?? project.status)}
                </span>
              </p>
              <h1 className="min-w-0 break-words text-3xl font-semibold">
                {project.title}
              </h1>
            </div>
            {mutable && (
              <div className={styles.actions}>
                <ManagementDialog
                  label="Project bearbeiten"
                  triggerText="Bearbeiten"
                  triggerClassName={styles.button}
                >
                  {edit}
                </ManagementDialog>
                <ManagementDialog
                  label="Project verwalten"
                  triggerText="Mehr"
                  triggerClassName={styles.quiet}
                >
                  {!hasContext && relationshipManagement}
                  <div className="border-t border-[var(--border-subtle)] pt-3">
                    <ProjectExport projectId={id} />
                  </div>
                  {depth && <ProjectDepthStatus depth={depth} />}
                  <OperationForm
                    operation="project.archive"
                    label="Project archivieren"
                    closeOnSuccess
                  >
                    <input type="hidden" name="projectId" value={id} />
                    <input
                      type="hidden"
                      name="expectedRevision"
                      value={depth?.context.completion_revision ?? 0}
                    />
                    <input
                      type="hidden"
                      name="expectedCycle"
                      value={depth?.context.completion_cycle ?? 0}
                    />
                  </OperationForm>
                </ManagementDialog>
              </div>
            )}
            {!mutable && (
              <div className={styles.actions}>
                <ProjectExport projectId={id} />
              </div>
            )}
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
            {goal && (
              <Link href={`/goals/${goal.id}`}>
                Goal: {goal.title}
                {goal.archived_at ? " · Archiviert" : ""}
              </Link>
            )}
            {area && <span>{area.name}</span>}
            {project.priority && project.priority !== "none" && (
              <span>Priority {project.priority}</span>
            )}
            {project.target_date && (
              <span>
                Deadline{" "}
                {project.target_date
                  .slice(0, 10)
                  .split("-")
                  .reverse()
                  .join(".")}
              </span>
            )}
          </div>
          {depth && <ProjectDepthResult depth={depth} />}
          {depth && mutable && <ProjectDepthResultManagement depth={depth} />}
          {!hasContext && project.next_step && (
            <section
              aria-label="Project-Fokus"
              data-project-focus
              className="mt-3 border-l-2 border-[var(--accent-blue)] pl-3"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-blue)]">
                Project-Fokus
              </h2>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                {project.next_step}
              </p>
              <p className={styles.taskStatus}>
                Gespeicherte Orientierung, keine Task-Auswahl.
              </p>
            </section>
          )}
        </header>
        <div
          className={`${styles.workspace} ${showRail ? styles.withContext : ""}`}
          data-project-workspace
          data-project-empty={!hasWork ? "true" : undefined}
        >
          <ProjectWork data={data} projectId={id} />
          {hasContext && (
            <ContextContainer
              aria-label="Project Context Rail"
              className={styles.rail}
            >
              {!hasWork && <summary>Context</summary>}
              <section aria-label="Project Context" className="min-w-0">
                {(goal || skills.length > 0 || area) && (
                  <>
                    <h2 className="text-base font-semibold text-[var(--text-secondary)]">
                      Context
                    </h2>
                    <dl className="mt-3 grid gap-2 text-sm">
                      {goal && (
                        <div>
                          <dt className="text-sm text-[var(--text-secondary)]">
                            Goal
                          </dt>
                          <dd className="mt-1">
                            <Link
                              className="break-words text-[var(--accent-purple)] hover:underline"
                              href={`/goals/${goal.id}`}
                            >
                              {goal.title}
                              {goal.archived_at ? " · Archiviert" : ""}
                            </Link>
                          </dd>
                        </div>
                      )}
                      {skills.length > 0 && (
                        <div>
                          <dt className="text-sm text-[var(--text-secondary)]">
                            Skill-Kontext
                          </dt>
                          <dd
                            title="Aus Tasks / Evidence"
                            className="mt-1 flex flex-wrap gap-x-3 gap-y-1"
                          >
                            {skills.map((s) => (
                              <Link
                                key={s.id}
                                className="break-words hover:underline"
                                href={`/skills/${s.id}`}
                              >
                                {s.name}
                              </Link>
                            ))}
                          </dd>
                        </div>
                      )}
                      {area && (
                        <div>
                          <dt className="text-sm text-[var(--text-secondary)]">
                            Area
                          </dt>
                          <dd className="mt-1">{area.name}</dd>
                        </div>
                      )}
                    </dl>
                  </>
                )}
              </section>
              {relationshipManagement}
              {project.next_step && (
                <section aria-label="Project-Fokus" data-project-focus>
                  <h2 className="text-sm font-semibold">Project-Fokus</h2>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {project.next_step}
                  </p>
                  <p className={`${styles.taskStatus} mt-2`}>
                    Gespeicherte Orientierung, keine Task-Auswahl.
                  </p>
                </section>
              )}
              <ProjectResources data={data} projectId={id} section="primary" />
              {depth && showRail && <ProjectDepthReview depth={depth} />}
            </ContextContainer>
          )}
          {depth && !showRail && (
            <div className={styles.review}>
              <ProjectDepthReview depth={depth} />
            </div>
          )}
        </div>
        {hasSupportingResources && (
          <div className={styles.secondary} data-project-secondary>
            <ProjectSupportingSummary
              data={data}
              projectId={id}
              selectedResource={selectedResource}
            />
          </div>
        )}
      </div>
      {depth && <ProjectDepthHistory depth={depth} />}
    </div>
  );
}
