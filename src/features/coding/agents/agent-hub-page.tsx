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
  inputClass,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "../components/coding-overview-primitives";
import type {
  AgentHubFilter,
  AgentHubViewModel,
  AgentOutput,
  AgentSession,
  AgentTask,
  AgentTaskPriority,
  AgentTaskStatus,
  AgentWorker,
  ContextBundle,
  PromptTemplate,
} from "./types";

type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info" | "error";
};

type TaskDraft = {
  title: string;
  goal: string;
  workerId: string;
  linkedProjectId: string;
  repositoryId: string;
  promptTemplateId: string;
  contextBundleId: string;
  expectedOutput: AgentTask["expectedOutput"];
  priority: AgentTaskPriority;
  reviewRequired: boolean;
  safetyNote: string;
};

type PromptDraft = {
  title: string;
  purpose: string;
  category: PromptTemplate["category"];
  body: string;
};

type ContextDraft = {
  title: string;
  sourceType: ContextBundle["sourceType"];
  linkedProjectId: string;
  repositoryId: string;
  notes: string;
};

const defaultFilter: AgentHubFilter = {
  search: "",
  segment: "all",
  workerId: "all",
  repositoryId: "all",
  projectId: "all",
  riskLevel: "all",
  outputType: "all",
};

const taskSegments: Array<AgentHubFilter["segment"]> = [
  "all",
  "queued",
  "running",
  "review",
  "blocked",
  "completed",
];

const expectedOutputs: AgentTask["expectedOutput"][] = [
  "plan",
  "code",
  "review",
  "summary",
  "note",
  "research",
];

const promptCategories: PromptTemplate["category"][] = [
  "coding",
  "review",
  "research",
  "planning",
  "documentation",
];

const sourceTypes: ContextBundle["sourceType"][] = [
  "repository",
  "project",
  "design",
  "docs",
  "prompt",
  "mixed",
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

function labelFromValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function emptyTaskDraft(viewModel: AgentHubViewModel): TaskDraft {
  return {
    title: "",
    goal: "",
    workerId: viewModel.workers[0]?.id ?? "",
    linkedProjectId: viewModel.projects[0]?.id ?? "",
    repositoryId: viewModel.repositories[0]?.id ?? "",
    promptTemplateId: viewModel.promptTemplates[0]?.id ?? "",
    contextBundleId: viewModel.contextBundles[0]?.id ?? "",
    expectedOutput: "plan",
    priority: "medium",
    reviewRequired: true,
    safetyNote: "No secrets. Manual review before applying any output.",
  };
}

function initialTaskDraft(
  viewModel: AgentHubViewModel,
  presetWorkerId: string | null,
  presetTask: AgentTask | null,
): TaskDraft {
  return {
    ...emptyTaskDraft(viewModel),
    title: presetTask?.title ?? "",
    goal: presetTask?.goal ?? "",
    workerId:
      presetWorkerId ?? presetTask?.assignedWorkerId ?? viewModel.workers[0]?.id ?? "",
    linkedProjectId: presetTask?.linkedProjectId ?? viewModel.projects[0]?.id ?? "",
    repositoryId: presetTask?.repositoryId ?? viewModel.repositories[0]?.id ?? "",
    promptTemplateId:
      presetTask?.promptTemplateId ?? viewModel.promptTemplates[0]?.id ?? "",
    contextBundleId:
      presetTask?.contextBundleIds[0] ?? viewModel.contextBundles[0]?.id ?? "",
    expectedOutput: presetTask?.expectedOutput ?? "plan",
    priority: presetTask?.priority ?? "medium",
    reviewRequired: presetTask?.reviewRequired ?? true,
  };
}

function taskMatchesFilter(
  task: AgentTask,
  filter: AgentHubFilter,
  workerName: string,
) {
  const search = normalize(filter.search);
  const matchesSearch =
    !search ||
    [
      task.title,
      task.goal,
      task.nextAction,
      task.linkedProjectTitle ?? "",
      task.repositoryName ?? "",
      workerName,
      task.expectedOutput,
    ]
      .map(normalize)
      .some((value) => value.includes(search));

  const matchesSegment =
    filter.segment === "all" ||
    (filter.segment === "review" && task.status === "review_needed") ||
    task.status === filter.segment;

  const matchesWorker =
    filter.workerId === "all" || task.assignedWorkerId === filter.workerId;
  const matchesRepository =
    filter.repositoryId === "all" || task.repositoryId === filter.repositoryId;
  const matchesProject =
    filter.projectId === "all" || task.linkedProjectId === filter.projectId;

  return (
    matchesSearch &&
    matchesSegment &&
    matchesWorker &&
    matchesRepository &&
    matchesProject
  );
}

function outputMatchesFilter(
  output: AgentOutput,
  filter: AgentHubFilter,
  session?: AgentSession,
) {
  const matchesRisk =
    filter.riskLevel === "all" || output.riskLevel === filter.riskLevel;
  const matchesType =
    filter.outputType === "all" || output.type === filter.outputType;
  const matchesRepository =
    filter.repositoryId === "all" || session?.repositoryId === filter.repositoryId;
  const matchesProject =
    filter.projectId === "all" || session?.linkedProjectId === filter.projectId;

  return matchesRisk && matchesType && matchesRepository && matchesProject;
}

function workerName(workers: AgentWorker[], id?: string) {
  return workers.find((worker) => worker.id === id)?.name ?? "Unassigned";
}

function taskTitle(tasks: AgentTask[], id?: string) {
  return tasks.find((task) => task.id === id)?.title ?? "Unlinked task";
}

function taskForSession(tasks: AgentTask[], session: AgentSession | undefined) {
  return tasks.find((task) => task.id === session?.taskId);
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-orange)]">
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
          className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          onClick={onClose}
          type="button"
        >
          x
        </button>
      </div>
    </div>
  );
}

function DialogFrame({
  open,
  onClose,
  title,
  eyebrow,
  headingId,
  children,
  sheet = false,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow: string;
  headingId: string;
  children: ReactNode;
  sheet?: boolean;
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
      aria-labelledby={headingId}
      className={cn(
        "m-auto w-[min(720px,calc(100vw-24px))] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop:bg-[rgba(7,11,18,.76)]",
        sheet &&
          "mr-0 h-[100dvh] max-h-[100dvh] w-[min(560px,100vw)] rounded-none sm:rounded-l-[18px]",
      )}
      onCancel={onClose}
      onClick={(event) => dialogBackdropClose(event, onClose)}
      ref={dialogRef}
    >
      <DialogHeader
        eyebrow={eyebrow}
        id={headingId}
        onClose={onClose}
        title={title}
      />
      {children}
    </dialog>
  );
}

