import Link from "next/link";
import type { ReactNode } from "react";
import {
  EmptyState,
  PageHeader,
  Pill,
  RoutePage,
  SectionPanel,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import {
  entityAreaMeta,
  entityKindMeta,
  getEntityHref,
  getFilteredWorkbenchItems,
  getGoal,
  getGoalMilestones,
  getGoalProjects,
  getGoalTasks,
  getProject,
  getProjectGoal,
  getProjectMilestones,
  getProjectTasks,
  getSkill,
  getSkillMilestones,
  getSkillProjects,
  getSkillTasks,
  getTask,
  getTaskGoal,
  getTaskProject,
  getTaskSkill,
  goalStatusMeta,
  milestoneStatusMeta,
  projectStatusMeta,
  skillStatusMeta,
  taskStatusMeta,
} from "./entity-selectors";
import type {
  EntityActivity,
  EntityEvidence,
  EntityKind,
  EntityMilestone,
  LifeGoal,
  LifeProject,
  LifeSkill,
  LifeTask,
  WorkbenchSearchParams,
} from "./types";

type FilterOption = {
  label: string;
  value: string;
};

type WorkbenchConfig = {
  kind: EntityKind;
  title: string;
  eyebrow: string;
  summary: string;
  filters: readonly FilterOption[];
  sorts: readonly FilterOption[];
  emptyTitle: string;
  emptyDescription: string;
};

const workbenchConfigs: Record<EntityKind, WorkbenchConfig> = {
  task: {
    kind: "task",
    title: "Tasks",
    eyebrow: "Entity workbench",
    summary:
      "Operative Arbeitseinheiten mit Status, Zeitkontext, naechstem Schritt und Project-/Goal-Bezug.",
    filters: [
      { label: "All", value: "all" },
      { label: "Today", value: "today" },
      { label: "Active", value: "active" },
      { label: "Planned", value: "planned" },
      { label: "Waiting", value: "waiting" },
      { label: "Done", value: "done" },
      { label: "Review needed", value: "review" },
    ],
    sorts: [
      { label: "Priority", value: "priority" },
      { label: "Due date", value: "due" },
      { label: "Start time", value: "start" },
      { label: "Duration", value: "duration" },
      { label: "Project", value: "project" },
    ],
    emptyTitle: "No tasks in this scope",
    emptyDescription:
      "Adjust the filter or pull a next action from Inbox during review.",
  },
  project: {
    kind: "project",
    title: "Projects",
    eyebrow: "Entity workbench",
    summary:
      "Mehrstufige Arbeitscontainer mit Ergebnis, Task-Flow, Meilensteinen, Risiken und Fortschritt.",
    filters: [
      { label: "Active", value: "active" },
      { label: "Focus this week", value: "focus" },
      { label: "Paused", value: "paused" },
      { label: "Blocked", value: "blocked" },
      { label: "Completed", value: "completed" },
      { label: "Archived", value: "archived" },
      { label: "All", value: "all" },
    ],
    sorts: [
      { label: "Priority", value: "priority" },
      { label: "Deadline", value: "deadline" },
      { label: "Progress", value: "progress" },
      { label: "Recently updated", value: "updated" },
      { label: "Area", value: "area" },
    ],
    emptyTitle: "No projects in this scope",
    emptyDescription:
      "Projects should only appear here when they have a clear next step or review reason.",
  },
  goal: {
    kind: "goal",
    title: "Goals",
    eyebrow: "Entity workbench",
    summary:
      "Richtungen und Ergebnismaße mit Why, Fortschritt, Projekten und naechstem Entscheidungsdruck.",
    filters: [
      { label: "Active", value: "active" },
      { label: "This quarter", value: "quarter" },
      { label: "This month", value: "month" },
      { label: "This week", value: "week" },
      { label: "Paused", value: "paused" },
      { label: "Completed", value: "completed" },
      { label: "All", value: "all" },
    ],
    sorts: [
      { label: "Horizon", value: "horizon" },
      { label: "Progress", value: "progress" },
      { label: "Area", value: "area" },
      { label: "Recently updated", value: "updated" },
    ],
    emptyTitle: "No goals in this scope",
    emptyDescription:
      "Goals stay quiet until they have a measure, a horizon or linked work.",
  },
  skill: {
    kind: "skill",
    title: "Skills",
    eyebrow: "Entity workbench",
    summary:
      "Faehigkeiten als Lernpfade mit Practice Tasks, Evidence und verknuepften Projekten/Zielen.",
    filters: [
      { label: "Active", value: "active" },
      { label: "Learning", value: "learning" },
      { label: "Practicing", value: "practicing" },
      { label: "Maintained", value: "maintained" },
      { label: "Paused", value: "paused" },
      { label: "All", value: "all" },
    ],
    sorts: [
      { label: "Level", value: "level" },
      { label: "Focus this week", value: "focus" },
      { label: "Recently practiced", value: "recent" },
      { label: "Area", value: "area" },
    ],
    emptyTitle: "No skills in this scope",
    emptyDescription:
      "Skills should show practice and evidence, not just a decorative progress number.",
  },
};

function progressWidth(progress: number) {
  return `${Math.max(0, Math.min(100, progress))}%`;
}

function searchValue(searchParams: WorkbenchSearchParams, key: string) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function controlHref(
  route: `/${string}`,
  key: "filter" | "sort",
  value: string,
): `/${string}` {
  const searchParams = new URLSearchParams();

  if (
    !(
      (key === "filter" && value === "active") ||
      (key === "sort" && ["priority", "horizon", "level"].includes(value))
    )
  ) {
    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return query ? `${route}?${query}` : route;
}

function ProgressBar({
  progress,
  accent,
  label = "Progress",
}: Readonly<{
  progress: number;
  accent: string;
  label?: string;
}>) {
  return (
    <div className="grid gap-1.5" style={accentStyle(accent)}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-[var(--text-muted)]">{label}</span>
        <span className="font-semibold text-[var(--text-secondary)]">
          {progress}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(148,163,184,.14)]">
        <div
          aria-hidden="true"
          className="h-full rounded-full bg-[var(--accent)]"
          style={{ width: progressWidth(progress) }}
        />
      </div>
    </div>
  );
}

function Controls({
  label,
  options,
  activeValue,
  route,
  paramKey,
}: Readonly<{
  label: string;
  options: readonly FilterOption[];
  activeValue: string;
  route: `/${string}`;
  paramKey: "filter" | "sort";
}>) {
  return (
    <section
      aria-label={label}
      className="rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 text-xs font-semibold text-[var(--text-muted)]">
          {label}
        </p>
        {options.map((option) => {
          const active = option.value === activeValue;

          return (
            <Link
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "rounded-full border border-[color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  : "rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              }
              href={controlHref(route, paramKey, option.value)}
              key={option.value}
              style={accentStyle("var(--accent-cyan)")}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MetaField({
  label,
  value,
}: Readonly<{
  label: string;
  value: ReactNode;
}>) {
  return (
    <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
        {value}
      </dd>
    </div>
  );
}

function ActionButton({
  children,
  quiet = false,
}: Readonly<{
  children: ReactNode;
  quiet?: boolean;
}>) {
  return (
    <button
      className={
        quiet
          ? "inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] px-3 text-xs font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          : "inline-flex min-h-9 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--accent)_13%,transparent)] px-3 text-xs font-semibold text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      }
      style={accentStyle("var(--accent-cyan)")}
      type="button"
    >
      {children}
    </button>
  );
}

function EntityCard({
  item,
  kind,
}: Readonly<{
  item: LifeTask | LifeProject | LifeGoal | LifeSkill;
  kind: EntityKind;
}>) {
  const meta = entityKindMeta[kind];
  const area = entityAreaMeta[item.areaId];
  const href = getEntityHref(kind, item.id);
  const status =
    kind === "task"
      ? taskStatusMeta[(item as LifeTask).status]
      : kind === "project"
        ? projectStatusMeta[(item as LifeProject).status]
        : kind === "goal"
          ? goalStatusMeta[(item as LifeGoal).status]
          : skillStatusMeta[(item as LifeSkill).status];
  const progress =
    "progress" in item ? item.progress : (item.status === "done" ? 100 : 0);
  const next =
    "nextStep" in item
      ? item.nextStep
      : "nextPractice" in item
        ? item.nextPractice
        : "";

  return (
    <Link
      className="block rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_5%,#101827)] p-4 transition hover:border-[color-mix(in_srgb,var(--accent)_38%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      href={href}
      style={accentStyle(meta.accent)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {meta.label}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {item.title}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-secondary)]">
            {item.description}
          </p>
        </div>
        <div className="flex flex-wrap justify-start gap-1.5 sm:justify-end">
          <Pill accent={status.accent}>{status.label}</Pill>
          <Pill accent={area.accent}>{area.label}</Pill>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-muted)]">Next:</span>{" "}
        {next}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {"priority" in item ? (
          <MetaField label="Priority" value={item.priority} />
        ) : null}
        {kind === "task" ? (
          <MetaField
            label="Time"
            value={`${(item as LifeTask).date ?? "unscheduled"}${
              (item as LifeTask).startTime
                ? ` / ${(item as LifeTask).startTime}`
                : ""
            } / ${(item as LifeTask).durationMinutes ?? 0} min`}
          />
        ) : null}
        {kind === "project" ? (
          <MetaField
            label="Deadline"
            value={(item as LifeProject).deadline ?? "No deadline"}
          />
        ) : null}
        {kind === "goal" ? (
          <MetaField label="Measure" value={(item as LifeGoal).measure} />
        ) : null}
        {kind === "skill" ? (
          <MetaField
            label="Practice"
            value={(item as LifeSkill).practiceFrequency}
          />
        ) : null}
      </div>
      <div className="mt-4">
        <ProgressBar
          accent={meta.accent}
          label={kind === "skill" ? "Practice progress" : "Progress"}
          progress={progress}
        />
      </div>
    </Link>
  );
}

