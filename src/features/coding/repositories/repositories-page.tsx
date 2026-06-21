"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import {
  CodingPanel,
  CodingPill,
  EmptyStateCard,
  FieldLabel,
  StatusDot,
  accentStyle,
  inputClass,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "../components/coding-overview-primitives";
import type {
  CodingRepository,
  RepositoryActivity,
  RepositoryAgentSession,
  RepositoryLinkedTask,
  RepositoryProvider,
  RepositoryResource,
  RepositoryResource as RepositoryResourceType,
  RepositoryWorkbenchFilter,
  RepositoryWorkbenchViewModel,
} from "./types";

type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info" | "error";
};

type RepositoryDraft = {
  name: string;
  provider: RepositoryProvider | "";
  visibility: "private" | "public";
  linkedProjectId: string;
  defaultBranch: string;
  nextAction: string;
};

type CodeNoteDraft = {
  type: "Note" | "Decision" | "Snippet" | "Question";
  repositoryId: string;
  content: string;
};

const defaultFilter: RepositoryWorkbenchFilter = {
  search: "",
  status: "all",
  provider: "all",
  project: "all",
  attentionOnly: false,
  segment: "all",
};

const noteTypes: CodeNoteDraft["type"][] = [
  "Note",
  "Decision",
  "Snippet",
  "Question",
];

function dialogBackdropClose(
  event: MouseEvent<HTMLDialogElement>,
  onClose: () => void,
) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function dateLabel(value: string) {
  const day = value.slice(0, 10);

  if (day === "2026-06-21") {
    return "Today";
  }

  if (day === "2026-06-20") {
    return "Yesterday";
  }

  if (day === "2026-06-19") {
    return "Jun 19";
  }

  return day;
}

function isAttentionRepository(
  repository: CodingRepository,
  viewModel: RepositoryWorkbenchViewModel,
) {
  return repository.signals.some(
    (signal) => viewModel.signalMeta[signal].attention,
  );
}

function primarySignal(
  repository: CodingRepository,
  viewModel: RepositoryWorkbenchViewModel,
) {
  const attentionSignal = repository.signals.find(
    (signal) => viewModel.signalMeta[signal].attention,
  );

  return attentionSignal ?? repository.signals[0] ?? "healthy";
}

function matchesFilter(
  repository: CodingRepository,
  filter: RepositoryWorkbenchFilter,
  viewModel: RepositoryWorkbenchViewModel,
) {
  const search = normalize(filter.search);
  const matchesSearch =
    !search ||
    [
      repository.name,
      repository.fullName,
      repository.description,
      repository.linkedProjectTitle ?? "",
      repository.nextAction ?? "",
      repository.language ?? "",
    ]
      .map(normalize)
      .some((value) => value.includes(search));

  const matchesStatus =
    filter.status === "all" || repository.status === filter.status;
  const matchesProvider =
    filter.provider === "all" || repository.provider === filter.provider;
  const matchesProject =
    filter.project === "all" || repository.linkedProjectId === filter.project;
  const matchesAttention =
    !filter.attentionOnly || isAttentionRepository(repository, viewModel);
  const matchesSegment =
    filter.segment === "all" ||
    (filter.segment === "attention" &&
      isAttentionRepository(repository, viewModel)) ||
    (filter.segment === "active" && repository.status === "active") ||
    (filter.segment === "archived" && repository.status === "archived");

  return (
    matchesSearch &&
    matchesStatus &&
    matchesProvider &&
    matchesProject &&
    matchesAttention &&
    matchesSegment
  );
}

function tasksFor(
  tasks: RepositoryLinkedTask[],
  repositoryId: string,
  limit?: number,
) {
  const result = tasks.filter((task) => task.repositoryId === repositoryId);

  return limit ? result.slice(0, limit) : result;
}

function resourcesFor(resources: RepositoryResource[], repositoryId: string) {
  return resources.filter((resource) => resource.repositoryId === repositoryId);
}

function sessionsFor(
  sessions: RepositoryAgentSession[],
  repositoryId: string,
) {
  return sessions.filter((session) => session.repositoryId === repositoryId);
}

function activityFor(activity: RepositoryActivity[], repositoryId: string) {
  return activity.filter((item) => item.repositoryId === repositoryId);
}

function Toast({
  toast,
  onDismiss,
}: Readonly<{
  toast: ToastState | null;
  onDismiss: () => void;
}>) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(onDismiss, 4200);

    return () => clearTimeout(timeout);
  }, [onDismiss, toast]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 w-[min(420px,calc(100vw-32px))] rounded-[14px] border bg-[rgba(18,28,43,.96)] p-4 shadow-[0_18px_48px_rgba(0,0,0,.38)]",
        toast.tone === "success" && "border-[rgba(66,184,131,.34)]",
        toast.tone === "info" && "border-[rgba(95,200,215,.34)]",
        toast.tone === "error" && "border-[rgba(221,107,95,.34)]",
      )}
      role="status"
    >
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1 size-2.5 shrink-0 rounded-full",
            toast.tone === "success" && "bg-[var(--accent-green)]",
            toast.tone === "info" && "bg-[var(--accent-cyan)]",
            toast.tone === "error" && "bg-[var(--accent-red)]",
          )}
        />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">
            {toast.title}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
            {toast.body}
          </p>
        </div>
      </div>
    </div>
  );
}

