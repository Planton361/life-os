import Link from "next/link";
import type { ReactNode } from "react";
import type { ContentStateMeta } from "@/features/content-state";
import {
  archiveTaskFormAction,
  completeTaskFormAction,
  createPortfolioTaskFormAction,
  reopenTaskFormAction,
  rescheduleTaskFormAction,
  scheduleTaskForTodayFormAction,
  unscheduleTaskFormAction,
} from "@/features/real-data/actions/task.actions";
import {
  archiveGoalFormAction,
  archiveProjectFormAction,
  createProjectFormAction,
  updateGoalFormAction,
  updateProjectFormAction,
} from "@/features/real-data/actions/portfolio.actions";
import {
  archiveSkillFormAction,
  createSkillEvidenceFormAction,
  deleteSkillEvidenceFormAction,
  updateSkillFormAction,
} from "@/features/real-data/actions/skill.actions";
import {
  EmptyState,
  Pill,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import {
  getPortfolioEntitySourceRoute,
  getPortfolioPrimaryReason,
  portfolioAreaMeta,
  portfolioFocusLabels,
  portfolioStatusMeta,
  portfolioTypeAccent,
  portfolioTypeLabels,
  portfolioVisibilityReasonMeta,
} from "../portfolio-style";
import type {
  GoalWorkbenchViewModel,
  PortfolioDecision,
  PortfolioEntity,
  PortfolioLinkedResource,
  PortfolioProjectEntity,
  PortfolioTaskEntity,
  PortfolioViewModel,
  ProjectWorkbenchViewModel,
} from "../types";

const formInputClassName =
  "min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.78)] px-2 text-[11px] normal-case text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-55";

const formButtonClassName =
  "min-h-8 rounded-full border border-[rgba(91,124,250,.34)] bg-[rgba(91,124,250,.14)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(91,124,250,.52)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[rgba(18,28,43,.34)] disabled:text-[var(--text-muted)]";

function progressWidth(progress: number) {
  return `${Math.max(0, Math.min(100, progress))}%`;
}

function decisionAccent(decision: PortfolioDecision) {
  if (decision.state === "blocked") {
    return "var(--accent-red)";
  }

  if (decision.state === "decide") {
    return "var(--accent-orange)";
  }

  if (decision.state === "ready") {
    return "var(--accent-cyan)";
  }

  return "var(--text-muted)";
}

function isPortfolioTaskEntity(
  entity: PortfolioEntity,
): entity is PortfolioTaskEntity {
  return entity.type === "task" && Boolean(entity.taskLifecycle);
}

function isPortfolioProjectEntity(
  entity: PortfolioEntity,
): entity is PortfolioProjectEntity {
  return entity.type === "project";
}

function buildProjectWorkbench(
  project: PortfolioEntity,
  entities: readonly PortfolioEntity[],
): ProjectWorkbenchViewModel {
  const linkedTasks = entities.filter(
    (entity): entity is PortfolioTaskEntity =>
      isPortfolioTaskEntity(entity) && entity.projectId === project.id,
  );
  const completedTasks = linkedTasks.filter(
    (task) => task.taskLifecycle.status === "done",
  );
  const nextTasks = linkedTasks.filter(
    (task) => task.taskLifecycle.status !== "done",
  );
  const scheduledTasks = linkedTasks.filter((task) =>
    Boolean(task.taskLifecycle.scheduledTime),
  );

  return {
    project: {
      areaLabel: portfolioAreaMeta[project.area].label,
      id: project.id,
      progress: project.progress,
      status: portfolioStatusMeta[project.status].label,
      summary: project.description || undefined,
      title: project.title,
    },
    linkedTasks,
    nextTasks,
    completedTasks,
    metrics: {
      completedTasks: completedTasks.length,
      openTasks: nextTasks.length,
      scheduledTasks: scheduledTasks.length,
      totalTasks: linkedTasks.length,
    },
    sections: {
      logs: "prepared",
      milestones: "prepared",
      resources: "prepared",
    },
  };
}

function buildGoalWorkbench(
  goal: PortfolioEntity,
  entities: readonly PortfolioEntity[],
): GoalWorkbenchViewModel {
  const linkedProjects = entities.filter(
    (entity): entity is PortfolioProjectEntity =>
      isPortfolioProjectEntity(entity) && entity.goalId === goal.id,
  );
  const linkedTasks = entities.filter(
    (entity): entity is PortfolioTaskEntity =>
      isPortfolioTaskEntity(entity) && entity.goalId === goal.id,
  );
  const completedTasks = linkedTasks.filter(
    (task) => task.taskLifecycle.status === "done",
  );
  const nextTasks = linkedTasks.filter(
    (task) => task.taskLifecycle.status !== "done",
  );
  const scheduledTasks = linkedTasks.filter((task) =>
    Boolean(task.taskLifecycle.scheduledTime),
  );
  const activeProjects = linkedProjects.filter(
    (project) => project.status !== "done",
  );

  return {
    goal: {
      areaLabel: portfolioAreaMeta[goal.area].label,
      id: goal.id,
      progress: goal.progress,
      status: portfolioStatusMeta[goal.status].label,
      summary: goal.description || undefined,
      title: goal.title,
    },
    linkedProjects,
    linkedTasks,
    nextTasks,
    completedTasks,
    metrics: {
      activeProjects: activeProjects.length,
      completedTasks: completedTasks.length,
      openTasks: nextTasks.length,
      scheduledTasks: scheduledTasks.length,
      totalProjects: linkedProjects.length,
      totalTasks: linkedTasks.length,
    },
    sections: {
      logs: "prepared",
      milestones: "prepared",
      resources: "prepared",
      reviewCadence: "prepared",
    },
  };
}

function FieldCard({
  label,
  value,
  accent,
}: Readonly<{
  label: string;
  value: string;
  accent: string;
}>) {
  return (
    <div
      className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[rgba(11,17,28,.42)] px-3 py-2"
      style={accentStyle(accent)}
    >
      <p className="text-[10px] font-semibold text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[12px] leading-4 text-[var(--text-secondary)]">
        {value}
      </p>
    </div>
  );
}

type WorkbenchTaskCreateContext = {
  ariaLabel: string;
  contextPlaceholder: string;
  entity: PortfolioEntity;
  hiddenIdName: "goalId" | "projectId";
  returnView: "goals" | "projects";
  selectedIdName: "selectedGoalId" | "selectedProjectId";
  titlePlaceholder: string;
};

function WorkbenchCreateSection({
  children,
  description,
  heading,
  id,
}: Readonly<{
  children: ReactNode;
  description: string;
  heading: string;
  id: string;
}>) {
  return (
    <section aria-labelledby={id}>
      <h3
        className="text-[13px] font-semibold text-[var(--text-primary)]"
        id={id}
      >
        {heading}
      </h3>
      <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
        {description}
      </p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function WorkbenchTaskCreateForm({
  context,
  disabled,
}: Readonly<{
  context: WorkbenchTaskCreateContext;
  disabled: boolean;
}>) {
  return (
    <form
      action={createPortfolioTaskFormAction}
      aria-label={context.ariaLabel}
      className="grid gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-3"
    >
      <input name={context.hiddenIdName} type="hidden" value={context.entity.id} />
      <input name="returnView" type="hidden" value={context.returnView} />
      <input
        name={context.selectedIdName}
        type="hidden"
        value={context.entity.id}
      />
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Task-Titel
        <input
          className={formInputClassName}
          disabled={disabled}
          name="title"
          placeholder={context.titlePlaceholder}
          required
        />
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Next Action
        <input
          className={formInputClassName}
          disabled={disabled}
          name="nextAction"
          placeholder="Konkreter nächster Schritt"
        />
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Kontext
        <input
          className={formInputClassName}
          disabled={disabled}
          name="description"
          placeholder={context.contextPlaceholder}
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Priorität
          <select
            className={formInputClassName}
            defaultValue="P2"
            disabled={disabled}
            name="priority"
          >
            <option value="none">None</option>
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Energie
          <select className={formInputClassName} disabled={disabled} name="energy">
            <option value="">-</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Minuten
          <input
            className={formInputClassName}
            disabled={disabled}
            min="1"
            name="durationMinutes"
            placeholder="30"
            type="number"
          />
        </label>
      </div>
      <label className="flex min-h-8 items-center gap-2 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.58)] px-2 text-[11px] font-semibold text-[var(--text-secondary)]">
        <input
          className="size-4 accent-[rgb(91,124,250)]"
          disabled={disabled}
          name="todayCandidate"
          type="checkbox"
        />
        Heute planen
      </label>
      <button className={formButtonClassName} disabled={disabled} type="submit">
        Task erstellen
      </button>
    </form>
  );
}

function GoalProjectCreateForm({
  disabled,
  goal,
}: Readonly<{
  disabled: boolean;
  goal: PortfolioEntity;
}>) {
  return (
    <form
      action={createProjectFormAction}
      aria-label="Goal Project erstellen"
      className="grid gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-3"
    >
      <input name="goalId" type="hidden" value={goal.id} />
      <input name="returnView" type="hidden" value="goals" />
      <input name="selectedGoalId" type="hidden" value={goal.id} />
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Project-Titel
        <input
          className={formInputClassName}
          disabled={disabled}
          name="title"
          placeholder="Neues Goal Project"
          required
        />
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Beschreibung
        <input
          className={formInputClassName}
          disabled={disabled}
          name="description"
          placeholder="Optionaler Goal-Kontext"
        />
      </label>
      <button className={formButtonClassName} disabled={disabled} type="submit">
        Project erstellen
      </button>
    </form>
  );
}

function GoalEditForm({
  disabled,
  goal,
}: Readonly<{
  disabled: boolean;
  goal: PortfolioEntity;
}>) {
  const values = goal.goalEditValues;

  return (
    <form
      action={updateGoalFormAction}
      aria-label="Goal bearbeiten"
      className="grid gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-3"
    >
      <input name="goalId" type="hidden" value={goal.id} />
      <input name="returnView" type="hidden" value="goals" />
      <input name="selectedGoalId" type="hidden" value={goal.id} />
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Goal-Titel
        <input
          className={formInputClassName}
          defaultValue={values?.title ?? goal.title}
          disabled={disabled}
          name="title"
          required
        />
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Summary
        <input
          className={formInputClassName}
          defaultValue={values?.description ?? goal.description}
          disabled={disabled}
          name="description"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Horizon
          <select
            className={formInputClassName}
            defaultValue={values?.horizon ?? "someday"}
            disabled={disabled}
            name="horizon"
          >
            <option value="week">week</option>
            <option value="month">month</option>
            <option value="quarter">quarter</option>
            <option value="year">year</option>
            <option value="someday">someday</option>
          </select>
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Status
          <select
            className={formInputClassName}
            defaultValue={values?.status ?? "active"}
            disabled={disabled}
            name="status"
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="achieved">achieved</option>
          </select>
        </label>
      </div>
      <button className={formButtonClassName} disabled={disabled} type="submit">
        Goal speichern
      </button>
    </form>
  );
}

function GoalArchiveForm({
  disabled,
  goalId,
}: Readonly<{
  disabled: boolean;
  goalId: string;
}>) {
  return (
    <form action={archiveGoalFormAction} aria-label="Goal archivieren">
      <input name="goalId" type="hidden" value={goalId} />
      <button
        className="inline-flex min-h-8 items-center rounded-full border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.10)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(221,107,95,.44)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[rgba(18,28,43,.34)] disabled:text-[var(--text-muted)]"
        disabled={disabled}
        type="submit"
      >
        Goal archivieren
      </button>
    </form>
  );
}

function ProjectEditForm({
  disabled,
  project,
}: Readonly<{
  disabled: boolean;
  project: PortfolioEntity;
}>) {
  const values = project.projectEditValues;

  return (
    <form
      action={updateProjectFormAction}
      aria-label="Project bearbeiten"
      className="grid gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-3"
    >
      <input name="projectId" type="hidden" value={project.id} />
      <input name="returnView" type="hidden" value="projects" />
      <input name="selectedProjectId" type="hidden" value={project.id} />
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Project-Titel
        <input
          className={formInputClassName}
          defaultValue={values?.title ?? project.title}
          disabled={disabled}
          name="title"
          required
        />
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Summary
        <input
          className={formInputClassName}
          defaultValue={values?.description ?? project.description}
          disabled={disabled}
          name="description"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_132px]">
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Next Action
          <input
            className={formInputClassName}
            defaultValue={values?.nextStep ?? project.nextAction}
            disabled={disabled}
            name="nextStep"
          />
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Status
          <select
            className={formInputClassName}
            defaultValue={values?.status ?? "active"}
            disabled={disabled}
            name="status"
          >
            <option value="idea">idea</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="blocked">blocked</option>
            <option value="completed">completed</option>
          </select>
        </label>
      </div>
      <button className={formButtonClassName} disabled={disabled} type="submit">
        Project speichern
      </button>
    </form>
  );
}

function ProjectArchiveForm({
  disabled,
  projectId,
}: Readonly<{
  disabled: boolean;
  projectId: string;
}>) {
  return (
    <form action={archiveProjectFormAction} aria-label="Project archivieren">
      <input name="projectId" type="hidden" value={projectId} />
      <button
        className="inline-flex min-h-8 items-center rounded-full border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.10)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(221,107,95,.44)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[rgba(18,28,43,.34)] disabled:text-[var(--text-muted)]"
        disabled={disabled}
        type="submit"
      >
        Project archivieren
      </button>
    </form>
  );
}

function ActionLink({
  href,
  children,
}: Readonly<{
  href: `/${string}`;
  children: ReactNode;
}>) {
  return (
    <Link
      className="inline-flex min-h-8 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.76)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      href={href}
    >
      {children}
    </Link>
  );
}

function TaskPlanningForm({
  mode,
  taskId,
}: Readonly<{
  mode: "plan" | "schedule";
  taskId: string;
}>) {
  return (
    <form action={scheduleTaskForTodayFormAction}>
      <input name="taskId" type="hidden" value={taskId} />
      <input name="mode" type="hidden" value={mode} />
      <button
        className="inline-flex min-h-8 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.76)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        type="submit"
      >
        {mode === "schedule" ? "Heute terminieren" : "Heute planen"}
      </button>
    </form>
  );
}

function TaskLifecycleButton({
  action,
  label,
  taskId,
  tone = "neutral",
}: Readonly<{
  action: (formData: FormData) => Promise<void>;
  label: string;
  taskId: string;
  tone?: "neutral" | "primary" | "danger";
}>) {
  const toneClass =
    tone === "primary"
      ? "border-[rgba(66,184,131,.34)] bg-[rgba(66,184,131,.14)] text-[var(--text-primary)] hover:border-[rgba(66,184,131,.52)]"
      : tone === "danger"
        ? "border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.10)] text-[var(--text-secondary)] hover:border-[rgba(221,107,95,.44)]"
        : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.76)] text-[var(--text-secondary)] hover:border-[var(--border-default)]";

  return (
    <form action={action}>
      <input name="taskId" type="hidden" value={taskId} />
      <button
        className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${toneClass}`}
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function TaskRescheduleForm({
  durationMinutes,
  plannedDate,
  scheduledTime,
  taskId,
}: Readonly<{
  durationMinutes: number;
  plannedDate?: string;
  scheduledTime?: string;
  taskId: string;
}>) {
  return (
    <form
      action={rescheduleTaskFormAction}
      aria-label="Task umplanen"
      className="grid w-full gap-1.5 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] p-2 sm:grid-cols-[minmax(0,1fr)_88px_auto]"
    >
      <input name="taskId" type="hidden" value={taskId} />
      <label className="min-w-0">
        <span className="sr-only">Datum</span>
        <input
          className="min-h-8 w-full rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.78)] px-2 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--focus-ring)]"
          defaultValue={plannedDate}
          name="plannedDate"
          required
          type="date"
        />
      </label>
      <label className="min-w-0">
        <span className="sr-only">Uhrzeit</span>
        <input
          className="min-h-8 w-full rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(7,11,18,.78)] px-2 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--focus-ring)]"
          defaultValue={scheduledTime ?? "09:00"}
          name="scheduledTime"
          required
          type="time"
        />
      </label>
      <input name="durationMinutes" type="hidden" value={durationMinutes} />
      <button
        className="min-h-8 rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.14)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(95,200,215,.48)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        type="submit"
      >
        Umplanen
      </button>
    </form>
  );
}

function TaskLifecycleActions({
  entity,
}: Readonly<{
  entity: PortfolioEntity;
}>) {
  const lifecycle = entity.taskLifecycle;

  if (!lifecycle) return null;

  const isDone = lifecycle.status === "done";
  const isScheduled = Boolean(lifecycle.scheduledTime);

  return (
    <>
      {isDone ? (
        <>
          <TaskLifecycleButton
            action={reopenTaskFormAction}
            label="Wieder öffnen"
            taskId={entity.id}
            tone="primary"
          />
          <TaskLifecycleButton
            action={archiveTaskFormAction}
            label="Archivieren"
            taskId={entity.id}
            tone="danger"
          />
        </>
      ) : (
        <>
          <TaskLifecycleButton
            action={completeTaskFormAction}
            label="Abschließen"
            taskId={entity.id}
            tone="primary"
          />
          {!lifecycle.plannedDate ? (
            <TaskPlanningForm mode="plan" taskId={entity.id} />
          ) : null}
          {isScheduled ? (
            <TaskLifecycleButton
              action={unscheduleTaskFormAction}
              label="Entterminieren"
              taskId={entity.id}
            />
          ) : (
            <TaskPlanningForm mode="schedule" taskId={entity.id} />
          )}
          <TaskLifecycleButton
            action={archiveTaskFormAction}
            label="Archivieren"
            taskId={entity.id}
            tone="danger"
          />
        </>
      )}
      {isScheduled ? (
        <TaskRescheduleForm
          durationMinutes={lifecycle.durationMinutes}
          plannedDate={lifecycle.plannedDate}
          scheduledTime={lifecycle.scheduledTime}
          taskId={entity.id}
        />
      ) : null}
    </>
  );
}

function ProjectTaskCard({
  profileId,
  relationHint,
  task,
}: Readonly<{
  profileId: PortfolioViewModel["profileId"];
  relationHint?: string;
  task: PortfolioTaskEntity;
}>) {
  const lifecycle = task.taskLifecycle;
  const meta = [
    portfolioStatusMeta[task.status].label,
    task.priority,
    task.energy ? `${task.energy} energy` : null,
    `${lifecycle.durationMinutes} min`,
    task.taskLifecycle.plannedDate,
    task.taskLifecycle.scheduledTime,
  ].filter(Boolean);

  return (
    <article className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
            {task.title}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            {meta.join(" · ")}
          </p>
        </div>
        <Pill accent={portfolioStatusMeta[task.status].accent}>
          {portfolioStatusMeta[task.status].label}
        </Pill>
      </div>
      {task.nextAction ? (
        <p className="mt-2 text-[11px] leading-4 text-[var(--text-secondary)]">
          {task.nextAction}
        </p>
      ) : null}
      {relationHint ? (
        <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
          {relationHint}
        </p>
      ) : null}
      {profileId === "manual" ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <TaskLifecycleActions entity={task} />
        </div>
      ) : null}
    </article>
  );
}

function GoalProjectCard({
  project,
  taskCount,
}: Readonly<{
  project: PortfolioProjectEntity;
  taskCount: number;
}>) {
  return (
    <article className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
            {project.title}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            {portfolioStatusMeta[project.status].label} · {taskCount}{" "}
            verknüpfte Tasks
          </p>
        </div>
        <Pill accent={portfolioStatusMeta[project.status].accent}>
          {portfolioStatusMeta[project.status].label}
        </Pill>
      </div>
      {project.nextAction ? (
        <p className="mt-2 text-[11px] leading-4 text-[var(--text-secondary)]">
          {project.nextAction}
        </p>
      ) : null}
    </article>
  );
}

function PreparedWorkbenchSection({
  body,
  title,
}: Readonly<{
  body: string;
  title: string;
}>) {
  return (
    <article className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)] p-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-[12px] font-semibold text-[var(--text-primary)]">
          {title}
        </h4>
        <Pill accent="var(--text-muted)">Vorbereitet</Pill>
      </div>
      <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
        {body}
      </p>
    </article>
  );
}

function WorkbenchSectionIntro({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
      {children}
    </p>
  );
}

function SkillEvidenceCreateForm({
  disabled,
  skillId,
  sourceTargets,
}: Readonly<{
  disabled: boolean;
  skillId: string;
  sourceTargets: NonNullable<PortfolioEntity["skillContext"]>["sourceTargets"];
}>) {
  return (
    <form
      action={createSkillEvidenceFormAction}
      aria-label="Evidence hinzufügen"
      className="grid gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-3"
    >
      <input name="skillId" type="hidden" value={skillId} />
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Evidence Source
        <select
          className={formInputClassName}
          defaultValue="manual_note:"
          disabled={disabled}
          name="sourceReference"
        >
          <option value="manual_note:">Manual note</option>
          {(sourceTargets ?? []).map((target) => (
            <option
              key={`skill-source-target-${target.sourceType}-${target.id}`}
              value={`${target.sourceType}:${target.id}`}
            >
              {target.sourceType} · {target.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Evidence-Titel
        <input
          className={formInputClassName}
          disabled={disabled}
          name="title"
          placeholder="Manueller Nachweis"
          required
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_96px]">
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Datum
          <input
            className={formInputClassName}
            disabled={disabled}
            name="evidenceDate"
            required
            type="date"
          />
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Gewicht
          <input
            className={formInputClassName}
            disabled={disabled}
            max="5"
            min="1"
            name="weight"
            placeholder="3"
            type="number"
          />
        </label>
      </div>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Notiz
        <input
          className={formInputClassName}
          disabled={disabled}
          name="note"
          placeholder="Optionaler Evidence-Kontext"
        />
      </label>
      <button className={formButtonClassName} disabled={disabled} type="submit">
        Evidence hinzufügen
      </button>
    </form>
  );
}

function SkillEditForm({
  disabled,
  entity,
}: Readonly<{
  disabled: boolean;
  entity: PortfolioEntity;
}>) {
  const values = entity.skillContext?.editValues;

  return (
    <form
      action={updateSkillFormAction}
      aria-label="Skill bearbeiten"
      className="grid gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-3"
    >
      <input name="skillId" type="hidden" value={entity.id} />
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Skill-Name
        <input
          className={formInputClassName}
          defaultValue={values?.name ?? entity.title}
          disabled={disabled}
          name="name"
          required
        />
      </label>
      <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        Summary
        <input
          className={formInputClassName}
          defaultValue={values?.summary ?? entity.description}
          disabled={disabled}
          name="summary"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Kategorie
          <input
            className={formInputClassName}
            defaultValue={values?.category}
            disabled={disabled}
            name="category"
          />
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Level
          <input
            className={formInputClassName}
            defaultValue={values?.level}
            disabled={disabled}
            name="level"
          />
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          Status
          <select
            className={formInputClassName}
            defaultValue={values?.status ?? "active"}
            disabled={disabled}
            name="status"
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
          </select>
        </label>
      </div>
      <button className={formButtonClassName} disabled={disabled} type="submit">
        Skill speichern
      </button>
    </form>
  );
}

function SkillArchiveForm({
  disabled,
  skillId,
}: Readonly<{
  disabled: boolean;
  skillId: string;
}>) {
  return (
    <form action={archiveSkillFormAction} aria-label="Skill archivieren">
      <input name="skillId" type="hidden" value={skillId} />
      <button
        className="inline-flex min-h-8 items-center rounded-full border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.10)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(221,107,95,.44)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[rgba(18,28,43,.34)] disabled:text-[var(--text-muted)]"
        disabled={disabled}
        type="submit"
      >
        Skill archivieren
      </button>
    </form>
  );
}

function WorkbenchResourceCard({
  resource,
}: Readonly<{
  resource: PortfolioLinkedResource;
}>) {
  const meta = [
    resource.type,
    resource.source,
    resource.relationType,
    resource.createdAt.slice(0, 10),
  ].filter(Boolean);

  return (
    <article className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
            {resource.title}
          </p>
          <p className="mt-1 truncate text-[10px] leading-4 text-[var(--text-muted)]">
            {meta.join(" · ")}
          </p>
        </div>
        <Pill accent="var(--accent-yellow)">Resource</Pill>
      </div>
    </article>
  );
}

function WorkbenchResourcesSection({
  resources,
}: Readonly<{
  resources: readonly PortfolioLinkedResource[];
}>) {
  return (
    <section aria-labelledby="workbench-resources-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          className="text-[13px] font-semibold text-[var(--text-primary)]"
          id="workbench-resources-heading"
        >
          Resources
        </h3>
        <Pill accent="var(--accent-yellow)">{resources.length} total</Pill>
      </div>
      <WorkbenchSectionIntro>
        Resource Relations werden hier nur angezeigt. Workbench-local Resource
        Management bleibt vorbereitet.
      </WorkbenchSectionIntro>
      <div className="mt-2 grid gap-2">
        {resources.length > 0 ? (
          resources.map((resource) => (
            <WorkbenchResourceCard
              key={`workbench-resource-${resource.id}-${resource.relationType}`}
              resource={resource}
            />
          ))
        ) : (
          <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.38)] px-3 py-2 text-[11px] leading-4 text-[var(--text-muted)]">
            Keine verknüpften Resources.
          </p>
        )}
      </div>
    </section>
  );
}

function WorkbenchFutureScopeNote({
  body,
}: Readonly<{
  body: string;
}>) {
  return (
    <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.32)] px-3 py-2 text-[10px] leading-4 text-[var(--text-muted)]">
      {body}
    </p>
  );
}

function getProgressSignalNote(entity: PortfolioEntity) {
  if (entity.type === "project") {
    return "Project Progress ist aktuell ein einfaches Signal. Milestones, Logs und Project Undo sind noch nicht verbunden.";
  }

  if (entity.type === "goal") {
    return "Goal Progress ist aktuell ein einfaches Signal. Review Cadence, Key Results und Zielhistorie sind noch nicht verbunden.";
  }

  return "Progress is text-backed above; color is only an accent.";
}

function GoalWorkbench({
  entities,
  goal,
  profileId,
}: Readonly<{
  entities: readonly PortfolioEntity[];
  goal: PortfolioEntity;
  profileId: PortfolioViewModel["profileId"];
}>) {
  const workbench = buildGoalWorkbench(goal, entities);
  const disabled = profileId !== "manual";
  const taskCountByProject = new Map<string, number>();
  const projectTitleById = new Map<string, string>();

  for (const project of workbench.linkedProjects) {
    projectTitleById.set(project.id, project.title);
  }

  for (const task of workbench.linkedTasks) {
    if (!task.projectId) continue;
    taskCountByProject.set(
      task.projectId,
      (taskCountByProject.get(task.projectId) ?? 0) + 1,
    );
  }

  return (
    <section aria-labelledby="goal-workbench-heading">
      <div className="rounded-[14px] border border-[rgba(155,124,246,.22)] bg-[rgba(155,124,246,.07)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-purple)]">
              Goal Workbench
            </p>
            <h3
              className="mt-1 text-[15px] font-semibold text-[var(--text-primary)]"
              id="goal-workbench-heading"
            >
              Goal Overview
            </h3>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
              {workbench.goal.summary ?? "Keine Beschreibung"}
            </p>
          </div>
          <Pill accent="var(--accent-purple)">
            {workbench.goal.status ?? "Status offen"}
          </Pill>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <FieldCard
            accent="var(--accent-purple)"
            label="Arbeitsbasiertes Signal"
            value={
              workbench.metrics.totalProjects > 0 ||
              workbench.metrics.totalTasks > 0
                ? `${workbench.metrics.totalProjects} Projects / ${workbench.metrics.totalTasks} Tasks · ${workbench.metrics.completedTasks} Tasks erledigt`
                : "Noch kein arbeitsbasiertes Signal"
            }
          />
          <FieldCard
            accent="var(--accent-cyan)"
            label="Area"
            value={workbench.goal.areaLabel ?? "Keine Area gesetzt"}
          />
          <FieldCard
            accent="var(--accent-orange)"
            label="Linked Projects"
            value={
              workbench.metrics.totalProjects > 0
                ? `${workbench.metrics.activeProjects} aktiv / ${workbench.metrics.totalProjects} gesamt`
                : "Keine verknüpften Projects"
            }
          />
          <FieldCard
            accent="var(--accent-blue)"
            label="Linked Tasks"
            value={
              workbench.metrics.totalTasks > 0
                ? `${workbench.metrics.openTasks} offen / ${workbench.metrics.completedTasks} erledigt`
                : "Keine verknüpften Tasks"
            }
          />
          <FieldCard
            accent="var(--accent-green)"
            label="Task-basiertes Signal"
            value={`${workbench.metrics.completedTasks} / ${workbench.metrics.totalTasks} verknüpfte Tasks erledigt`}
          />
          <FieldCard
            accent="var(--accent-yellow)"
            label="Terminiert"
            value={`${workbench.metrics.scheduledTasks} terminierte Tasks`}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        <WorkbenchCreateSection
          description={
            disabled
              ? "Wechsle ins Manual-Profil, um echte Goal-Daten zu bearbeiten."
              : "Aktualisiert Titel, Summary, Horizon und Status des ausgewählten Goals."
          }
          heading="Goal bearbeiten"
          id="goal-edit-heading"
        >
          <GoalEditForm disabled={disabled} goal={goal} />
        </WorkbenchCreateSection>

        <WorkbenchCreateSection
          description={
            disabled
              ? "Wechsle ins Manual-Profil, um echte Goal Tasks zu erstellen."
              : "Persistiert eine Task mit diesem Goal als Kontext."
          }
          heading="Linked Task für Goal erstellen"
          id="goal-task-create-heading"
        >
          <WorkbenchTaskCreateForm
            context={{
              ariaLabel: "Goal Task erstellen",
              contextPlaceholder: "Optionaler Goal-Kontext",
              entity: goal,
              hiddenIdName: "goalId",
              returnView: "goals",
              selectedIdName: "selectedGoalId",
              titlePlaceholder: "Nächster Goal Task",
            }}
            disabled={disabled}
          />
        </WorkbenchCreateSection>

        <WorkbenchCreateSection
          description={
            disabled
              ? "Wechsle ins Manual-Profil, um echte Goal Projects zu erstellen."
              : "Persistiert ein Project mit diesem Goal als Kontext."
          }
          heading="Linked Project für Goal erstellen"
          id="goal-project-create-heading"
        >
          <GoalProjectCreateForm disabled={disabled} goal={goal} />
        </WorkbenchCreateSection>

        <section aria-labelledby="goal-linked-projects-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              className="text-[13px] font-semibold text-[var(--text-primary)]"
              id="goal-linked-projects-heading"
            >
              Linked Projects
            </h3>
            <Pill accent="var(--accent-orange)">
              {workbench.metrics.totalProjects} total
            </Pill>
          </div>
          <WorkbenchSectionIntro>
            Mit diesem Goal verknüpft. Diese Liste liest vorhandene Projects aus
            dem lokalen Datenpfad.
          </WorkbenchSectionIntro>
          <div className="mt-2 grid gap-2">
            {workbench.linkedProjects.length > 0 ? (
              workbench.linkedProjects.map((project) => (
                <GoalProjectCard
                  key={`goal-project-${project.id}`}
                  project={project}
                  taskCount={taskCountByProject.get(project.id) ?? 0}
                />
              ))
            ) : (
              <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.38)] px-3 py-2 text-[11px] leading-4 text-[var(--text-muted)]">
                Keine verknüpften Projects.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="goal-linked-tasks-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              className="text-[13px] font-semibold text-[var(--text-primary)]"
              id="goal-linked-tasks-heading"
            >
              Linked Tasks
            </h3>
            <Pill accent="var(--accent-blue)">
              {workbench.metrics.totalTasks} total
            </Pill>
          </div>
          <WorkbenchSectionIntro>
            Mit diesem Goal verknüpft. Lifecycle- und Scheduling-Controls sind
            echte Task Actions.
          </WorkbenchSectionIntro>
          <div className="mt-2 grid gap-2">
            {workbench.linkedTasks.length === 0 ? (
              <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.38)] px-3 py-2 text-[11px] leading-4 text-[var(--text-muted)]">
                Keine verknüpften Tasks.
              </p>
            ) : null}
            {workbench.nextTasks.length > 0 ? (
              workbench.nextTasks.map((task) => (
                <ProjectTaskCard
                  key={`goal-open-task-${task.id}`}
                  profileId={profileId}
                  relationHint={
                    task.projectId
                      ? `Project: ${projectTitleById.get(task.projectId) ?? "Project nicht gefunden"}`
                      : undefined
                  }
                  task={task}
                />
              ))
            ) : null}
            {workbench.completedTasks.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                  Completed
                </p>
                {workbench.completedTasks.map((task) => (
                  <ProjectTaskCard
                    key={`goal-completed-task-${task.id}`}
                    profileId={profileId}
                    relationHint={
                      task.projectId
                        ? `Project: ${projectTitleById.get(task.projectId) ?? "Project nicht gefunden"}`
                        : undefined
                    }
                    task={task}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <WorkbenchResourcesSection resources={goal.linkedResources ?? []} />

        <WorkbenchCreateSection
          description={
            disabled
              ? "Wechsle ins Manual-Profil, um echte Goals zu archivieren."
              : "Archiviert das Goal per Soft Archive. Aktive Portfolio-Listen blenden es danach aus."
          }
          heading="Goal archivieren"
          id="goal-archive-heading"
        >
          <GoalArchiveForm disabled={disabled} goalId={goal.id} />
        </WorkbenchCreateSection>

        <section aria-labelledby="goal-prepared-sections-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="goal-prepared-sections-heading"
          >
            Prepared / Future Sections
          </h3>
          <div className="mt-2 grid gap-2">
            <PreparedWorkbenchSection
              body="Vorbereitet: noch nicht mit lokaler Datenquelle verbunden. Milestones folgen als eigener F1.1 Slice."
              title="Milestones"
            />
            <PreparedWorkbenchSection
              body="Vorbereitet: Review-Rhythmus, nächster Review und Review Notes schreiben hier noch keine Persistenz."
              title="Review Cadence"
            />
            <PreparedWorkbenchSection
              body="Vorbereitet: keine Zielhistorie oder Log-Einträge in diesem Workbench gespeichert."
              title="Goal Log"
            />
          </div>
        </section>

        <WorkbenchFutureScopeNote body="Future Scope: Goal Edit, Status und Soft Archive sind verbunden. Milestones, Review Cadence, Goal Log, Goal Undo, Graph und AI Coach schreiben hier noch keine Persistenz." />
      </div>
    </section>
  );
}

function ProjectWorkbench({
  entities,
  profileId,
  project,
}: Readonly<{
  entities: readonly PortfolioEntity[];
  profileId: PortfolioViewModel["profileId"];
  project: PortfolioEntity;
}>) {
  const workbench = buildProjectWorkbench(project, entities);
  const disabled = profileId !== "manual";

  return (
    <section aria-labelledby="project-workbench-heading">
      <div className="rounded-[14px] border border-[rgba(217,146,79,.22)] bg-[rgba(217,146,79,.07)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-orange)]">
              Project Workbench
            </p>
            <h3
              className="mt-1 text-[15px] font-semibold text-[var(--text-primary)]"
              id="project-workbench-heading"
            >
              Project Overview
            </h3>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
              {workbench.project.summary ?? "Keine Beschreibung"}
            </p>
          </div>
          <Pill accent="var(--accent-orange)">
            {workbench.project.status ?? "Status offen"}
          </Pill>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <FieldCard
            accent="var(--accent-orange)"
            label="Task-basiertes Signal"
            value={
              workbench.metrics.totalTasks > 0
                ? `${workbench.metrics.completedTasks} / ${workbench.metrics.totalTasks} verknüpfte Tasks erledigt`
                : "Noch keine verknüpften Tasks; Fortschritt wird nur aus Tasks berechnet"
            }
          />
          <FieldCard
            accent="var(--accent-cyan)"
            label="Area"
            value={workbench.project.areaLabel ?? "Keine Area gesetzt"}
          />
          <FieldCard
            accent="var(--accent-blue)"
            label="Linked Tasks"
            value={`${workbench.metrics.openTasks} offen / ${workbench.metrics.completedTasks} erledigt`}
          />
          <FieldCard
            accent="var(--accent-green)"
            label="Terminiert"
            value={`${workbench.metrics.scheduledTasks} terminierte Tasks`}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        <WorkbenchCreateSection
          description={
            disabled
              ? "Wechsle ins Manual-Profil, um echte Project-Daten zu bearbeiten."
              : "Aktualisiert Titel, Summary, Next Action und Status des ausgewählten Projects."
          }
          heading="Project bearbeiten"
          id="project-edit-heading"
        >
          <ProjectEditForm disabled={disabled} project={project} />
        </WorkbenchCreateSection>

        <WorkbenchCreateSection
          description={
            disabled
              ? "Wechsle ins Manual-Profil, um echte Project Tasks zu erstellen."
              : "Persistiert eine Task mit diesem Project als Kontext."
          }
          heading="Linked Task für Project erstellen"
          id="project-task-create-heading"
        >
          <WorkbenchTaskCreateForm
            context={{
              ariaLabel: "Project Task erstellen",
              contextPlaceholder: "Optionaler Project-Kontext",
              entity: project,
              hiddenIdName: "projectId",
              returnView: "projects",
              selectedIdName: "selectedProjectId",
              titlePlaceholder: "Nächster Project Task",
            }}
            disabled={disabled}
          />
        </WorkbenchCreateSection>

        <section aria-labelledby="project-linked-tasks-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              className="text-[13px] font-semibold text-[var(--text-primary)]"
              id="project-linked-tasks-heading"
            >
              Linked Tasks
            </h3>
            <Pill accent="var(--accent-blue)">
              {workbench.metrics.totalTasks} total
            </Pill>
          </div>
          <WorkbenchSectionIntro>
            Mit diesem Project verknüpft. Lifecycle- und Scheduling-Controls
            sind echte Task Actions.
          </WorkbenchSectionIntro>
          <div className="mt-2 grid gap-2">
            {workbench.linkedTasks.length === 0 ? (
              <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.38)] px-3 py-2 text-[11px] leading-4 text-[var(--text-muted)]">
                Keine verknüpften Tasks.
              </p>
            ) : null}
            {workbench.nextTasks.length > 0 ? (
              workbench.nextTasks.map((task) => (
                <ProjectTaskCard
                  key={`project-open-task-${task.id}`}
                  profileId={profileId}
                  task={task}
                />
              ))
            ) : null}
            {workbench.completedTasks.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                  Completed
                </p>
                {workbench.completedTasks.map((task) => (
                  <ProjectTaskCard
                    key={`project-completed-task-${task.id}`}
                    profileId={profileId}
                    task={task}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <WorkbenchResourcesSection resources={project.linkedResources ?? []} />

        <WorkbenchCreateSection
          description={
            disabled
              ? "Wechsle ins Manual-Profil, um echte Projects zu archivieren."
              : "Archiviert das Project per Soft Archive. Aktive Portfolio-Listen blenden es danach aus."
          }
          heading="Project archivieren"
          id="project-archive-heading"
        >
          <ProjectArchiveForm disabled={disabled} projectId={project.id} />
        </WorkbenchCreateSection>

        <section aria-labelledby="project-prepared-sections-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="project-prepared-sections-heading"
          >
            Prepared / Future Sections
          </h3>
          <div className="mt-2 grid gap-2">
            <PreparedWorkbenchSection
              body="Vorbereitet: noch nicht mit lokaler Datenquelle verbunden. Linked Tasks sind aktiv; Milestones folgen als eigener F1.1 Slice."
              title="Milestones"
            />
            <PreparedWorkbenchSection
              body="Vorbereitet: kein persistentes Project Log in diesem Workbench. Review/Execution bleibt eigener Slice."
              title="Project Log"
            />
          </div>
        </section>

        <WorkbenchFutureScopeNote body="Future Scope: Project Edit, Status und Soft Archive sind verbunden. Milestones, Project Log, Project Undo, Graph und AI Coach schreiben hier noch keine Persistenz." />
      </div>
    </section>
  );
}

function contentStateAttributes(
  meta: ContentStateMeta,
  profileId: PortfolioViewModel["profileId"],
) {
  return {
    "data-capacity": meta.capacity?.toString() ?? undefined,
    "data-content-state": meta.state,
    "data-item-count": meta.itemCount.toString(),
    "data-profile-id": profileId,
  };
}

export function PortfolioContextPanel({
  allEntities,
  contentState,
  entity,
  profileId,
}: Readonly<{
  allEntities: readonly PortfolioEntity[];
  contentState: ContentStateMeta;
  entity: PortfolioEntity | null;
  profileId: PortfolioViewModel["profileId"];
}>) {
  if (!entity) {
    return (
      <aside
        className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.84)] p-3 shadow-[0_8px_22px_rgba(0,0,0,.12)]"
        data-portfolio-section="context-panel"
        {...contentStateAttributes(contentState, profileId)}
      >
        <EmptyState
          description="Wähle eine Entity oder einen breiteren Scope, um Kontext, Quellen und Review-Hinweise zu sehen."
          title="Keine Entity ausgewählt"
        />
      </aside>
    );
  }

  const typeAccent = portfolioTypeAccent[entity.type];
  const area = portfolioAreaMeta[entity.area];
  const status = portfolioStatusMeta[entity.status];
  const primaryReason = getPortfolioPrimaryReason(entity);
  const reason = portfolioVisibilityReasonMeta[primaryReason];
  const entityRoute = getPortfolioEntitySourceRoute(entity);
  const sourceLink =
    entity.sourceLinks.find((link) => link.href !== entityRoute) ??
    entity.sourceLinks[0] ??
    null;
  const isGoalWorkbench = entity.type === "goal";
  const isProjectWorkbench = entity.type === "project";
  const skillEvidenceRows =
    entity.type === "skill" ? (entity.skillContext?.evidenceRows ?? []) : [];

  return (
    <aside
      aria-labelledby="selected-entity-heading"
      className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:min-h-0"
      data-portfolio-section="context-panel"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.50)] px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-orange)]">
              Selected Entity
            </p>
            <h2
              className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
              id="selected-entity-heading"
            >
              {entity.title}
            </h2>
            <p className="mt-1 max-w-xl text-[11px] leading-4 text-[var(--text-secondary)]">
              {entity.description}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Pill accent={typeAccent}>{portfolioTypeLabels[entity.type]}</Pill>
            <Pill accent={area.accent}>{area.label}</Pill>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ActionLink href={entityRoute}>
            Open {portfolioTypeLabels[entity.type].toLowerCase()}
          </ActionLink>
          {sourceLink ? (
            <ActionLink href={sourceLink.href}>Open source</ActionLink>
          ) : null}
          {profileId === "manual" && entity.type === "task" ? (
            <TaskLifecycleActions entity={entity} />
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 p-3 xl:max-h-[calc(100dvh-25rem)] xl:overflow-y-auto">
        <div className="grid gap-2 sm:grid-cols-2">
          <FieldCard
            accent={typeAccent}
            label="Type"
            value={portfolioTypeLabels[entity.type]}
          />
          <FieldCard accent={area.accent} label="Area" value={area.label} />
          <FieldCard
            accent={status.accent}
            label="Status"
            value={status.label}
          />
          <FieldCard
            accent={reason.accent}
            label="Why visible"
            value={reason.label}
          />
          <FieldCard
            accent={typeAccent}
            label="Priority / Focus"
            value={`${entity.priority} / ${portfolioFocusLabels[entity.focusLevel]}`}
          />
          <FieldCard
            accent={typeAccent}
            label="Progress-Signal / Count"
            value={`${entity.progress}% / ${entity.countLabel}`}
          />
        </div>

        <div className="grid gap-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(148,163,184,.14)]">
            <div
              aria-hidden="true"
              className="h-full rounded-full bg-[var(--accent)]"
              style={{
                ...accentStyle(typeAccent),
                width: progressWidth(entity.progress),
              }}
            />
          </div>
          <p className="text-[10px] leading-4 text-[var(--text-muted)]">
            {getProgressSignalNote(entity)}
          </p>
        </div>

        {isProjectWorkbench ? (
          <ProjectWorkbench
            entities={allEntities}
            profileId={profileId}
            project={entity}
          />
        ) : null}

        {isGoalWorkbench ? (
          <GoalWorkbench
            entities={allEntities}
            goal={entity}
            profileId={profileId}
          />
        ) : null}

        {entity.type === "skill" && entity.skillContext ? (
          <section aria-labelledby="entity-skill-context-heading">
            <h3
              className="text-[13px] font-semibold text-[var(--text-primary)]"
              id="entity-skill-context-heading"
            >
              Practice / Learning Signal
            </h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <FieldCard
                accent="var(--accent-cyan)"
                label="Practice Status"
                value={entity.skillContext.practiceStatus}
              />
              <FieldCard
                accent="var(--accent-cyan)"
                label="Confidence"
                value={entity.skillContext.confidence}
              />
              <FieldCard
                accent="var(--accent-orange)"
                label="Next Session"
                value={entity.skillContext.nextSession}
              />
              <FieldCard
                accent="var(--text-muted)"
                label="Evidence"
                value={entity.skillContext.evidence}
              />
            </div>
            <div className="mt-3 grid gap-3">
              <WorkbenchCreateSection
                description={
                  profileId === "manual"
                    ? "Aktualisiert die ausgewählte Skill über die bestehende Skill Action."
                    : "Wechsle ins Manual-Profil, um echte Skill-Daten zu bearbeiten."
                }
                heading="Skill bearbeiten"
                id="skill-edit-heading"
              >
                <SkillEditForm
                  disabled={profileId !== "manual"}
                  entity={entity}
                />
              </WorkbenchCreateSection>

              <WorkbenchCreateSection
                description={
                  profileId === "manual"
                    ? "Speichert eine Evidence-Zeile für die ausgewählte Skill. Source Targets sind echte Manual-DB-Objekte."
                    : "Wechsle ins Manual-Profil, um echte Skill Evidence zu speichern."
                }
                heading="Evidence hinzufügen"
                id="skill-evidence-create-heading"
              >
                <SkillEvidenceCreateForm
                  disabled={profileId !== "manual"}
                  skillId={entity.id}
                  sourceTargets={entity.skillContext.sourceTargets}
                />
              </WorkbenchCreateSection>

              <section aria-labelledby="skill-evidence-heading">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3
                    className="text-[13px] font-semibold text-[var(--text-primary)]"
                    id="skill-evidence-heading"
                  >
                    Evidence
                  </h3>
                  <Pill accent="var(--accent-cyan)">
                    {skillEvidenceRows.length} total
                  </Pill>
                </div>
                <div className="mt-2 grid gap-2">
                  {skillEvidenceRows.length > 0 ? (
                    skillEvidenceRows.map((evidence, index) => (
                      <article
                        className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] p-3"
                        key={`skill-evidence-${entity.id}-${evidence.id ?? index}-${evidence.title}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
                              {evidence.title}
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                              {[
                                evidence.evidenceDate,
                                evidence.sourceType,
                                evidence.weight ? `weight ${evidence.weight}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {evidence.detail ? (
                              <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                                {evidence.detail}
                              </p>
                            ) : null}
                          </div>
                          <Pill accent="var(--accent-cyan)">
                            {evidence.sourceLabel}
                          </Pill>
                        </div>
                        {evidence.id ? (
                          <form
                            action={deleteSkillEvidenceFormAction}
                            aria-label={`Evidence löschen ${evidence.title}`}
                            className="mt-2"
                          >
                            <input
                              name="evidenceId"
                              type="hidden"
                              value={evidence.id}
                            />
                            <input name="skillId" type="hidden" value={entity.id} />
                            <button
                              aria-label={`Evidence löschen ${evidence.title}`}
                              className="inline-flex min-h-8 items-center rounded-full border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.10)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(221,107,95,.44)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[rgba(18,28,43,.34)] disabled:text-[var(--text-muted)]"
                              disabled={profileId !== "manual"}
                              type="submit"
                            >
                              Evidence löschen
                            </button>
                          </form>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.38)] px-3 py-2 text-[11px] leading-4 text-[var(--text-muted)]">
                      Noch keine Skill Evidence gespeichert.
                    </p>
                  )}
                </div>
              </section>

              <WorkbenchCreateSection
                description="Archiviert die Skill per Soft Archive. Die aktive Skills View blendet archivierte Skills aus."
                heading="Skill archivieren"
                id="skill-archive-heading"
              >
                <SkillArchiveForm
                  disabled={profileId !== "manual"}
                  skillId={entity.id}
                />
              </WorkbenchCreateSection>

              <section aria-labelledby="skill-prepared-sections-heading">
                <h3
                  className="text-[13px] font-semibold text-[var(--text-primary)]"
                  id="skill-prepared-sections-heading"
                >
                  Prepared Sections
                </h3>
                <div className="mt-2 grid gap-2">
                  <PreparedWorkbenchSection
                    body="Project-Verknüpfungen folgen in einem separaten Relation-Scope."
                    title="Related Projects"
                  />
                  <PreparedWorkbenchSection
                    body="Resource-Verknüpfungen folgen ohne Fake-Karten."
                    title="Related Resources"
                  />
                  <PreparedWorkbenchSection
                    body="Skill Map bleibt vorbereitet und rendert noch keinen Graph."
                    title="Skill Map"
                  />
                </div>
              </section>
            </div>
          </section>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <FieldCard
            accent="var(--accent-orange)"
            label="Next Action"
            value={entity.nextAction}
          />
          <FieldCard
            accent="var(--accent-blue)"
            label="Review Status"
            value={
              entity.reviewNeeded
                ? "Needs weekly review note"
                : "No review note needed"
            }
          />
        </div>

        <section aria-labelledby="entity-relations-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="entity-relations-heading"
          >
            Relations
          </h3>
          <div className="mt-2 grid gap-1.5">
            {entity.relations.map((relation, index) => (
              <div
                className="flex min-h-8 items-center justify-between gap-3 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] px-3 text-[11px]"
                key={`portfolio-relation-${index}`}
              >
                <span className="font-semibold text-[var(--text-muted)]">
                  {relation.label}
                </span>
                <span className="min-w-0 truncate text-right text-[var(--text-secondary)]">
                  {relation.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="entity-decisions-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="entity-decisions-heading"
          >
            Decision Needed
          </h3>
          <div className="mt-2 grid gap-1.5">
            {entity.decisions.length > 0 ? (
              entity.decisions.map((decision, index) => (
                <article
                  className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,rgba(11,17,28,.48))] px-3 py-2"
                  key={`portfolio-decision-${index}`}
                  style={accentStyle(decisionAccent(decision))}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
                        {decision.title}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
                        {decision.detail}
                      </p>
                    </div>
                    <Pill accent={decisionAccent(decision)}>
                      {decision.state}
                    </Pill>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.38)] px-3 py-2 text-[11px] leading-4 text-[var(--text-muted)]">
                No explicit decision is open for this entity.
              </p>
            )}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <section aria-labelledby="entity-source-links-heading">
            <h3
              className="text-[13px] font-semibold text-[var(--text-primary)]"
              id="entity-source-links-heading"
            >
              Source Links
            </h3>
            <div className="mt-2 grid gap-1.5">
              {entity.sourceLinks.map((link) => (
                <Link
                  className="flex min-h-8 items-center justify-between gap-3 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] px-3 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  href={link.href}
                  key={`${link.href}-${link.label}`}
                >
                  <span className="min-w-0 truncate">{link.label}</span>
                  <span aria-hidden="true" className="text-[var(--text-muted)]">
                    {">"}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="entity-notes-heading">
            <h3
              className="text-[13px] font-semibold text-[var(--text-primary)]"
              id="entity-notes-heading"
            >
              Quick Notes / Review Snippet
            </h3>
            <div className="mt-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3">
              <p className="text-[11px] leading-4 text-[var(--text-secondary)]">
                {entity.noteSnippet}
              </p>
              <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
                Portfolio reads this snippet only. Source editing belongs in the
                entity workbench or detail page.
              </p>
            </div>
          </section>
        </div>

        <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.32)] px-3 py-2 text-[10px] leading-4 text-[var(--text-muted)]">
          Boundary: Portfolio shows entities and filters. It does not duplicate
          tasks, projects, goals or skills.
        </p>
      </div>
    </aside>
  );
}