function Header({
  onCreateTask,
  onNewPrompt,
  onAddContext,
  onConfigureWorker,
}: Readonly<{
  onCreateTask: () => void;
  onNewPrompt: () => void;
  onAddContext: () => void;
  onConfigureWorker: () => void;
}>) {
  return (
    <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-3 bg-[linear-gradient(90deg,rgba(91,124,250,.07),rgba(217,146,79,.04)_44%,transparent_72%)] px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
            Coding & Agents
          </p>
          <h1 className="mt-2 text-[30px] font-semibold leading-9 text-[var(--text-primary)]">
            Agent Hub
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[var(--text-secondary)]">
            Plan, assign and review agent work across coding projects
          </p>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button className={primaryButtonClass} onClick={onCreateTask} type="button">
            Create agent task
          </button>
          <button className={secondaryButtonClass} onClick={onNewPrompt} type="button">
            New prompt
          </button>
          <button className={secondaryButtonClass} onClick={onAddContext} type="button">
            Add context bundle
          </button>
          <button className={quietButtonClass} onClick={onConfigureWorker} type="button">
            Configure worker
          </button>
        </div>
      </div>
    </header>
  );
}

function FilterBar({
  filter,
  setFilter,
  viewModel,
}: Readonly<{
  filter: AgentHubFilter;
  setFilter: (filter: AgentHubFilter) => void;
  viewModel: AgentHubViewModel;
}>) {
  function update<K extends keyof AgentHubFilter>(key: K, value: AgentHubFilter[K]) {
    setFilter({
      ...filter,
      [key]: value,
    });
  }

  return (
    <section
      aria-label="Agent task filters"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] p-4"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.2fr)_repeat(5,minmax(140px,.7fr))]">
        <label>
          <FieldLabel>Search agent tasks</FieldLabel>
          <input
            className={inputClass}
            onChange={(event) => update("search", event.target.value)}
            placeholder="Search agent tasks"
            type="search"
            value={filter.search}
          />
        </label>
        <label>
          <FieldLabel>Worker</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) => update("workerId", event.target.value)}
            value={filter.workerId}
          >
            <option value="all">All workers</option>
            {viewModel.workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldLabel>Repository</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) => update("repositoryId", event.target.value)}
            value={filter.repositoryId}
          >
            <option value="all">All repositories</option>
            {viewModel.repositories.map((repository) => (
              <option key={repository.id} value={repository.id}>
                {repository.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldLabel>Project</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) => update("projectId", event.target.value)}
            value={filter.projectId}
          >
            <option value="all">All projects</option>
            {viewModel.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldLabel>Risk</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) =>
              update("riskLevel", event.target.value as AgentHubFilter["riskLevel"])
            }
            value={filter.riskLevel}
          >
            <option value="all">All risk</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          <FieldLabel>Output type</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) =>
              update("outputType", event.target.value as AgentHubFilter["outputType"])
            }
            value={filter.outputType}
          >
            <option value="all">All output</option>
            <option value="diff">Diff</option>
            <option value="plan">Plan</option>
            <option value="summary">Summary</option>
            <option value="note">Note</option>
            <option value="research">Research</option>
            <option value="prompt">Prompt</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {taskSegments.map((segment) => (
          <button
            className={cn(
              quietButtonClass,
              filter.segment === segment &&
                "border-[rgba(91,124,250,.5)] bg-[rgba(91,124,250,.14)] text-[var(--text-primary)]",
            )}
            key={segment}
            onClick={() => update("segment", segment)}
            type="button"
          >
            {segment === "review" ? "Review" : labelFromValue(segment)}
          </button>
        ))}
      </div>
    </section>
  );
}

function MissionControl({
  activeTask,
  nextReview,
  counts,
  onCreateTask,
  onReviewOutput,
  viewModel,
}: Readonly<{
  activeTask: AgentTask | null;
  nextReview: AgentOutput | null;
  counts: Record<"running" | "queued" | "blocked" | "reviewNeeded", number>;
  onCreateTask: () => void;
  onReviewOutput: () => void;
  viewModel: AgentHubViewModel;
}>) {
  return (
    <section
      aria-labelledby="agent-mission-control-heading"
      className="overflow-hidden rounded-[18px] border border-[rgba(91,124,250,.26)] bg-[rgba(15,23,36,.9)] shadow-[0_12px_30px_rgba(0,0,0,.18)] xl:col-span-7"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[linear-gradient(90deg,rgba(91,124,250,.12),rgba(217,146,79,.08)_58%,transparent)] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
              P0 · Review first
            </p>
            <h2
              className="mt-1 text-[22px] font-semibold leading-7 text-[var(--text-primary)]"
              id="agent-mission-control-heading"
            >
              Agent Mission Control
            </h2>
            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[var(--text-secondary)]">
              Decide what needs review now and what should be queued next. No
              autonomous worker starts from this page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={primaryButtonClass}
              disabled={!nextReview}
              onClick={onReviewOutput}
              type="button"
            >
              Review output
            </button>
            <button className={secondaryButtonClass} onClick={onCreateTask} type="button">
              Create task
            </button>
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,.8fr)]">
        <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.68)] p-4">
          <div className="flex items-start gap-3">
            <StatusDot accent={activeTask ? "var(--accent-orange)" : "var(--accent-cyan)"} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Active Agent Task
              </p>
              <p className="mt-2 text-[18px] font-semibold leading-6 text-[var(--text-primary)]">
                {activeTask?.title ?? "No active task selected"}
              </p>
              <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                {activeTask?.nextAction ??
                  "Create or queue an agent task when a scoped worker handoff is ready."}
              </p>
              {activeTask ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <CodingPill accent={viewModel.statusMeta[activeTask.status].accent}>
                    {viewModel.statusMeta[activeTask.status].label}
                  </CodingPill>
                  <CodingPill accent="var(--accent-blue)" quiet>
                    {activeTask.repositoryName}
                  </CodingPill>
                  <CodingPill accent="var(--accent-orange)" quiet>
                    {workerName(viewModel.workers, activeTask.assignedWorkerId)}
                  </CodingPill>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          {[
            ["Running", counts.running, "var(--accent-orange)"],
            ["Queued", counts.queued, "var(--accent-blue)"],
            ["Blocked", counts.blocked, "var(--accent-red)"],
            ["Review Needed", counts.reviewNeeded, "var(--accent-orange)"],
          ].map(([label, count, accent], index) => (
            <div
              className="flex items-center justify-between rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.44)] px-3 py-2"
              key={`agent-status-summary-${index}`}
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-secondary)]">
                <StatusDot accent={String(accent)} />
                {label}
              </span>
              <span className="text-[20px] font-semibold text-[var(--text-primary)]">
                {count}
              </span>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 rounded-[16px] border border-[rgba(217,146,79,.24)] bg-[rgba(217,146,79,.07)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-orange)]">
            Most important open review
          </p>
          <p className="mt-2 text-[16px] font-semibold text-[var(--text-primary)]">
            {nextReview?.title ?? "No pending review output"}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
            {nextReview?.summary ?? viewModel.emptyStates.noReviewItems.description}
          </p>
        </div>
      </div>
    </section>
  );
}