function Header({
  viewModel,
  onAddRepository,
  onSyncInfo,
  onCaptureNote,
}: Readonly<{
  viewModel: RepositoryWorkbenchViewModel;
  onAddRepository: () => void;
  onSyncInfo: () => void;
  onCaptureNote: () => void;
}>) {
  return (
    <header className="order-1 min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.76)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-4 bg-[linear-gradient(90deg,rgba(91,124,250,.055),transparent_48%)] px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
            {viewModel.header.eyebrow}
          </p>
          <h1 className="mt-1 text-[30px] font-semibold leading-none text-[var(--text-primary)]">
            {viewModel.header.title}
          </h1>
          <p className="mt-2 max-w-4xl text-[12px] leading-5 text-[var(--text-secondary)]">
            {viewModel.header.contextLine}
          </p>
          <p className="mt-1 max-w-4xl text-[10px] leading-4 text-[var(--text-muted)]">
            {viewModel.header.summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button className={primaryButtonClass} onClick={onAddRepository} type="button">
            {viewModel.header.primaryAction}
          </button>
          <button
            aria-disabled="true"
            className={cn(
              secondaryButtonClass,
              "border-[rgba(95,200,215,.18)] text-[var(--text-muted)]",
            )}
            onClick={onSyncInfo}
            type="button"
          >
            {viewModel.header.secondaryActions.sync}
          </button>
          <button className={secondaryButtonClass} onClick={onCaptureNote} type="button">
            {viewModel.header.secondaryActions.captureNote}
          </button>
        </div>
      </div>
      <div className="grid gap-2 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] p-3 sm:grid-cols-3">
        {viewModel.header.stats.map((stat) => (
          <div
            className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(15,23,36,.68))] px-3 py-2"
            key={stat.label}
            style={accentStyle(stat.accent)}
          >
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">
              {stat.label}
            </p>
            <p className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
              {stat.detail}
            </p>
          </div>
        ))}
      </div>
    </header>
  );
}

function FilterBar({
  filter,
  setFilter,
  viewModel,
}: Readonly<{
  filter: RepositoryWorkbenchFilter;
  setFilter: (filter: RepositoryWorkbenchFilter) => void;
  viewModel: RepositoryWorkbenchViewModel;
}>) {
  function updateFilter<K extends keyof RepositoryWorkbenchFilter>(
    key: K,
    value: RepositoryWorkbenchFilter[K],
  ) {
    setFilter({
      ...filter,
      [key]: value,
    });
  }

  return (
    <section
      aria-labelledby="repository-filter-heading"
      className="order-2 rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] p-4"
    >
      <h2 className="sr-only" id="repository-filter-heading">
        Repository filters
      </h2>
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.2fr)_repeat(4,minmax(150px,.8fr))] xl:items-end">
        <label className="block min-w-0">
          <FieldLabel>Search repositories</FieldLabel>
          <input
            className={inputClass}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Search repositories"
            type="search"
            value={filter.search}
          />
        </label>
        <label className="block min-w-0">
          <FieldLabel>Status</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) =>
              updateFilter(
                "status",
                event.target.value as RepositoryWorkbenchFilter["status"],
              )
            }
            value={filter.status}
          >
            <option value="all">All status</option>
            {viewModel.statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <FieldLabel>Provider</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) =>
              updateFilter(
                "provider",
                event.target.value as RepositoryWorkbenchFilter["provider"],
              )
            }
            value={filter.provider}
          >
            <option value="all">All providers</option>
            {viewModel.providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <FieldLabel>Project</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) => updateFilter("project", event.target.value)}
            value={filter.project}
          >
            <option value="all">All projects</option>
            {viewModel.projectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-[12px] font-semibold text-[var(--text-secondary)]">
          <input
            checked={filter.attentionOnly}
            className="size-4 accent-[var(--accent-blue)]"
            onChange={(event) =>
              updateFilter("attentionOnly", event.target.checked)
            }
            type="checkbox"
          />
          Attention only
        </label>
      </div>
      <div
        aria-label="Repository segment"
        className="mt-3 flex flex-wrap gap-2"
        role="group"
      >
        {(["all", "attention", "active", "archived"] as const).map((segment) => (
          <button
            className={cn(
              "min-h-9 rounded-full border px-3 text-[11px] font-semibold capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
              filter.segment === segment
                ? "border-[rgba(91,124,250,.36)] bg-[rgba(91,124,250,.16)] text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] bg-[rgba(148,163,184,.05)] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]",
            )}
            key={segment}
            onClick={() => updateFilter("segment", segment)}
            type="button"
          >
            {segment}
          </button>
        ))}
        <button
          className={quietButtonClass}
          onClick={() => setFilter(defaultFilter)}
          type="button"
        >
          Reset filters
        </button>
      </div>
    </section>
  );
}