function PreviewPanel({
  item,
  kind,
}: Readonly<{
  item: LifeTask | LifeProject | LifeGoal | LifeSkill | null;
  kind: EntityKind;
}>) {
  if (!item) {
    return (
      <SectionPanel
        className="xl:sticky xl:top-4"
        subtitle="The preview follows the active filter."
        title="Preview"
      >
        <EmptyState
          description="No entity is available for this filter. The detail pages still keep their own not-found state."
          title="Nothing selected"
        />
      </SectionPanel>
    );
  }

  const href = getEntityHref(kind, item.id);
  const meta = entityKindMeta[kind];

  return (
    <SectionPanel
      className="xl:sticky xl:top-4"
      subtitle="Compact inspector for the first visible entity."
      title="Preview"
    >
      <div style={accentStyle(meta.accent)}>
        <Pill accent={meta.accent}>{meta.label}</Pill>
        <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
          {item.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {item.description}
        </p>
        <div className="mt-4">
          <ProgressBar
            accent={meta.accent}
            label={kind === "skill" ? "Practice progress" : "Progress"}
            progress={"progress" in item ? item.progress : 0}
          />
        </div>
        <Link
          className="mt-4 inline-flex min-h-9 items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-3 text-xs font-semibold text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          href={href}
        >
          Open detail
        </Link>
      </div>
    </SectionPanel>
  );
}

export function EntityWorkbenchPage({
  kind,
  searchParams,
}: Readonly<{
  kind: EntityKind;
  searchParams: WorkbenchSearchParams;
}>) {
  const config = workbenchConfigs[kind];
  const route = entityKindMeta[kind].route;
  const activeFilter =
    searchValue(searchParams, "filter") ??
    (kind === "task" ? "all" : "active");
  const activeSort =
    searchValue(searchParams, "sort") ??
    (kind === "goal" ? "horizon" : kind === "skill" ? "level" : "priority");
  const items = getFilteredWorkbenchItems(kind, searchParams);
  const selected = items[0] ?? null;

  return (
    <RoutePage>
      <PageHeader
        eyebrow={config.eyebrow}
        summary={config.summary}
        title={config.title}
      />
      <Controls
        activeValue={activeFilter}
        label="Filter"
        options={config.filters}
        paramKey="filter"
        route={route}
      />
      <Controls
        activeValue={activeSort}
        label="Sort"
        options={config.sorts}
        paramKey="sort"
        route={route}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section
          aria-label={`${config.title} list`}
          className="grid min-w-0 gap-3"
        >
          {items.length > 0 ? (
            items.map((item) => (
              <EntityCard item={item} key={item.id} kind={kind} />
            ))
          ) : (
            <SectionPanel title={config.emptyTitle}>
              <EmptyState
                description={config.emptyDescription}
                title={config.emptyTitle}
              />
            </SectionPanel>
          )}
        </section>
        <PreviewPanel item={selected} kind={kind} />
      </div>
    </RoutePage>
  );
}

function DetailShell({
  children,
  eyebrow,
  title,
  summary,
  accent,
  pills,
  primaryAction,
}: Readonly<{
  children: ReactNode;
  eyebrow: string;
  title: string;
  summary: string;
  accent: string;
  pills: ReactNode;
  primaryAction?: ReactNode;
}>) {
  return (
    <RoutePage>
      <header
        className="rounded-[var(--panel-radius)] border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_5%,var(--surface-1))] px-5 py-5 shadow-[0_8px_22px_rgba(0,0,0,.12)]"
        style={accentStyle(accent)}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {summary}
            </p>
          </div>
          <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
            {pills}
          </div>
        </div>
        {primaryAction ? <div className="mt-5">{primaryAction}</div> : null}
      </header>
      {children}
    </RoutePage>
  );
}

function MissingEntity({
  kind,
  id,
}: Readonly<{
  kind: EntityKind;
  id: string;
}>) {
  const meta = entityKindMeta[kind];

  return (
    <RoutePage>
      <PageHeader
        eyebrow={`${meta.label} detail`}
        summary={`No mock ${meta.label.toLowerCase()} exists for id "${id}". The route is available, but no backend lookup runs in Phase 2.`}
        title={`${meta.label} not found`}
      />
      <SectionPanel title="Next step">
        <Link
          className="inline-flex min-h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.06)] px-3 text-xs font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          href={meta.route}
        >
          Back to {meta.plural}
        </Link>
      </SectionPanel>
    </RoutePage>
  );
}

function EvidenceList({
  items,
}: Readonly<{
  items: readonly EntityEvidence[];
}>) {
  if (items.length === 0) {
    return (
      <EmptyState
        description="No notes or evidence are attached in the static mock data."
        title="No evidence yet"
      />
    );
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <article
          className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3"
          key={`${item.title}-${item.sourceLabel}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {item.title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                {item.detail}
              </p>
            </div>
            {item.href ? (
              <Link
                className="rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.06)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                href={item.href}
              >
                {item.sourceLabel}
              </Link>
            ) : (
              <Pill quiet>{item.sourceLabel}</Pill>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function ActivityList({
  items,
}: Readonly<{
  items: readonly EntityActivity[];
}>) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <article
          className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3"
          key={`${item.label}-${item.dateLabel}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {item.label}
              </h3>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                {item.detail}
              </p>
            </div>
            <Pill quiet>{item.dateLabel}</Pill>
          </div>
        </article>
      ))}
    </div>
  );
}