function ReviewQueue({
  outputs,
  sessions,
  tasks,
  workers,
  onReview,
  onDecision,
  emptyState,
}: Readonly<{
  outputs: AgentOutput[];
  sessions: AgentSession[];
  tasks: AgentTask[];
  workers: AgentWorker[];
  onReview: (output: AgentOutput) => void;
  onDecision: (output: AgentOutput, status: AgentOutput["reviewStatus"]) => void;
  emptyState: AgentHubViewModel["emptyStates"]["noReviewItems"];
}>) {
  const pending = outputs.filter((output) => output.reviewStatus === "pending");

  return (
    <CodingPanel
      className="xl:col-span-5"
      subtitle="Generated suggestions stay here until manually reviewed."
      title="Review Queue"
      badge={<CodingPill accent="var(--accent-orange)">{pending.length} pending</CodingPill>}
    >
      {pending.length === 0 ? (
        <EmptyStateCard description={emptyState.description} title={emptyState.title} />
      ) : (
        <div className="grid gap-3">
          {pending.map((output) => {
            const session = sessions.find((item) => item.id === output.sessionId);
            const task = taskForSession(tasks, session);

            return (
              <article
                className="rounded-[15px] border border-[rgba(217,146,79,.24)] bg-[rgba(217,146,79,.07)] p-3"
                key={output.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold leading-5 text-[var(--text-primary)]">
                      {output.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                      {workerName(workers, session?.workerId)} ·{" "}
                      {task?.title ?? "Unlinked task"}
                    </p>
                  </div>
                  <CodingPill
                    accent={
                      output.riskLevel === "high"
                        ? "var(--accent-red)"
                        : output.riskLevel === "medium"
                          ? "var(--accent-orange)"
                          : "var(--accent-green)"
                    }
                  >
                    {labelFromValue(output.riskLevel)} risk
                  </CodingPill>
                </div>
                <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
                  {output.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={primaryButtonClass} onClick={() => onReview(output)} type="button">
                    Review output
                  </button>
                  <button
                    className={quietButtonClass}
                    onClick={() => onDecision(output, "accepted")}
                    type="button"
                  >
                    Accept
                  </button>
                  <button
                    className={quietButtonClass}
                    onClick={() => onDecision(output, "edited")}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className={quietButtonClass}
                    onClick={() => onDecision(output, "rejected")}
                    type="button"
                  >
                    Reject
                  </button>
                  <button
                    className={quietButtonClass}
                    onClick={() => onDecision(output, "saved_as_note")}
                    type="button"
                  >
                    Save as note
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </CodingPanel>
  );
}

function AssignmentQueue({
  tasks,
  workers,
  viewModel,
  onOpenTask,
  onAssign,
  onCreateTask,
}: Readonly<{
  tasks: AgentTask[];
  workers: AgentWorker[];
  viewModel: AgentHubViewModel;
  onOpenTask: (task: AgentTask) => void;
  onAssign: (task: AgentTask) => void;
  onCreateTask: () => void;
}>) {
  return (
    <CodingPanel
      className="xl:col-span-7"
      subtitle="Prioritized local task queue. It prepares handoff, not execution."
      title="Assignment Queue"
      badge={<CodingPill accent="var(--accent-blue)">{tasks.length} tasks</CodingPill>}
    >
      {tasks.length === 0 ? (
        <EmptyStateCard
          action={
            <button className={primaryButtonClass} onClick={onCreateTask} type="button">
              Create agent task
            </button>
          }
          description={viewModel.emptyStates.noTasks.description}
          title={viewModel.emptyStates.noTasks.title}
        />
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <article
              className="rounded-[15px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.56)] p-3 transition hover:border-[var(--border-default)]"
              key={task.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
                    {task.title}
                  </p>
                  <p className="mt-1 max-w-3xl text-[12px] leading-5 text-[var(--text-secondary)]">
                    {task.goal}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CodingPill accent={viewModel.statusMeta[task.status].accent}>
                    {viewModel.statusMeta[task.status].label}
                  </CodingPill>
                  <CodingPill accent={viewModel.priorityMeta[task.priority].accent} quiet>
                    {viewModel.priorityMeta[task.priority].label}
                  </CodingPill>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-[11px] text-[var(--text-muted)] sm:grid-cols-2 xl:grid-cols-4">
                <span>Worker: {workerName(workers, task.assignedWorkerId)}</span>
                <span>Project: {task.linkedProjectTitle ?? "Unlinked"}</span>
                <span>Repo: {task.repositoryName ?? "Unlinked"}</span>
                <span>
                  Output: {labelFromValue(task.expectedOutput)}
                  {task.reviewRequired ? " · Review required" : ""}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-[12px] leading-5 text-[var(--text-secondary)]">
                  Next: {task.nextAction}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button className={secondaryButtonClass} onClick={() => onOpenTask(task)} type="button">
                    Open task
                  </button>
                  <button className={quietButtonClass} onClick={() => onAssign(task)} type="button">
                    Assign task
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </CodingPanel>
  );
}

function WorkerPool({
  workers,
  tasks,
  viewModel,
  selectedWorkerId,
  onAssignWorker,
}: Readonly<{
  workers: AgentWorker[];
  tasks: AgentTask[];
  viewModel: AgentHubViewModel;
  selectedWorkerId: string | null;
  onAssignWorker: (worker: AgentWorker) => void;
}>) {
  return (
    <CodingPanel
      className="xl:col-span-5"
      subtitle="Worker profiles and limits. These are roles, not autonomous machines."
      title="Worker Pool"
    >
      {workers.length === 0 ? (
        <EmptyStateCard
          description={viewModel.emptyStates.noWorkers.description}
          title={viewModel.emptyStates.noWorkers.title}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {workers.map((worker) => {
            const currentTask = tasks.find((task) => task.id === worker.currentTaskId);
            const selected = selectedWorkerId === worker.id;

            return (
              <article
                className={cn(
                  "rounded-[15px] border bg-[rgba(18,28,43,.56)] p-3 transition",
                  selected
                    ? "border-[rgba(91,124,250,.5)]"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-default)]",
                )}
                key={worker.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                      {worker.name}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                      {worker.role}
                    </p>
                  </div>
                  <CodingPill accent={viewModel.workerStatusMeta[worker.status].accent}>
                    {viewModel.workerStatusMeta[worker.status].label}
                  </CodingPill>
                </div>
                <p className="mt-3 text-[11px] leading-4 text-[var(--text-secondary)]">
                  {worker.reliabilityNote}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {worker.capabilities.slice(0, 4).map((capability) => (
                    <CodingPill accent="var(--accent-blue)" key={capability} quiet>
                      {capability}
                    </CodingPill>
                  ))}
                </div>
                <div className="mt-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)] p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Current task
                  </p>
                  <p className="mt-1 text-[12px] leading-4 text-[var(--text-secondary)]">
                    {currentTask?.title ?? "No active assignment"}
                  </p>
                </div>
                <ul className="mt-3 grid gap-1 text-[11px] leading-4 text-[var(--text-muted)]">
                  {worker.constraints.slice(0, 3).map((constraint) => (
                    <li className="flex gap-2" key={constraint}>
                      <span aria-hidden="true">-</span>
                      <span>{constraint}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={cn(secondaryButtonClass, "mt-3 w-full")}
                  disabled={worker.status === "offline" || worker.status === "needs_setup"}
                  onClick={() => onAssignWorker(worker)}
                  type="button"
                >
                  Assign task
                </button>
              </article>
            );
          })}
        </div>
      )}
    </CodingPanel>
  );
}

function PromptLibrary({
  prompts,
  emptyState,
  onNewPrompt,
}: Readonly<{
  prompts: PromptTemplate[];
  emptyState: AgentHubViewModel["emptyStates"]["noPrompts"];
  onNewPrompt: () => void;
}>) {
  return (
    <CodingPanel
      className="xl:col-span-4"
      subtitle="Reusable prompts stay visible, but below queue and review."
      title="Prompt Library Snapshot"
    >
      {prompts.length === 0 ? (
        <EmptyStateCard
          action={
            <button className={secondaryButtonClass} onClick={onNewPrompt} type="button">
              New prompt
            </button>
          }
          description={emptyState.description}
          title={emptyState.title}
        />
      ) : (
        <div className="grid gap-3">
          {prompts.slice(0, 5).map((prompt) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3"
              key={prompt.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {prompt.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                    {prompt.purpose}
                  </p>
                </div>
                <CodingPill accent="var(--accent-cyan)" quiet>
                  {prompt.category}
                </CodingPill>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[10px] text-[var(--text-faint)]">
                  Last used: {prompt.lastUsedAt ?? "Not used"}
                </span>
                <button className={quietButtonClass} type="button">
                  Open prompt
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </CodingPanel>
  );
}

function ContextBundles({
  bundles,
  onAddContext,
}: Readonly<{
  bundles: ContextBundle[];
  onAddContext: () => void;
}>) {
  return (
    <CodingPanel
      className="xl:col-span-4"
      subtitle="Linked repo, product, design and security context for agent handoff."
      title="Context Bundles"
      badge={
        <button className={quietButtonClass} onClick={onAddContext} type="button">
          Add context
        </button>
      }
    >
      <div className="grid gap-3">
        {bundles.map((bundle) => (
          <article
            className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3"
            key={bundle.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {bundle.title}
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {bundle.linkedItems} sources · Updated {bundle.updatedAt}
                </p>
              </div>
              <CodingPill accent="var(--accent-cyan)" quiet>
                {bundle.sourceType}
              </CodingPill>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-[var(--text-secondary)]">
              {bundle.linkedProjectTitle ?? "No project"} ·{" "}
              {bundle.repositoryName ?? "No repository"}
            </p>
          </article>
        ))}
      </div>
    </CodingPanel>
  );
}

function RecentSessions({
  sessions,
  tasks,
  workers,
  viewModel,
}: Readonly<{
  sessions: AgentSession[];
  tasks: AgentTask[];
  workers: AgentWorker[];
  viewModel: AgentHubViewModel;
}>) {
  return (
    <CodingPanel
      className="xl:col-span-4"
      subtitle="Completed and active sessions stay secondary to review decisions."
      title="Recent Agent Sessions"
    >
      <div className="grid gap-3">
        {sessions.map((session) => (
          <article
            className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3"
            key={session.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {taskTitle(tasks, session.taskId)}
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {workerName(workers, session.workerId)}
                </p>
              </div>
              <CodingPill accent={viewModel.statusMeta[session.status].accent}>
                {viewModel.statusMeta[session.status].label}
              </CodingPill>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
              {session.outputSummary}
            </p>
            <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
              Follow-up: {session.followUp ?? "None"}
            </p>
          </article>
        ))}
      </div>
    </CodingPanel>
  );
}

function Guardrails({ guardrails }: Readonly<{ guardrails: string[] }>) {
  return (
    <section
      aria-labelledby="agent-guardrails-heading"
      className="xl:col-span-12 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.48)] p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)]">
            P3 · System
          </p>
          <h2
            className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]"
            id="agent-guardrails-heading"
          >
            Agent Guardrails
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {guardrails.map((guardrail) => (
            <CodingPill accent="var(--accent-cyan)" key={guardrail} quiet>
              {guardrail}
            </CodingPill>
          ))}
        </div>
      </div>
    </section>
  );
}

function TaskComposerDialog({
  open,
  onClose,
  onQueue,
  onDraft,
  viewModel,
  presetWorkerId,
  presetTask,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onQueue: (draft: TaskDraft) => void;
  onDraft: (draft: TaskDraft) => void;
  viewModel: AgentHubViewModel;
  presetWorkerId: string | null;
  presetTask: AgentTask | null;
}>) {
  const [draft, setDraft] = useState<TaskDraft>(() =>
    initialTaskDraft(viewModel, presetWorkerId, presetTask),
  );
  const [touched, setTouched] = useState<Partial<Record<keyof TaskDraft, boolean>>>(
    {},
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  function updateDraft(
    key: keyof TaskDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const value =
      key === "reviewRequired"
        ? (event.target as HTMLInputElement).checked
        : event.target.value;

    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setSaveError(null);
  }

  function markTouched(key: keyof TaskDraft) {
    setTouched((current) => ({ ...current, [key]: true }));
  }

  function invalid(key: "title" | "goal" | "workerId") {
    return Boolean(touched[key] || saveError) && draft[key].trim().length === 0;
  }

  const canQueue =
    draft.title.trim().length > 0 &&
    draft.goal.trim().length > 0 &&
    draft.workerId.trim().length > 0;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canQueue) {
      setTouched({ title: true, goal: true, workerId: true });
      setSaveError("Task title, goal and worker are required.");
      return;
    }

    onQueue(draft);
  }

  return (
    <DialogFrame
      eyebrow="Dialog · Task Composer"
      headingId="agent-task-composer-heading"
      onClose={onClose}
      open={open}
      title="Create agent task"
    >
      <form onSubmit={submit}>
        <div className="grid max-h-[70dvh] gap-4 overflow-y-auto px-4 py-4">
          {saveError ? (
            <div className="rounded-[12px] border border-[rgba(221,107,95,.32)] bg-[rgba(221,107,95,.08)] p-3 text-[12px] text-[var(--text-secondary)]">
              {saveError}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <FieldLabel>Task title *</FieldLabel>
              <input
                aria-invalid={invalid("title")}
                className={inputClass}
                onBlur={() => markTouched("title")}
                onChange={(event) => updateDraft("title", event)}
                value={draft.title}
              />
            </label>
            <label>
              <FieldLabel>Worker *</FieldLabel>
              <select
                aria-invalid={invalid("workerId")}
                className={inputClass}
                onBlur={() => markTouched("workerId")}
                onChange={(event) => updateDraft("workerId", event)}
                value={draft.workerId}
              >
                <option value="">Select worker</option>
                {viewModel.workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <FieldLabel>Goal *</FieldLabel>
            <textarea
              aria-invalid={invalid("goal")}
              className={cn(inputClass, "min-h-24 py-3")}
              onBlur={() => markTouched("goal")}
              onChange={(event) => updateDraft("goal", event)}
              value={draft.goal}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <FieldLabel>Linked project</FieldLabel>
              <select
                className={inputClass}
                onChange={(event) => updateDraft("linkedProjectId", event)}
                value={draft.linkedProjectId}
              >
                {viewModel.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Repository</FieldLabel>
              <select
                className={inputClass}
                onChange={(event) => updateDraft("repositoryId", event)}
                value={draft.repositoryId}
              >
                {viewModel.repositories.map((repository) => (
                  <option key={repository.id} value={repository.id}>
                    {repository.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Prompt template</FieldLabel>
              <select
                className={inputClass}
                onChange={(event) => updateDraft("promptTemplateId", event)}
                value={draft.promptTemplateId}
              >
                {viewModel.promptTemplates.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Context bundle</FieldLabel>
              <select
                className={inputClass}
                onChange={(event) => updateDraft("contextBundleId", event)}
                value={draft.contextBundleId}
              >
                {viewModel.contextBundles.map((bundle) => (
                  <option key={bundle.id} value={bundle.id}>
                    {bundle.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Expected output</FieldLabel>
              <select
                className={inputClass}
                onChange={(event) =>
                  updateDraft(
                    "expectedOutput",
                    event as ChangeEvent<HTMLSelectElement>,
                  )
                }
                value={draft.expectedOutput}
              >
                {expectedOutputs.map((output) => (
                  <option key={output} value={output}>
                    {labelFromValue(output)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Priority</FieldLabel>
              <select
                className={inputClass}
                onChange={(event) =>
                  updateDraft("priority", event as ChangeEvent<HTMLSelectElement>)
                }
                value={draft.priority}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-3 text-[12px] text-[var(--text-secondary)]">
            <input
              checked={draft.reviewRequired}
              onChange={(event) => updateDraft("reviewRequired", event)}
              type="checkbox"
            />
            Review required
          </label>
          <label>
            <FieldLabel>Safety note / constraints</FieldLabel>
            <textarea
              className={cn(inputClass, "min-h-20 py-3")}
              onChange={(event) => updateDraft("safetyNote", event)}
              value={draft.safetyNote}
            />
          </label>
          <p className="rounded-[12px] border border-[rgba(95,200,215,.2)] bg-[rgba(95,200,215,.06)] p-3 text-[11px] leading-4 text-[var(--text-muted)]">
            Queue task only creates a local queue item with status queued. No
            agent, provider API, OAuth flow, token or background job is started.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Cancel
          </button>
          <div className="flex flex-wrap gap-2">
            <button className={quietButtonClass} onClick={() => onDraft(draft)} type="button">
              Save draft
            </button>
            <button className={primaryButtonClass} disabled={!canQueue} type="submit">
              Queue task
            </button>
          </div>
        </div>
      </form>
    </DialogFrame>
  );
}

function PromptDialog({
  open,
  onClose,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (draft: PromptDraft) => void;
}>) {
  const [draft, setDraft] = useState<PromptDraft>({
    title: "",
    purpose: "",
    category: "coding",
    body: "",
  });
  const [error, setError] = useState<string | null>(null);

  function update(
    key: keyof PromptDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim() || !draft.purpose.trim() || !draft.body.trim()) {
      setError("Title, purpose and prompt body are required.");
      return;
    }

    onSave(draft);
  }

  return (
    <DialogFrame
      eyebrow="Dialog · Prompt draft"
      headingId="new-agent-prompt-heading"
      onClose={onClose}
      open={open}
      title="New prompt"
    >
      <form onSubmit={submit}>
        <div className="grid gap-4 px-4 py-4">
          {error ? (
            <div className="rounded-[12px] border border-[rgba(221,107,95,.32)] bg-[rgba(221,107,95,.08)] p-3 text-[12px] text-[var(--text-secondary)]">
              {error}
            </div>
          ) : null}
          <label>
            <FieldLabel>Title *</FieldLabel>
            <input className={inputClass} onChange={(event) => update("title", event)} value={draft.title} />
          </label>
          <label>
            <FieldLabel>Purpose *</FieldLabel>
            <input className={inputClass} onChange={(event) => update("purpose", event)} value={draft.purpose} />
          </label>
          <label>
            <FieldLabel>Category</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("category", event)}
              value={draft.category}
            >
              {promptCategories.map((category) => (
                <option key={category} value={category}>
                  {labelFromValue(category)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Prompt body *</FieldLabel>
            <textarea
              className={cn(inputClass, "min-h-32 py-3")}
              onChange={(event) => update("body", event)}
              placeholder="Keep prompts scoped. Do not paste secrets."
              value={draft.body}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={primaryButtonClass} type="submit">
            Save prompt
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function ContextDialog({
  open,
  onClose,
  onSave,
  viewModel,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (draft: ContextDraft) => void;
  viewModel: AgentHubViewModel;
}>) {
  const [draft, setDraft] = useState<ContextDraft>({
    title: "",
    sourceType: "repository",
    linkedProjectId: viewModel.projects[0]?.id ?? "",
    repositoryId: viewModel.repositories[0]?.id ?? "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  function update(
    key: keyof ContextDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError("Title is required.");
      return;
    }

    onSave(draft);
  }

  return (
    <DialogFrame
      eyebrow="Dialog · Context bundle"
      headingId="add-agent-context-heading"
      onClose={onClose}
      open={open}
      title="Add context bundle"
    >
      <form onSubmit={submit}>
        <div className="grid gap-4 px-4 py-4">
          {error ? (
            <div className="rounded-[12px] border border-[rgba(221,107,95,.32)] bg-[rgba(221,107,95,.08)] p-3 text-[12px] text-[var(--text-secondary)]">
              {error}
            </div>
          ) : null}
          <label>
            <FieldLabel>Title *</FieldLabel>
            <input className={inputClass} onChange={(event) => update("title", event)} value={draft.title} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <FieldLabel>Source type</FieldLabel>
              <select
                className={inputClass}
                onChange={(event) => update("sourceType", event)}
                value={draft.sourceType}
              >
                {sourceTypes.map((sourceType) => (
                  <option key={sourceType} value={sourceType}>
                    {labelFromValue(sourceType)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Linked project</FieldLabel>
              <select
                className={inputClass}
                onChange={(event) => update("linkedProjectId", event)}
                value={draft.linkedProjectId}
              >
                {viewModel.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Repository</FieldLabel>
              <select
                className={inputClass}
                onChange={(event) => update("repositoryId", event)}
                value={draft.repositoryId}
              >
                {viewModel.repositories.map((repository) => (
                  <option key={repository.id} value={repository.id}>
                    {repository.fullName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <FieldLabel optional>Notes</FieldLabel>
            <textarea
              className={cn(inputClass, "min-h-24 py-3")}
              onChange={(event) => update("notes", event)}
              placeholder="Describe safe context. Do not include secrets."
              value={draft.notes}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={primaryButtonClass} type="submit">
            Save context
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function ReviewSheet({
  output,
  session,
  task,
  worker,
  onClose,
  onDecision,
}: Readonly<{
  output: AgentOutput | null;
  session?: AgentSession;
  task?: AgentTask;
  worker?: AgentWorker;
  onClose: () => void;
  onDecision: (status: AgentOutput["reviewStatus"]) => void;
}>) {
  return (
    <DialogFrame
      eyebrow="Sheet · Output review"
      headingId="agent-output-review-heading"
      onClose={onClose}
      open={Boolean(output)}
      sheet
      title="Review output"
    >
      {output ? (
        <div className="grid max-h-[calc(100dvh-73px)] gap-4 overflow-y-auto px-4 py-4">
          <CodingPill accent="var(--accent-orange)">Generated suggestion</CodingPill>
          <div>
            <p className="text-[18px] font-semibold text-[var(--text-primary)]">
              {output.title}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
              {output.summary}
            </p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Risk Level
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-primary)]">
                {labelFromValue(output.riskLevel)} risk · {output.type}
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Linked Project
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-primary)]">
                {task?.linkedProjectTitle ?? "Unlinked"}
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Repository
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-primary)]">
                {task?.repositoryName ?? "Unlinked"}
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Worker / Follow-up
              </p>
              <p className="mt-1 text-[13px] leading-5 text-[var(--text-primary)]">
                {worker?.name ?? "Unknown worker"} ·{" "}
                {session?.followUp ?? "No follow-up"}
              </p>
            </div>
          </div>
          <p className="rounded-[12px] border border-[rgba(221,107,95,.22)] bg-[rgba(221,107,95,.07)] p-3 text-[11px] leading-4 text-[var(--text-secondary)]">
            Critical content is never applied automatically. These buttons only
            update local review status.
          </p>
          <div className="grid gap-2">
            <button className={primaryButtonClass} onClick={() => onDecision("accepted")} type="button">
              Accept
            </button>
            <button className={secondaryButtonClass} onClick={() => onDecision("edited")} type="button">
              Edit
            </button>
            <button className={secondaryButtonClass} onClick={() => onDecision("rejected")} type="button">
              Reject
            </button>
            <button className={quietButtonClass} onClick={() => onDecision("saved_as_note")} type="button">
              Save as note
            </button>
          </div>
        </div>
      ) : null}
    </DialogFrame>
  );
}

function TaskInspectorSheet({
  task,
  worker,
  viewModel,
  onClose,
}: Readonly<{
  task: AgentTask | null;
  worker?: AgentWorker;
  viewModel: AgentHubViewModel;
  onClose: () => void;
}>) {
  const contexts = viewModel.contextBundles.filter((bundle) =>
    task?.contextBundleIds.includes(bundle.id),
  );
  const session = viewModel.sessions.find((item) => item.taskId === task?.id);
  const output = viewModel.outputs.find((item) => item.sessionId === session?.id);

  return (
    <DialogFrame
      eyebrow="Sheet · Task inspector"
      headingId="agent-task-inspector-heading"
      onClose={onClose}
      open={Boolean(task)}
      sheet
      title="Open task"
    >
      {task ? (
        <div className="grid max-h-[calc(100dvh-73px)] gap-4 overflow-y-auto px-4 py-4">
          <div>
            <p className="text-[18px] font-semibold text-[var(--text-primary)]">
              {task.title}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
              {task.goal}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CodingPill accent={viewModel.statusMeta[task.status].accent}>
              {viewModel.statusMeta[task.status].label}
            </CodingPill>
            <CodingPill accent={viewModel.priorityMeta[task.priority].accent} quiet>
              {viewModel.priorityMeta[task.priority].label}
            </CodingPill>
            {task.reviewRequired ? (
              <CodingPill accent="var(--accent-orange)">Review required</CodingPill>
            ) : null}
          </div>
          {[
            ["Worker", worker?.name ?? "Unassigned"],
            ["Project", task.linkedProjectTitle ?? "Unlinked"],
            ["Repository", task.repositoryName ?? "Unlinked"],
            ["Expected output", labelFromValue(task.expectedOutput)],
            ["Next action", task.nextAction],
            ["Output", output?.title ?? "No output yet"],
            ["Review status", output ? labelFromValue(output.reviewStatus) : "None"],
            ["Follow-up", session?.followUp ?? "No follow-up"],
          ].map(([label, value], index) => (
            <div
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3"
              key={`agent-output-summary-${index}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {label}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
                {value}
              </p>
            </div>
          ))}
          <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Context
            </p>
            {contexts.length === 0 ? (
              <p className="mt-1 text-[12px] leading-5 text-[var(--accent-red)]">
                Missing context bundle. This task is blocked until context is attached.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {contexts.map((context) => (
                  <CodingPill accent="var(--accent-cyan)" key={context.id} quiet>
                    {context.title}
                  </CodingPill>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </DialogFrame>
  );
}

export function AgentHubPage({
  viewModel,
}: Readonly<{
  viewModel: AgentHubViewModel;
}>) {
  const [filter, setFilter] = useState<AgentHubFilter>(defaultFilter);
  const [tasks, setTasks] = useState<AgentTask[]>(viewModel.tasks);
  const [outputs, setOutputs] = useState<AgentOutput[]>(viewModel.outputs);
  const [prompts, setPrompts] = useState<PromptTemplate[]>(viewModel.promptTemplates);
  const [contexts, setContexts] = useState<ContextBundle[]>(viewModel.contextBundles);
  const [composerOpen, setComposerOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [presetWorkerId, setPresetWorkerId] = useState<string | null>(null);
  const [presetTaskId, setPresetTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const workingViewModel = useMemo(
    () => ({
      ...viewModel,
      tasks,
      outputs,
      promptTemplates: prompts,
      contextBundles: contexts,
    }),
    [contexts, outputs, prompts, tasks, viewModel],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) =>
        taskMatchesFilter(task, filter, workerName(viewModel.workers, task.assignedWorkerId)),
      ),
    [filter, tasks, viewModel.workers],
  );

  const filteredOutputs = useMemo(
    () =>
      outputs.filter((output) => {
        const session = viewModel.sessions.find((item) => item.id === output.sessionId);
        return outputMatchesFilter(output, filter, session);
      }),
    [filter, outputs, viewModel.sessions],
  );

  const pendingReviewOutputs = filteredOutputs.filter(
    (output) => output.reviewStatus === "pending",
  );
  const activeTask =
    tasks.find((task) => task.status === "review_needed") ??
    tasks.find((task) => task.status === "running") ??
    tasks.find((task) => task.status === "queued") ??
    null;
  const selectedOutput =
    outputs.find((output) => output.id === selectedOutputId) ?? null;
  const selectedSession = viewModel.sessions.find(
    (session) => session.id === selectedOutput?.sessionId,
  );
  const selectedOutputTask = taskForSession(tasks, selectedSession);
  const selectedOutputWorker = viewModel.workers.find(
    (worker) => worker.id === selectedSession?.workerId,
  );
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedTaskWorker = viewModel.workers.find(
    (worker) => worker.id === selectedTask?.assignedWorkerId,
  );
  const presetTask = tasks.find((task) => task.id === presetTaskId) ?? null;

  const counts = {
    running: tasks.filter((task) => task.status === "running").length,
    queued: tasks.filter((task) => task.status === "queued").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    reviewNeeded: tasks.filter((task) => task.status === "review_needed").length,
  };

  function openComposer(workerId?: string, task?: AgentTask) {
    setPresetWorkerId(workerId ?? null);
    setPresetTaskId(task?.id ?? null);
    setComposerOpen(true);
  }

  function queueTask(draft: TaskDraft, status: AgentTaskStatus = "queued") {
    const project = viewModel.projects.find(
      (item) => item.id === draft.linkedProjectId,
    );
    const repository = viewModel.repositories.find(
      (item) => item.id === draft.repositoryId,
    );
    const task: AgentTask = {
      id: `task-local-${Date.now()}`,
      title: draft.title.trim(),
      goal: draft.goal.trim(),
      status,
      priority: draft.priority,
      assignedWorkerId: draft.workerId,
      linkedProjectId: project?.id,
      linkedProjectTitle: project?.title,
      repositoryId: repository?.id,
      repositoryName: repository?.fullName,
      promptTemplateId: draft.promptTemplateId || undefined,
      contextBundleIds: draft.contextBundleId ? [draft.contextBundleId] : [],
      expectedOutput: draft.expectedOutput,
      reviewRequired: draft.reviewRequired,
      createdAt: new Date().toISOString(),
      nextAction:
        status === "draft"
          ? "Review this draft before it enters the assignment queue."
          : "Hand this scoped task to the selected worker after manual confirmation.",
    };

    setTasks((current) => [task, ...current]);
    setComposerOpen(false);
    setToast({
      title:
        status === "draft"
          ? "Agent task saved as local draft"
          : "Agent task queued as draft workflow",
      body: "This updates UI state only. No real agent execution started.",
      tone: "success",
    });
  }

  function reviewDecision(status: AgentOutput["reviewStatus"]) {
    if (!selectedOutput) {
      return;
    }

    updateOutputReviewStatus(selectedOutput, status);
    setSelectedOutputId(null);
  }

  function updateOutputReviewStatus(
    targetOutput: AgentOutput,
    status: AgentOutput["reviewStatus"],
  ) {
    setOutputs((current) =>
      current.map((output) =>
        output.id === targetOutput.id
          ? {
              ...output,
              reviewStatus: status,
            }
          : output,
      ),
    );
    setToast({
      title: `Output ${labelFromValue(status)}`,
      body: "Review status changed locally. No generated output was applied.",
      tone: status === "rejected" ? "error" : "success",
    });
  }

  function savePrompt(draft: PromptDraft) {
    setPrompts((current) => [
      {
        id: `prompt-local-${Date.now()}`,
        title: draft.title.trim(),
        purpose: draft.purpose.trim(),
        category: draft.category,
        lastUsedAt: "Local draft",
      },
      ...current,
    ]);
    setPromptOpen(false);
    setToast({
      title: "Prompt saved locally",
      body: "The prompt draft is available in this UI state only.",
      tone: "success",
    });
  }

  function saveContext(draft: ContextDraft) {
    const project = viewModel.projects.find(
      (item) => item.id === draft.linkedProjectId,
    );
    const repository = viewModel.repositories.find(
      (item) => item.id === draft.repositoryId,
    );

    setContexts((current) => [
      {
        id: `context-local-${Date.now()}`,
        title: draft.title.trim(),
        sourceType: draft.sourceType,
        linkedItems: draft.notes.trim() ? 2 : 1,
        updatedAt: "Local draft",
        linkedProjectId: project?.id,
        linkedProjectTitle: project?.title,
        repositoryId: repository?.id,
        repositoryName: repository?.fullName,
      },
      ...current,
    ]);
    setContextOpen(false);
    setToast({
      title: "Context bundle saved locally",
      body: "No files, repositories, APIs or secrets were accessed.",
      tone: "success",
    });
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6"
      id="agent-hub-page"
    >
      <Header
        onAddContext={() => setContextOpen(true)}
        onConfigureWorker={() =>
          setToast({
            title: "Worker configuration is not connected",
            body: "Worker setup is intentionally local-only in this MVP.",
            tone: "info",
          })
        }
        onCreateTask={() => openComposer()}
        onNewPrompt={() => setPromptOpen(true)}
      />
      <FilterBar filter={filter} setFilter={setFilter} viewModel={workingViewModel} />

      <div className="grid min-w-0 gap-2 xl:grid-cols-12">
        <MissionControl
          activeTask={activeTask}
          counts={counts}
          nextReview={pendingReviewOutputs[0] ?? null}
          onCreateTask={() => openComposer()}
          onReviewOutput={() => {
            if (pendingReviewOutputs[0]) {
              setSelectedOutputId(pendingReviewOutputs[0].id);
            }
          }}
          viewModel={viewModel}
        />
        <ReviewQueue
          emptyState={viewModel.emptyStates.noReviewItems}
          onDecision={updateOutputReviewStatus}
          onReview={(output) => setSelectedOutputId(output.id)}
          outputs={filteredOutputs}
          sessions={viewModel.sessions}
          tasks={tasks}
          workers={viewModel.workers}
        />
        <AssignmentQueue
          onAssign={(task) => openComposer(task.assignedWorkerId, task)}
          onCreateTask={() => openComposer()}
          onOpenTask={(task) => setSelectedTaskId(task.id)}
          tasks={filteredTasks}
          viewModel={viewModel}
          workers={viewModel.workers}
        />
        <WorkerPool
          onAssignWorker={(worker) => openComposer(worker.id)}
          selectedWorkerId={presetWorkerId}
          tasks={tasks}
          viewModel={viewModel}
          workers={viewModel.workers}
        />
        <RecentSessions
          sessions={viewModel.sessions}
          tasks={tasks}
          viewModel={viewModel}
          workers={viewModel.workers}
        />
        <PromptLibrary
          emptyState={viewModel.emptyStates.noPrompts}
          onNewPrompt={() => setPromptOpen(true)}
          prompts={prompts}
        />
        <ContextBundles
          bundles={contexts}
          onAddContext={() => setContextOpen(true)}
        />
        <section
          aria-labelledby="future-error-state-heading"
          className="xl:col-span-12 rounded-[16px] border border-[rgba(221,107,95,.22)] bg-[rgba(221,107,95,.06)] p-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-red)]">
            Prepared error state
          </p>
          <h2
            className="mt-1 text-[15px] font-semibold text-[var(--text-primary)]"
            id="future-error-state-heading"
          >
            {viewModel.futureErrorState.title}
          </h2>
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
            {viewModel.futureErrorState.description}
          </p>
        </section>
        <Guardrails guardrails={viewModel.guardrails} />
      </div>

      <div className="order-last rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3">
        <p className="text-[10px] leading-4 text-[var(--text-faint)]">
          {viewModel.pageContract.pageType} · {viewModel.pageContract.writes} ·{" "}
          {viewModel.pageContract.canonicalSource}
        </p>
      </div>

      {composerOpen ? (
        <TaskComposerDialog
          onClose={() => setComposerOpen(false)}
          onDraft={(draft) => queueTask(draft, "draft")}
          onQueue={(draft) => queueTask(draft, "queued")}
          open={composerOpen}
          presetTask={presetTask}
          presetWorkerId={presetWorkerId}
          viewModel={workingViewModel}
        />
      ) : null}
      {promptOpen ? (
        <PromptDialog
          onClose={() => setPromptOpen(false)}
          onSave={savePrompt}
          open={promptOpen}
        />
      ) : null}
      {contextOpen ? (
        <ContextDialog
          onClose={() => setContextOpen(false)}
          onSave={saveContext}
          open={contextOpen}
          viewModel={workingViewModel}
        />
      ) : null}
      <ReviewSheet
        onClose={() => setSelectedOutputId(null)}
        onDecision={reviewDecision}
        output={selectedOutput}
        session={selectedSession}
        task={selectedOutputTask}
        worker={selectedOutputWorker}
      />
      <TaskInspectorSheet
        onClose={() => setSelectedTaskId(null)}
        task={selectedTask}
        viewModel={workingViewModel}
        worker={selectedTaskWorker}
      />
      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}