function RepositoryCard({
  repository,
  selected,
  viewModel,
  onSelect,
}: Readonly<{
  repository: CodingRepository;
  selected: boolean;
  viewModel: RepositoryWorkbenchViewModel;
  onSelect: (repository: CodingRepository) => void;
}>) {
  const status = viewModel.statusMeta[repository.status];
  const signal = primarySignal(repository, viewModel);
  const signalMeta = viewModel.signalMeta[signal];
  const taskPreview = tasksFor(viewModel.tasks, repository.id, 2);

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "relative w-full overflow-hidden rounded-[16px] border bg-[rgba(18,28,43,.55)] p-4 text-left transition hover:border-[color-mix(in_srgb,var(--accent)_36%,var(--border-default))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
        selected
          ? "border-[rgba(91,124,250,.46)] bg-[rgba(91,124,250,.08)]"
          : "border-[var(--border-subtle)]",
      )}
      onClick={() => onSelect(repository)}
      style={accentStyle(signalMeta.accent)}
      type="button"
    >
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 top-0 w-1 bg-[var(--accent)]"
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(210px,.9fr)_minmax(260px,1fr)_minmax(270px,.9fr)] xl:items-start">
        <div className="min-w-0 pl-2">
          <div className="flex min-w-0 items-start gap-2">
            <StatusDot accent={status.accent} />
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-[var(--text-primary)]">
                {repository.fullName}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                {repository.provider} · {repository.visibility} ·{" "}
                {repository.language ?? "Unknown language"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <CodingPill accent={status.accent}>{status.label}</CodingPill>
            <CodingPill accent={signalMeta.accent}>{signalMeta.label}</CodingPill>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Linked project
          </p>
          <p className="mt-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
            {repository.linkedProjectTitle ?? "No project linked"}
          </p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Next action
          </p>
          <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--text-secondary)]">
            {repository.nextAction ?? "Set one concrete next action."}
          </p>
        </div>

        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-4">
            <CompactCount label="Tasks" value={repository.openTaskCount} />
            <CompactCount label="Resources" value={repository.resourceCount} />
            <CompactCount label="Notes" value={repository.noteCount} />
            <CompactCount label="Agents" value={repository.agentSessionCount} />
          </div>
          <div className="mt-3">
            <p className="text-[10px] leading-4 text-[var(--text-muted)]">
              Branch: {repository.activeBranch ?? repository.defaultBranch} · Last
              activity: {dateLabel(repository.lastActivityAt)}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
              {taskPreview.length > 0
                ? `Tasks: ${taskPreview.map((task) => task.title).join(" · ")}`
                : "No linked tasks yet."}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

function CompactCount({
  label,
  value,
}: Readonly<{
  label: string;
  value: number;
}>) {
  return (
    <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.32)] px-2 py-2">
      <p className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
        {value}
      </p>
      <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}

function RepositoryList({
  repositories,
  selectedId,
  viewModel,
  onSelect,
}: Readonly<{
  repositories: CodingRepository[];
  selectedId: string | null;
  viewModel: RepositoryWorkbenchViewModel;
  onSelect: (repository: CodingRepository) => void;
}>) {
  return (
    <CodingPanel
      className="order-4 xl:order-3 xl:col-span-8"
      subtitle="Scanbare Arbeitsliste ohne GitHub-Analytics-Metrikwand."
      title="Repository List"
    >
      {repositories.length === 0 ? (
        <EmptyStateCard
          description={viewModel.emptyStates.noSearchResults.description}
          title={viewModel.emptyStates.noSearchResults.title}
        />
      ) : (
        <div className="space-y-2">
          {repositories.map((repository) => (
            <RepositoryCard
              key={repository.id}
              onSelect={onSelect}
              repository={repository}
              selected={repository.id === selectedId}
              viewModel={viewModel}
            />
          ))}
        </div>
      )}
    </CodingPanel>
  );
}

function AttentionQueue({
  repositories,
  viewModel,
  onSelect,
}: Readonly<{
  repositories: CodingRepository[];
  viewModel: RepositoryWorkbenchViewModel;
  onSelect: (repository: CodingRepository) => void;
}>) {
  const attention = repositories
    .filter((repository) => isAttentionRepository(repository, viewModel))
    .slice(0, 4);

  return (
    <CodingPanel
      badge={<CodingPill accent="var(--accent-orange)">Manual signals</CodingPill>}
      className="order-3 xl:order-4 xl:col-span-4"
      subtitle="Failed checks, stale branches, missing next actions and open reviews."
      title="Attention Queue"
    >
      <div className="space-y-2">
        {attention.map((repository) => {
          const signal = primarySignal(repository, viewModel);
          const meta = viewModel.signalMeta[signal];

          return (
            <button
              className="w-full rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.5)] p-3 text-left transition hover:border-[color-mix(in_srgb,var(--accent)_34%,var(--border-default))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              key={repository.id}
              onClick={() => onSelect(repository)}
              style={accentStyle(meta.accent)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                    {repository.fullName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--text-muted)]">
                    {repository.nextAction ?? meta.description}
                  </p>
                </div>
                <CodingPill accent={meta.accent}>{meta.label}</CodingPill>
              </div>
            </button>
          );
        })}
      </div>
    </CodingPanel>
  );
}