function MilestoneList({
  milestones,
}: Readonly<{
  milestones: readonly EntityMilestone[];
}>) {
  return (
    <div className="grid gap-2">
      {milestones.map((milestone) => {
        const status = milestoneStatusMeta[milestone.status];

        return (
          <article
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3"
            key={milestone.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {milestone.title}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Due: {milestone.dueDate ?? "No due date"} / linked tasks:{" "}
                  {milestone.linkedTaskIds?.length ?? 0}
                </p>
              </div>
              <Pill accent={status.accent}>{status.label}</Pill>
            </div>
            <div className="mt-3">
              <ProgressBar
                accent={status.accent}
                label="Milestone progress"
                progress={milestone.progress}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TaskRows({
  tasks,
}: Readonly<{
  tasks: readonly LifeTask[];
}>) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        description="No linked task is attached in the current mock data."
        title="No linked tasks"
      />
    );
  }

  return (
    <div className="grid gap-2">
      {tasks.map((task) => {
        const status = taskStatusMeta[task.status];

        return (
          <Link
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3 transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            href={getEntityHref("task", task.id)}
            key={task.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {task.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  {task.nextStep}
                </p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {task.date ?? "unscheduled"}{" "}
                  {task.startTime ? `/ ${task.startTime}` : ""} /{" "}
                  {task.durationMinutes ?? 0} min
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Pill accent={status.accent}>{status.label}</Pill>
                <Pill quiet>{task.priority}</Pill>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ProjectRows({
  projects,
}: Readonly<{
  projects: readonly LifeProject[];
}>) {
  if (projects.length === 0) {
    return (
      <EmptyState
        description="No linked project is attached in the current mock data."
        title="No linked projects"
      />
    );
  }

  return (
    <div className="grid gap-2">
      {projects.map((project) => {
        const status = projectStatusMeta[project.status];

        return (
          <Link
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3 transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            href={getEntityHref("project", project.id)}
            key={project.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {project.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  {project.nextStep}
                </p>
              </div>
              <Pill accent={status.accent}>{status.label}</Pill>
            </div>
            <div className="mt-3">
              <ProgressBar
                accent="var(--accent-orange)"
                label="Project progress"
                progress={project.progress}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function TaskDetail({ taskId }: Readonly<{ taskId: string }>) {
  const task = getTask(taskId);

  if (!task) return <MissingEntity id={taskId} kind="task" />;

  const status = taskStatusMeta[task.status];
  const area = entityAreaMeta[task.areaId];
  const project = getTaskProject(task);
  const goal = getTaskGoal(task);
  const skill = getTaskSkill(task);

  return (
    <DetailShell
      accent="var(--accent-blue)"
      eyebrow="Task detail"
      pills={
        <>
          <Pill accent={status.accent}>{status.label}</Pill>
          <Pill accent={area.accent}>{area.label}</Pill>
          <Pill quiet>{task.priority}</Pill>
        </>
      }
      primaryAction={<ActionButton>Mark active</ActionButton>}
      summary={task.description}
      title={task.title}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <SectionPanel subtitle="Smallest executable unit." title="Overview">
            <dl className="grid gap-3 sm:grid-cols-2">
              <MetaField label="Date" value={task.date ?? "Unscheduled"} />
              <MetaField label="Start time" value={task.startTime ?? "Flexible"} />
              <MetaField
                label="Duration"
                value={`${task.durationMinutes ?? 0} min`}
              />
              <MetaField label="Energy" value={task.energy ?? "Any"} />
              <MetaField
                label="Review"
                value={task.reviewNeeded ? "Review needed" : "No review flag"}
              />
              <MetaField label="Source" value={task.source ?? "Manual"} />
            </dl>
          </SectionPanel>
          <SectionPanel
            subtitle="Next step first, result note second."
            title="Next Step / Result"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <MetaField label="Next step" value={task.nextStep} />
              <MetaField label="Result note" value={task.resultNote ?? "Open"} />
            </div>
          </SectionPanel>
          <SectionPanel subtitle="Task lifecycle." title="Timeline">
            <ActivityList items={task.timeline} />
          </SectionPanel>
          <SectionPanel subtitle="Notes, sources and evidence." title="Evidence">
            <EvidenceList items={task.evidence} />
          </SectionPanel>
        </div>
        <aside className="grid gap-4 xl:content-start">
          <SectionPanel title="Linked Work">
            <div className="grid gap-2">
              {project ? (
                <Link
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3 text-sm font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  href={getEntityHref("project", project.id)}
                >
                  Project: {project.title}
                </Link>
              ) : null}
              {goal ? (
                <Link
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3 text-sm font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  href={getEntityHref("goal", goal.id)}
                >
                  Goal: {goal.title}
                </Link>
              ) : null}
              {skill ? (
                <Link
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3 text-sm font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  href={getEntityHref("skill", skill.id)}
                >
                  Skill: {skill.title}
                </Link>
              ) : null}
              {!project && !goal && !skill ? (
                <EmptyState
                  description="This task has no larger object attached."
                  title="No parent relation"
                />
              ) : null}
            </div>
          </SectionPanel>
          <SectionPanel subtitle="Mock-only local actions." title="Actions">
            <div className="flex flex-wrap gap-2">
              <ActionButton>Mark done</ActionButton>
              <ActionButton quiet>Reschedule</ActionButton>
              <ActionButton quiet>Move to waiting</ActionButton>
            </div>
          </SectionPanel>
        </aside>
      </div>
    </DetailShell>
  );
}

function ProjectDetail({ projectId }: Readonly<{ projectId: string }>) {
  const project = getProject(projectId);

  if (!project) return <MissingEntity id={projectId} kind="project" />;

  const status = projectStatusMeta[project.status];
  const area = entityAreaMeta[project.areaId];
  const tasks = getProjectTasks(project);
  const milestones = getProjectMilestones(project);
  const goal = getProjectGoal(project);
  const activeTask =
    tasks.find((task) => task.status === "active") ?? tasks[0] ?? null;

  return (
    <DetailShell
      accent="var(--accent-orange)"
      eyebrow="Project detail"
      pills={
        <>
          <Pill accent={status.accent}>{status.label}</Pill>
          <Pill accent={area.accent}>{area.label}</Pill>
          <Pill quiet>{project.priority}</Pill>
          <Pill quiet>{project.phase}</Pill>
        </>
      }
      primaryAction={
        activeTask ? (
          <Link
            className="inline-flex min-h-9 items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--accent)_13%,transparent)] px-3 text-xs font-semibold text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            href={getEntityHref("task", activeTask.id)}
            style={accentStyle("var(--accent-orange)")}
          >
            Open next task
          </Link>
        ) : (
          <ActionButton>Plan next task</ActionButton>
        )
      }
      summary={project.description}
      title={project.title}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <SectionPanel subtitle="Outcome, phase and deadline." title="Overview">
            <dl className="grid gap-3 sm:grid-cols-2">
              <MetaField label="Next step" value={project.nextStep} />
              <MetaField label="Deadline" value={project.deadline ?? "Open"} />
              <MetaField label="Phase" value={project.phase} />
              <MetaField
                label="Week focus"
                value={project.focusThisWeek ? "Focus this week" : "Not promoted"}
              />
            </dl>
            <div className="mt-4">
              <ProgressBar
                accent="var(--accent-orange)"
                label="Project progress"
                progress={project.progress}
              />
            </div>
          </SectionPanel>
          <SectionPanel
            subtitle="Grouped status flow, not a large kanban wall."
            title="Task Flow"
          >
            <div className="grid gap-3">
              {(["planned", "active", "waiting", "done"] as const).map(
                (statusKey) => {
                  const statusTasks = tasks.filter(
                    (task) => task.status === statusKey,
                  );

                  return (
                    <section
                      aria-label={`${taskStatusMeta[statusKey].label} tasks`}
                      className="grid gap-2"
                      key={statusKey}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          {taskStatusMeta[statusKey].label}
                        </h3>
                        <Pill accent={taskStatusMeta[statusKey].accent}>
                          {statusTasks.length}
                        </Pill>
                      </div>
                      {statusTasks.length > 0 ? (
                        <TaskRows tasks={statusTasks.slice(0, 8)} />
                      ) : (
                        <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.32)] px-3 py-2 text-xs text-[var(--text-muted)]">
                          No tasks in this flow state.
                        </p>
                      )}
                    </section>
                  );
                },
              )}
            </div>
            <Link
              className="mt-4 inline-flex min-h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.06)] px-3 text-xs font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              href="/tasks"
            >
              View all tasks
            </Link>
          </SectionPanel>
          <SectionPanel subtitle="Project milestones." title="Milestones">
            <MilestoneList milestones={milestones} />
          </SectionPanel>
          <SectionPanel subtitle="Recent changes and notes." title="Recent Activity">
            <ActivityList items={project.activity} />
          </SectionPanel>
        </div>
        <aside className="grid gap-4 xl:content-start">
          <SectionPanel subtitle="Blocker, risk and decision context." title="Risks">
            <div className="grid gap-3">
              <MetaField label="Risk" value={project.risk ?? "No risk flagged"} />
              <MetaField
                label="Blocker"
                value={project.blocker ?? "No blocker flagged"}
              />
            </div>
          </SectionPanel>
          <SectionPanel title="Linked Goal">
            {goal ? null : (
              <EmptyState
                description="No goal relation is attached."
                title="No linked goal"
              />
            )}
            {goal ? (
              <Link
                className="mt-3 block rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3 text-sm font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                href={getEntityHref("goal", goal.id)}
              >
                {goal.title} / contribution {project.progress}%
              </Link>
            ) : null}
          </SectionPanel>
          <SectionPanel subtitle="Notes, artifacts and review evidence." title="Resources">
            <EvidenceList items={project.notes} />
          </SectionPanel>
        </aside>
      </div>
    </DetailShell>
  );
}

function GoalDetail({ goalId }: Readonly<{ goalId: string }>) {
  const goal = getGoal(goalId);

  if (!goal) return <MissingEntity id={goalId} kind="goal" />;

  const status = goalStatusMeta[goal.status];
  const area = entityAreaMeta[goal.areaId];
  const projects = getGoalProjects(goal);
  const tasks = getGoalTasks(goal);
  const milestones = getGoalMilestones(goal);

  return (
    <DetailShell
      accent="var(--accent-purple)"
      eyebrow="Goal detail"
      pills={
        <>
          <Pill accent={status.accent}>{status.label}</Pill>
          <Pill accent={area.accent}>{area.label}</Pill>
          <Pill quiet>{goal.horizon}</Pill>
        </>
      }
      primaryAction={<ActionButton>Set next review point</ActionButton>}
      summary={goal.description}
      title={goal.title}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <SectionPanel subtitle="Direction, measurement and why." title="Outcome / Measure">
            <dl className="grid gap-3 sm:grid-cols-2">
              <MetaField label="Why" value={goal.why} />
              <MetaField label="Measure" value={goal.measure} />
              <MetaField label="Current" value={goal.currentValue} />
              <MetaField label="Target" value={goal.targetValue} />
              <MetaField label="Remaining" value={goal.remaining} />
              <MetaField label="Next step" value={goal.nextStep} />
            </dl>
            <div className="mt-4">
              <ProgressBar
                accent="var(--accent-purple)"
                label="Goal progress"
                progress={goal.progress}
              />
            </div>
          </SectionPanel>
          <SectionPanel subtitle="Projects that move this goal." title="Linked Projects">
            <ProjectRows projects={projects} />
          </SectionPanel>
          <SectionPanel subtitle="Open work attached to this goal." title="Linked Tasks">
            <TaskRows tasks={tasks} />
          </SectionPanel>
          <SectionPanel subtitle="Outcome milestones." title="Milestones">
            <MilestoneList milestones={milestones} />
          </SectionPanel>
        </div>
        <aside className="grid gap-4 xl:content-start">
          <SectionPanel subtitle="Review notes and open decisions." title="Review Notes">
            <EvidenceList items={goal.reviewNotes} />
          </SectionPanel>
          <SectionPanel subtitle="Mock-only local actions." title="Actions">
            <div className="flex flex-wrap gap-2">
              <ActionButton>Mark focus this week</ActionButton>
              <ActionButton quiet>Pause goal</ActionButton>
            </div>
          </SectionPanel>
        </aside>
      </div>
    </DetailShell>
  );
}

function SkillDetail({ skillId }: Readonly<{ skillId: string }>) {
  const skill = getSkill(skillId);

  if (!skill) return <MissingEntity id={skillId} kind="skill" />;

  const status = skillStatusMeta[skill.status];
  const area = entityAreaMeta[skill.areaId];
  const tasks = getSkillTasks(skill);
  const projects = getSkillProjects(skill);
  const milestones = getSkillMilestones(skill);

  return (
    <DetailShell
      accent="var(--accent-cyan)"
      eyebrow="Skill detail"
      pills={
        <>
          <Pill accent={status.accent}>{status.label}</Pill>
          <Pill accent={area.accent}>{area.label}</Pill>
          <Pill quiet>{skill.currentLevel}</Pill>
        </>
      }
      primaryAction={<ActionButton>Start practice task</ActionButton>}
      summary={skill.description}
      title={skill.title}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <SectionPanel subtitle="Level, target and next practice." title="Overview">
            <dl className="grid gap-3 sm:grid-cols-2">
              <MetaField label="Current level" value={skill.currentLevel} />
              <MetaField label="Target level" value={skill.targetLevel} />
              <MetaField label="Next practice" value={skill.nextPractice} />
              <MetaField label="Last practiced" value={skill.lastPracticedAt} />
              <MetaField label="Frequency" value={skill.practiceFrequency} />
            </dl>
            <div className="mt-4">
              <ProgressBar
                accent="var(--accent-cyan)"
                label="Practice progress"
                progress={skill.progress}
              />
            </div>
          </SectionPanel>
          <SectionPanel subtitle="Competency path without gamification." title="Learning Path">
            <div className="grid gap-2">
              {skill.learningPath.map((stage) => {
                const stageStatus = milestoneStatusMeta[stage.status];

                return (
                  <article
                    className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3"
                    key={stage.title}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          {stage.title}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                          {stage.detail}
                        </p>
                      </div>
                      <Pill accent={stageStatus.accent}>{stageStatus.label}</Pill>
                    </div>
                  </article>
                );
              })}
            </div>
          </SectionPanel>
          <SectionPanel subtitle="Practice tasks are executable units." title="Practice Tasks">
            <TaskRows tasks={tasks} />
          </SectionPanel>
          <SectionPanel subtitle="Skill milestones." title="Milestones">
            <MilestoneList milestones={milestones} />
          </SectionPanel>
        </div>
        <aside className="grid gap-4 xl:content-start">
          <SectionPanel subtitle="Projects using this skill." title="Linked Projects">
            <ProjectRows projects={projects} />
          </SectionPanel>
          <SectionPanel subtitle="Artifacts, exercises and review notes." title="Evidence">
            <EvidenceList items={skill.evidence} />
          </SectionPanel>
        </aside>
      </div>
    </DetailShell>
  );
}

export function EntityDetailPage({
  kind,
  id,
}: Readonly<{
  kind: EntityKind;
  id: string;
}>) {
  if (kind === "task") return <TaskDetail taskId={id} />;
  if (kind === "project") return <ProjectDetail projectId={id} />;
  if (kind === "goal") return <GoalDetail goalId={id} />;
  return <SkillDetail skillId={id} />;
}