function SelectedRepositorySummary({
  repository,
  viewModel,
  onOpenInspector,
}: Readonly<{
  repository: CodingRepository | null;
  viewModel: RepositoryWorkbenchViewModel;
  onOpenInspector: () => void;
}>) {
  if (!repository) {
    return null;
  }

  const status = viewModel.statusMeta[repository.status];

  return (
    <CodingPanel
      badge={<CodingPill accent={status.accent}>{status.label}</CodingPill>}
      className="order-5 xl:order-5 xl:col-span-4"
      subtitle="Selected repository context."
      title="Selected Repository"
    >
      <p className="text-[18px] font-semibold text-[var(--text-primary)]">
        {repository.fullName}
      </p>
      <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
        {repository.description}
      </p>
      <dl className="mt-4 grid gap-2 text-[11px] sm:grid-cols-2">
        <MetaItem label="Project" value={repository.linkedProjectTitle ?? "None"} />
        <MetaItem label="Branch" value={repository.activeBranch ?? repository.defaultBranch} />
        <MetaItem label="Language" value={repository.language ?? "Unknown"} />
        <MetaItem label="Last activity" value={dateLabel(repository.lastActivityAt)} />
      </dl>
      <button className={primaryButtonClass} onClick={onOpenInspector} type="button">
        Open repository
      </button>
    </CodingPanel>
  );
}

function MetaItem({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.32)] px-3 py-2">
      <dt className="text-[10px] font-semibold text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-[12px] text-[var(--text-secondary)]">
        {value}
      </dd>
    </div>
  );
}

function LinkedTasks({
  repository,
  tasks,
  emptyState,
  onToast,
}: Readonly<{
  repository: CodingRepository | null;
  tasks: RepositoryLinkedTask[];
  emptyState: RepositoryWorkbenchViewModel["emptyStates"]["noLinkedTasks"];
  onToast: (toast: ToastState) => void;
}>) {
  const linkedTasks = repository ? tasksFor(tasks, repository.id) : [];

  return (
    <CodingPanel
      className="order-6 xl:order-6 xl:col-span-4"
      subtitle="Task context for the selected repository."
      title="Linked Tasks"
    >
      {linkedTasks.length === 0 ? (
        <EmptyStateCard description={emptyState.description} title={emptyState.title} />
      ) : (
        <div className="space-y-2">
          {linkedTasks.map((task) => (
            <button
              className="w-full rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3 text-left transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              key={task.id}
              onClick={() =>
                onToast({
                  title: "Task detail not wired",
                  body: `${task.title} is shown as linked mock context. No task route was opened.`,
                  tone: "info",
                })
              }
              type="button"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
                  {task.title}
                </p>
                <div className="flex gap-1.5">
                  <CodingPill accent={task.priority === "high" ? "var(--accent-orange)" : "var(--accent-blue)"}>
                    {task.priority}
                  </CodingPill>
                  <CodingPill quiet>{task.status.replaceAll("_", " ")}</CodingPill>
                </div>
              </div>
              {task.dueLabel ? (
                <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                  Due: {task.dueLabel}
                </p>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </CodingPanel>
  );
}

function ResourceMap({
  repository,
  resources,
  onToast,
}: Readonly<{
  repository: CodingRepository | null;
  resources: RepositoryResource[];
  onToast: (toast: ToastState) => void;
}>) {
  const selectedResources = repository
    ? resourcesFor(resources, repository.id)
    : resources.slice(0, 5);
  const groups: Array<{
    label: string;
    types: RepositoryResourceType["type"][];
  }> = [
    { label: "Decisions", types: ["decision"] },
    { label: "Snippets", types: ["snippet"] },
    { label: "Notes", types: ["note"] },
    { label: "Prompts", types: ["prompt"] },
    { label: "Docs / Links", types: ["doc", "link"] },
  ];

  return (
    <CodingPanel
      className="order-7 xl:order-7 xl:col-span-4"
      subtitle="Grouped list, no network graph."
      title="Resource Map"
    >
      <div className="space-y-3">
        {groups.map((group) => {
          const items = selectedResources.filter((resource) =>
            group.types.includes(resource.type),
          );

          return (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {group.label}
              </p>
              {items.length === 0 ? (
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-faint)]">
                  No linked {group.label.toLowerCase()}.
                </p>
              ) : (
                <div className="mt-1 space-y-1.5">
                  {items.map((resource) => (
                    <button
                      className="w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-3 py-2 text-left text-[11px] leading-4 text-[var(--text-secondary)] transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                      key={resource.id}
                      onClick={() =>
                        onToast({
                          title: "Resource detail not wired",
                          body: `${resource.title} is represented as linked mock context.`,
                          tone: "info",
                        })
                      }
                      type="button"
                    >
                      <span className="font-semibold text-[var(--text-primary)]">
                        {resource.title}
                      </span>{" "}
                      · {resource.updatedAt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </CodingPanel>
  );
}

function RepositoryHealth({
  repository,
  viewModel,
}: Readonly<{
  repository: CodingRepository | null;
  viewModel: RepositoryWorkbenchViewModel;
}>) {
  if (!repository) {
    return null;
  }

  const healthItems = [
    {
      label: "Next action set",
      value: repository.nextAction ? "Ready" : "Missing",
      accent: repository.nextAction ? "var(--accent-green)" : "var(--accent-orange)",
    },
    {
      label: "Tasks linked",
      value: `${repository.openTaskCount}`,
      accent: repository.openTaskCount > 0 ? "var(--accent-blue)" : "var(--accent-orange)",
    },
    {
      label: "Resources linked",
      value: `${repository.resourceCount}`,
      accent: repository.resourceCount > 0 ? "var(--accent-cyan)" : "var(--accent-orange)",
    },
    {
      label: "Review open",
      value: repository.signals.includes("open_review") ? "Yes" : "No",
      accent: repository.signals.includes("open_review")
        ? "var(--accent-orange)"
        : "var(--accent-green)",
    },
  ];

  return (
    <CodingPanel
      className="order-9 xl:order-8 xl:col-span-4"
      subtitle="Small text-led signals, no DevOps metric wall."
      title="Repository Health"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {healthItems.map((item) => (
          <div
            className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(18,28,43,.58))] px-3 py-2"
            key={item.label}
            style={accentStyle(item.accent)}
          >
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">
              {item.label}
            </p>
            <p className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[var(--text-muted)]">
        Primary signal:{" "}
        {viewModel.signalMeta[primarySignal(repository, viewModel)].label}
      </p>
    </CodingPanel>
  );
}

function RecentActivity({
  repository,
  activity,
}: Readonly<{
  repository: CodingRepository | null;
  activity: RepositoryActivity[];
}>) {
  const items = repository ? activityFor(activity, repository.id) : activity.slice(0, 4);

  return (
    <CodingPanel
      className="order-8 xl:order-9 xl:col-span-4"
      subtitle="Manual/mock activity, not GitHub history."
      title="Recent Repository Activity"
    >
      <div className="space-y-2">
        {items.length === 0 ? (
          <EmptyStateCard
            description="No manual activity has been recorded for this repository."
            title="No recent activity"
          />
        ) : (
          items.map((item) => (
            <div
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3"
              key={item.id}
            >
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                {item.title}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                {item.detail}
              </p>
              <p className="mt-2 text-[10px] text-[var(--text-faint)]">
                {item.happenedAt}
              </p>
            </div>
          ))
        )}
      </div>
    </CodingPanel>
  );
}

function RepositoryInspectorSheet({
  repository,
  viewModel,
  open,
  onClose,
  onToast,
}: Readonly<{
  repository: CodingRepository | null;
  viewModel: RepositoryWorkbenchViewModel;
  open: boolean;
  onClose: () => void;
  onToast: (toast: ToastState) => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && repository && !dialog.open) {
      dialog.showModal();
    }

    if ((!open || !repository) && dialog.open) {
      dialog.close();
    }
  }, [open, repository]);

  if (!repository) {
    return null;
  }

  const status = viewModel.statusMeta[repository.status];
  const repoTasks = tasksFor(viewModel.tasks, repository.id);
  const repoResources = resourcesFor(viewModel.resources, repository.id);
  const repoSessions = sessionsFor(viewModel.agentSessions, repository.id);

  return (
    <dialog
      aria-labelledby="repository-inspector-heading"
      className="fixed bottom-0 right-0 top-0 m-0 ml-auto h-dvh max-h-dvh w-[min(560px,100vw)] overflow-hidden rounded-l-[20px] border border-[rgba(91,124,250,.28)] bg-[var(--bg-shell)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop:bg-[rgba(0,0,0,.52)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--border-subtle)] bg-[rgba(91,124,250,.06)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-blue)]">
                Repository Inspector
              </p>
              <h2
                className="mt-1 text-[22px] font-semibold leading-7 text-[var(--text-primary)]"
                id="repository-inspector-heading"
              >
                {repository.fullName}
              </h2>
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                {repository.provider} · {repository.visibility} ·{" "}
                {repository.defaultBranch}
              </p>
            </div>
            <button
              aria-label="Close repository inspector"
              className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              x
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <CodingPill accent={status.accent}>{status.label}</CodingPill>
            {repository.signals.map((signal) => (
              <CodingPill accent={viewModel.signalMeta[signal].accent} key={signal}>
                {viewModel.signalMeta[signal].label}
              </CodingPill>
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-5 text-[var(--text-secondary)]">
            {repository.description}
          </p>
          <div className="mt-4 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Next Action
            </p>
            <p className="mt-2 text-[13px] leading-5 text-[var(--text-primary)]">
              {repository.nextAction ?? "Set one concrete next action."}
            </p>
          </div>

          <InspectorSection title="Tasks">
            {repoTasks.length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)]">
                No linked tasks.
              </p>
            ) : (
              repoTasks.map((task) => (
                <p
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-3 py-2 text-[11px] leading-4 text-[var(--text-secondary)]"
                  key={task.id}
                >
                  <span className="font-semibold text-[var(--text-primary)]">
                    {task.title}
                  </span>{" "}
                  · {task.status.replaceAll("_", " ")} · {task.priority}
                </p>
              ))
            )}
          </InspectorSection>

          <InspectorSection title="Resources and recent notes">
            {repoResources.length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)]">
                No linked resources.
              </p>
            ) : (
              repoResources.map((resource) => (
                <button
                  className="w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-3 py-2 text-left text-[11px] leading-4 text-[var(--text-secondary)] transition hover:border-[var(--border-default)]"
                  key={resource.id}
                  onClick={() =>
                    onToast({
                      title: "Resource preview",
                      body: `${resource.title} is linked as static mock context.`,
                      tone: "info",
                    })
                  }
                  type="button"
                >
                  <span className="font-semibold text-[var(--text-primary)]">
                    {resource.title}
                  </span>{" "}
                  · {resource.type} · {resource.updatedAt}
                </button>
              ))
            )}
          </InspectorSection>

          <InspectorSection title="Agent Sessions">
            {repoSessions.length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)]">
                No agent sessions linked.
              </p>
            ) : (
              repoSessions.map((session) => (
                <div
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-3 py-2"
                  key={session.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                      {session.status.replaceAll("_", " ")}
                    </p>
                    <CodingPill
                      accent={
                        session.reviewNeeded
                          ? "var(--accent-orange)"
                          : "var(--accent-green)"
                      }
                    >
                      {session.reviewNeeded ? "Review needed" : "Reviewed"}
                    </CodingPill>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
                    {session.outputSummary}
                  </p>
                </div>
              ))
            )}
          </InspectorSection>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.72)] px-5 py-4">
          <button className={primaryButtonClass} onClick={onClose} type="button">
            Open repository
          </button>
          <button className={quietButtonClass} onClick={onClose} type="button">
            Close inspector
          </button>
        </div>
      </div>
    </dialog>
  );
}

function InspectorSection({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function AddRepositoryDialog({
  open,
  onClose,
  onSave,
  viewModel,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (repository: CodingRepository) => void;
  viewModel: RepositoryWorkbenchViewModel;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<RepositoryDraft>({
    name: "",
    provider: "github",
    visibility: "private",
    linkedProjectId: viewModel.projectOptions[0]?.value ?? "",
    defaultBranch: "main",
    nextAction: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      setDraft({
        name: "",
        provider: "github",
        visibility: "private",
        linkedProjectId: viewModel.projectOptions[0]?.value ?? "",
        defaultBranch: "main",
        nextAction: "",
      });
      setTouched({});
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, viewModel.projectOptions]);

  function updateDraft(
    key: keyof RepositoryDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  }

  function markTouched(key: keyof RepositoryDraft) {
    setTouched((current) => ({
      ...current,
      [key]: true,
    }));
  }

  const nameInvalid = touched.name && !draft.name.trim();
  const providerInvalid = touched.provider && !draft.provider;
  const canSave = draft.name.trim().length > 0 && Boolean(draft.provider);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSave) {
      setTouched({ name: true, provider: true });
      return;
    }

    const project = viewModel.projectOptions.find(
      (option) => option.value === draft.linkedProjectId,
    );
    const cleanName = draft.name.trim().replace(/^anton\//, "");
    const repository: CodingRepository = {
      id: `local-${Date.now()}`,
      name: cleanName,
      fullName: cleanName.includes("/") ? cleanName : `anton/${cleanName}`,
      provider: draft.provider || "other",
      visibility: draft.visibility,
      defaultBranch: draft.defaultBranch.trim() || "main",
      language: undefined,
      status: draft.nextAction.trim() ? "active" : "attention",
      signals: draft.nextAction.trim() ? ["healthy"] : ["missing_next_action"],
      description:
        "Local repository draft added from the Repositories workbench. No GitHub sync was performed.",
      linkedProjectId: project?.value,
      linkedProjectTitle: project?.label,
      nextAction: draft.nextAction.trim() || undefined,
      lastActivityAt: new Date().toISOString(),
      openTaskCount: 0,
      resourceCount: 0,
      noteCount: 0,
      agentSessionCount: 0,
    };

    onSave(repository);
  }

  return (
    <dialog
      aria-labelledby="add-repository-dialog-heading"
      className="w-[min(680px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => dialogBackdropClose(event, onClose)}
      ref={dialogRef}
    >
      <form className="flex max-h-[calc(100dvh-24px)] flex-col" onSubmit={handleSubmit}>
        <DialogHeader
          eyebrow="Dialog · Repository draft"
          id="add-repository-dialog-heading"
          onClose={onClose}
          title="Add repository"
        />
        <div className="grid gap-4 overflow-y-auto px-4 py-3 sm:grid-cols-2">
          <label className="block min-w-0">
            <FieldLabel>Repository name *</FieldLabel>
            <input
              aria-invalid={nameInvalid}
              className={cn(
                inputClass,
                nameInvalid && "border-[rgba(221,107,95,.65)]",
              )}
              onBlur={() => markTouched("name")}
              onChange={(event) => updateDraft("name", event)}
              placeholder="anton/new-repository"
              type="text"
              value={draft.name}
            />
            {nameInvalid ? (
              <p className="mt-1 text-[10px] leading-4 text-[var(--accent-red)]">
                Repository name is required.
              </p>
            ) : null}
          </label>
          <label className="block min-w-0">
            <FieldLabel>Provider *</FieldLabel>
            <select
              aria-invalid={providerInvalid}
              className={cn(
                inputClass,
                providerInvalid && "border-[rgba(221,107,95,.65)]",
              )}
              onBlur={() => markTouched("provider")}
              onChange={(event) => updateDraft("provider", event)}
              value={draft.provider}
            >
              {viewModel.providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <FieldLabel>Visibility</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => updateDraft("visibility", event)}
              value={draft.visibility}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </label>
          <label className="block min-w-0">
            <FieldLabel>Linked project</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => updateDraft("linkedProjectId", event)}
              value={draft.linkedProjectId}
            >
              <option value="">No project</option>
              {viewModel.projectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <FieldLabel>Default branch</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => updateDraft("defaultBranch", event)}
              placeholder="main"
              type="text"
              value={draft.defaultBranch}
            />
          </label>
          <label className="block min-w-0 sm:col-span-2">
            <FieldLabel>Next action</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => updateDraft("nextAction", event)}
              placeholder="What should happen next?"
              type="text"
              value={draft.nextAction}
            />
          </label>
        </div>
        <DialogFooter
          note="Local UI state only. No GitHub repository, token or Supabase record is created."
          onCancel={onClose}
          submitLabel="Save repository"
          submitDisabled={!canSave}
        />
      </form>
    </dialog>
  );
}

function CaptureNoteDialog({
  open,
  repository,
  viewModel,
  onClose,
  onSave,
}: Readonly<{
  open: boolean;
  repository: CodingRepository | null;
  viewModel: RepositoryWorkbenchViewModel;
  onClose: () => void;
  onSave: (resource: RepositoryResource) => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<CodeNoteDraft>({
    type: "Note",
    repositoryId: repository?.id ?? "",
    content: "",
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      setDraft({
        type: "Note",
        repositoryId: repository?.id ?? viewModel.repositories[0]?.id ?? "",
        content: "",
      });
      setTouched(false);
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, repository, viewModel.repositories]);

  const contentInvalid = touched && !draft.content.trim();
  const canSave = draft.content.trim().length > 0;

  return (
    <dialog
      aria-labelledby="capture-code-note-heading"
      className="w-[min(560px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => dialogBackdropClose(event, onClose)}
      ref={dialogRef}
    >
      <form
        className="flex max-h-[calc(100dvh-24px)] flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);

          if (!canSave) {
            return;
          }

          onSave({
            id: `local-resource-${Date.now()}`,
            title: draft.content.trim().split("\n")[0].slice(0, 72),
            type:
              draft.type === "Decision"
                ? "decision"
                : draft.type === "Snippet"
                  ? "snippet"
                  : draft.type === "Question"
                    ? "note"
                    : "note",
            repositoryId: draft.repositoryId,
            updatedAt: "Now",
          });
        }}
      >
        <DialogHeader
          eyebrow="Quick capture"
          id="capture-code-note-heading"
          onClose={onClose}
          title="Capture code note"
        />
        <div className="overflow-y-auto px-4 py-3">
          <div aria-label="Code note type" className="flex flex-wrap gap-2" role="group">
            {noteTypes.map((type) => (
              <button
                className={cn(
                  "min-h-8 rounded-full border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                  draft.type === type
                    ? "border-[rgba(91,124,250,.36)] bg-[rgba(91,124,250,.16)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[rgba(148,163,184,.06)] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]",
                )}
                key={type}
                onClick={() => setDraft((current) => ({ ...current, type }))}
                type="button"
              >
                {type}
              </button>
            ))}
          </div>
          <label className="mt-4 block min-w-0">
            <FieldLabel>Repository</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  repositoryId: event.target.value,
                }))
              }
              value={draft.repositoryId}
            >
              {viewModel.repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block min-w-0">
            <FieldLabel>Content *</FieldLabel>
            <textarea
              aria-invalid={contentInvalid}
              className={cn(
                inputClass,
                "min-h-[150px] resize-none py-3 leading-5",
                contentInvalid && "border-[rgba(221,107,95,.65)]",
              )}
              onBlur={() => setTouched(true)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              placeholder="Was wurde entschieden, gelernt oder muss spaeter geprueft werden?"
              rows={6}
              value={draft.content}
            />
            {contentInvalid ? (
              <p className="mt-1 text-[10px] leading-4 text-[var(--accent-red)]">
                Content is required before saving a note.
              </p>
            ) : null}
          </label>
        </div>
        <DialogFooter
          note="Saved locally to this mock Resource Map only."
          onCancel={onClose}
          submitDisabled={!canSave}
          submitLabel="Save note"
        />
      </form>
    </dialog>
  );
}

function SyncInfoDialog({
  open,
  onClose,
  viewModel,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  viewModel: RepositoryWorkbenchViewModel;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-labelledby="github-sync-heading"
      className="w-[min(560px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => dialogBackdropClose(event, onClose)}
      ref={dialogRef}
    >
      <div>
        <DialogHeader
          eyebrow="Prepared integration"
          id="github-sync-heading"
          onClose={onClose}
          title={viewModel.githubSync.title}
        />
        <div className="px-4 py-4">
          <p className="text-[13px] leading-5 text-[var(--text-secondary)]">
            {viewModel.githubSync.description}
          </p>
          <div className="mt-4 rounded-[14px] border border-[rgba(221,107,95,.24)] bg-[rgba(221,107,95,.08)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-red)]">
              Prepared error state
            </p>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
              {viewModel.githubSync.errorState}
            </p>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-[var(--text-muted)]">
            No OAuth flow, no API request and no token handling is implemented in
            this step.
          </p>
        </div>
        <div className="border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
          <button className={primaryButtonClass} onClick={onClose} type="button">
            Understood
          </button>
        </div>
      </div>
    </dialog>
  );
}

function DialogHeader({
  eyebrow,
  title,
  id,
  onClose,
}: Readonly<{
  eyebrow: string;
  title: string;
  id: string;
  onClose: () => void;
}>) {
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-blue)]">
            {eyebrow}
          </p>
          <h2
            className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
            id={id}
          >
            {title}
          </h2>
        </div>
        <button
          aria-label={`Close ${title}`}
          className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          x
        </button>
      </div>
    </div>
  );
}

function DialogFooter({
  note,
  onCancel,
  submitLabel,
  submitDisabled,
}: Readonly<{
  note: string;
  onCancel: () => void;
  submitLabel: string;
  submitDisabled?: boolean;
}>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
      <p className="max-w-md text-[10px] leading-4 text-[var(--text-faint)]">
        {note}
      </p>
      <div className="flex flex-wrap gap-2">
        <button className={secondaryButtonClass} onClick={onCancel} type="button">
          Cancel
        </button>
        <button className={primaryButtonClass} disabled={submitDisabled} type="submit">
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function PageContractNote({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <p className="text-[10px] leading-4 text-[var(--text-faint)]">
      {children}
    </p>
  );
}

export function RepositoriesPage({
  viewModel,
}: Readonly<{
  viewModel: RepositoryWorkbenchViewModel;
}>) {
  const [filter, setFilter] = useState<RepositoryWorkbenchFilter>(defaultFilter);
  const [localRepositories, setLocalRepositories] = useState<CodingRepository[]>(
    [],
  );
  const [localResources, setLocalResources] = useState<RepositoryResource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    viewModel.repositories[0]?.id ?? null,
  );
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const repositories = useMemo(
    () => [...localRepositories, ...viewModel.repositories],
    [localRepositories, viewModel.repositories],
  );
  const resources = useMemo(
    () => [...localResources, ...viewModel.resources],
    [localResources, viewModel.resources],
  );
  const filteredRepositories = useMemo(
    () =>
      repositories.filter((repository) =>
        matchesFilter(repository, filter, viewModel),
      ),
    [filter, repositories, viewModel],
  );
  const selectedRepository =
    repositories.find((repository) => repository.id === selectedId) ??
    filteredRepositories[0] ??
    repositories[0] ??
    null;

  function selectRepository(repository: CodingRepository) {
    setSelectedId(repository.id);
    setInspectorOpen(true);
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6"
      id="repositories-page"
    >
      <Header
        onAddRepository={() => setAddDialogOpen(true)}
        onCaptureNote={() => setNoteDialogOpen(true)}
        onSyncInfo={() => setSyncDialogOpen(true)}
        viewModel={viewModel}
      />
      <FilterBar filter={filter} setFilter={setFilter} viewModel={viewModel} />

      {repositories.length === 0 ? (
        <section className="order-3">
          <EmptyStateCard
            action={
              <button
                className={primaryButtonClass}
                onClick={() => setAddDialogOpen(true)}
                type="button"
              >
                Add repository
              </button>
            }
            description={viewModel.emptyStates.noRepositories.description}
            title={viewModel.emptyStates.noRepositories.title}
          />
        </section>
      ) : (
        <div className="grid min-w-0 gap-2 xl:grid-cols-12">
          <AttentionQueue
            onSelect={selectRepository}
            repositories={repositories}
            viewModel={viewModel}
          />
          <RepositoryList
            onSelect={selectRepository}
            repositories={filteredRepositories}
            selectedId={selectedRepository?.id ?? null}
            viewModel={viewModel}
          />
          <SelectedRepositorySummary
            onOpenInspector={() => setInspectorOpen(true)}
            repository={selectedRepository}
            viewModel={viewModel}
          />
          <LinkedTasks
            emptyState={viewModel.emptyStates.noLinkedTasks}
            onToast={setToast}
            repository={selectedRepository}
            tasks={viewModel.tasks}
          />
          <ResourceMap
            onToast={setToast}
            repository={selectedRepository}
            resources={resources}
          />
          <RecentActivity
            activity={viewModel.activity}
            repository={selectedRepository}
          />
          <RepositoryHealth
            repository={selectedRepository}
            viewModel={viewModel}
          />
        </div>
      )}

      <div className="order-last rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3">
        <PageContractNote>
          {viewModel.pageContract.pageType} · {viewModel.pageContract.writes} ·{" "}
          {viewModel.pageContract.canonicalSource}
        </PageContractNote>
      </div>

      <RepositoryInspectorSheet
        onClose={() => setInspectorOpen(false)}
        onToast={setToast}
        open={inspectorOpen}
        repository={selectedRepository}
        viewModel={viewModel}
      />
      <AddRepositoryDialog
        onClose={() => setAddDialogOpen(false)}
        onSave={(repository) => {
          setLocalRepositories((current) => [repository, ...current]);
          setSelectedId(repository.id);
          setAddDialogOpen(false);
          setToast({
            title: "Repository saved locally",
            body: `${repository.fullName} was added to this UI state only.`,
            tone: "success",
          });
        }}
        open={addDialogOpen}
        viewModel={viewModel}
      />
      <CaptureNoteDialog
        onClose={() => setNoteDialogOpen(false)}
        onSave={(resource) => {
          setLocalResources((current) => [resource, ...current]);
          setNoteDialogOpen(false);
          setToast({
            title: "Code note saved locally",
            body: "The note was added to the selected repository resource map.",
            tone: "success",
          });
        }}
        open={noteDialogOpen}
        repository={selectedRepository}
        viewModel={{ ...viewModel, repositories }}
      />
      <SyncInfoDialog
        onClose={() => setSyncDialogOpen(false)}
        open={syncDialogOpen}
        viewModel={viewModel}
      />
      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}
