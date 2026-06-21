"use client";

import Link from "next/link";
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
  codingStyle,
  inputClass,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "./components/coding-overview-primitives";
import type {
  AgentSessionViewModel,
  CodingOverviewViewModel,
  KnowledgeUpdateType,
  KnowledgeUpdateViewModel,
  RecentCodingSessionViewModel,
  RepositoryAttentionViewModel,
} from "./types";

type ToastTone = "success" | "info" | "error";

type ToastState = {
  title: string;
  body: string;
  tone: ToastTone;
};

type SessionDraft = {
  projectId: string;
  repositoryId: string;
  goal: string;
  plannedDuration: string;
  agentContext: string;
};

type NoteDraft = {
  type: KnowledgeUpdateType;
  body: string;
};

type ReviewDecision = "Accepted" | "Editing" | "Rejected" | "Saved as note";

const noteTypes: KnowledgeUpdateType[] = [
  "Note",
  "Decision",
  "Snippet",
  "Question",
];

const requiredSessionFields: Array<keyof Pick<
  SessionDraft,
  "projectId" | "repositoryId" | "goal"
>> = ["projectId", "repositoryId", "goal"];

function initialSessionDraft(
  viewModel: CodingOverviewViewModel,
): SessionDraft {
  return {
    projectId: viewModel.currentFocus?.projectId ?? viewModel.projects[0]?.id ?? "",
    repositoryId:
      viewModel.currentFocus?.repositoryId ?? viewModel.repositories[0]?.id ?? "",
    goal: viewModel.currentFocus?.nextAction ?? "",
    plannedDuration: viewModel.currentFocus?.plannedDuration ?? "60 min",
    agentContext: "",
  };
}

function fieldIsEmpty(value: string) {
  return value.trim().length === 0;
}

function dialogBackdropClose(
  event: MouseEvent<HTMLDialogElement>,
  onClose: () => void,
) {
  if (event.target === event.currentTarget) {
    onClose();
  }
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

    return () => {
      clearTimeout(timeout);
    };
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

function StartCodingSessionDialog({
  open,
  onClose,
  onSave,
  viewModel,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (draft: SessionDraft) => void;
  viewModel: CodingOverviewViewModel;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<SessionDraft>(() =>
    initialSessionDraft(viewModel),
  );
  const [touched, setTouched] = useState<
    Partial<Record<keyof SessionDraft, boolean>>
  >({});
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      setDraft(initialSessionDraft(viewModel));
      setTouched({});
      setSaveError(null);
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, viewModel]);

  function updateDraft(
    key: keyof SessionDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: event.target.value,
    }));
    setSaveError(null);
  }

  function markTouched(key: keyof SessionDraft) {
    setTouched((current) => ({
      ...current,
      [key]: true,
    }));
  }

  function fieldInvalid(key: keyof SessionDraft) {
    return Boolean(touched[key] || saveError) && fieldIsEmpty(draft[key]);
  }

  const canSave = requiredSessionFields.every((field) => !fieldIsEmpty(draft[field]));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSave) {
      setTouched({
        projectId: true,
        repositoryId: true,
        goal: true,
      });
      setSaveError(
        "Session could not be saved. Complete required fields first.",
      );
      return;
    }

    onSave(draft);
  }

  return (
    <dialog
      aria-labelledby="coding-session-dialog-heading"
      className="w-[min(680px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => dialogBackdropClose(event, onClose)}
      ref={dialogRef}
    >
      <form className="flex max-h-[calc(100dvh-24px)] flex-col" onSubmit={handleSubmit}>
        <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-blue)]">
                Dialog · Session setup
              </p>
              <h2
                className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
                id="coding-session-dialog-heading"
              >
                Start coding session
              </h2>
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                Manual session setup. Agent context is optional and visible.
              </p>
            </div>
            <button
              aria-label="Close start coding session dialog"
              className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              x
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <FieldLabel>Project *</FieldLabel>
              <select
                aria-invalid={fieldInvalid("projectId")}
                className={cn(
                  inputClass,
                  fieldInvalid("projectId") && "border-[rgba(221,107,95,.65)]",
                )}
                onBlur={() => markTouched("projectId")}
                onChange={(event) => updateDraft("projectId", event)}
                value={draft.projectId}
              >
                <option value="">Select project</option>
                {viewModel.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              {fieldInvalid("projectId") ? (
                <p className="mt-1 text-[10px] leading-4 text-[var(--accent-red)]">
                  Project is required.
                </p>
              ) : null}
            </label>

            <label className="block min-w-0">
              <FieldLabel>Repository *</FieldLabel>
              <select
                aria-invalid={fieldInvalid("repositoryId")}
                className={cn(
                  inputClass,
                  fieldInvalid("repositoryId") &&
                    "border-[rgba(221,107,95,.65)]",
                )}
                onBlur={() => markTouched("repositoryId")}
                onChange={(event) => updateDraft("repositoryId", event)}
                value={draft.repositoryId}
              >
                <option value="">Select repository</option>
                {viewModel.repositories.map((repository) => (
                  <option key={repository.id} value={repository.id}>
                    {repository.name}
                  </option>
                ))}
              </select>
              {fieldInvalid("repositoryId") ? (
                <p className="mt-1 text-[10px] leading-4 text-[var(--accent-red)]">
                  Repository is required.
                </p>
              ) : null}
            </label>

            <label className="block min-w-0 sm:col-span-2">
              <FieldLabel>Goal *</FieldLabel>
              <textarea
                aria-invalid={fieldInvalid("goal")}
                className={cn(
                  inputClass,
                  "min-h-[88px] resize-none py-2 leading-5",
                  fieldInvalid("goal") && "border-[rgba(221,107,95,.65)]",
                )}
                onBlur={() => markTouched("goal")}
                onChange={(event) => updateDraft("goal", event)}
                placeholder="What checkable result should this session produce?"
                rows={3}
                value={draft.goal}
              />
              {fieldInvalid("goal") ? (
                <p className="mt-1 text-[10px] leading-4 text-[var(--accent-red)]">
                  Goal is required before session can start.
                </p>
              ) : null}
            </label>

            <label className="block min-w-0">
              <FieldLabel>Planned duration</FieldLabel>
              <input
                className={inputClass}
                onChange={(event) => updateDraft("plannedDuration", event)}
                placeholder="60 min"
                type="text"
                value={draft.plannedDuration}
              />
            </label>

            <label className="block min-w-0">
              <FieldLabel optional>Agent context</FieldLabel>
              <input
                className={inputClass}
                onChange={(event) => updateDraft("agentContext", event)}
                placeholder="Prompt ref, review note or none"
                type="text"
                value={draft.agentContext}
              />
            </label>
          </div>

          {saveError ? (
            <p
              className="mt-4 rounded-[12px] border border-[rgba(221,107,95,.26)] bg-[rgba(221,107,95,.08)] px-3 py-2 text-[11px] leading-4 text-[var(--text-secondary)]"
              role="alert"
            >
              {saveError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
          <p className="max-w-md text-[10px] leading-4 text-[var(--text-faint)]">
            Phase 2 UI only. This prepares a local session result and does not
            write to Supabase, GitHub or a calendar.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={secondaryButtonClass} onClick={onClose} type="button">
              Cancel
            </button>
            <button className={primaryButtonClass} disabled={!canSave} type="submit">
              Start session
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

function CaptureCodeNoteDialog({
  open,
  onClose,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (draft: NoteDraft) => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<NoteDraft>({
    type: "Note",
    body: "",
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      setDraft({ type: "Note", body: "" });
      setTouched(false);
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const contentInvalid = touched && fieldIsEmpty(draft.body);
  const canSave = !fieldIsEmpty(draft.body);

  return (
    <dialog
      aria-labelledby="coding-note-dialog-heading"
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

          onSave(draft);
        }}
      >
        <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-blue)]">
                Quick capture
              </p>
              <h2
                className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
                id="coding-note-dialog-heading"
              >
                Capture code note
              </h2>
            </div>
            <button
              aria-label="Close capture code note dialog"
              className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              x
            </button>
          </div>
        </div>

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
                  body: event.target.value,
                }))
              }
              placeholder="Was wurde entschieden, gelernt oder muss spaeter geprueft werden?"
              rows={6}
              value={draft.body}
            />
            {contentInvalid ? (
              <p className="mt-1 text-[10px] leading-4 text-[var(--accent-red)]">
                Content is required before saving a note.
              </p>
            ) : null}
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
          <p className="max-w-xs text-[10px] leading-4 text-[var(--text-faint)]">
            Saved locally in UI state only. No Resource, Note or Supabase record
            is created.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={secondaryButtonClass} onClick={onClose} type="button">
              Cancel
            </button>
            <button className={primaryButtonClass} disabled={!canSave} type="submit">
              Save note
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

function AgentOutputReviewSheet({
  agent,
  decision,
  onClose,
  onDecision,
}: Readonly<{
  agent: AgentSessionViewModel | null;
  decision?: ReviewDecision;
  onClose: () => void;
  onDecision: (agent: AgentSessionViewModel, decision: ReviewDecision) => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (agent && !dialog.open) {
      dialog.showModal();
    }

    if (!agent && dialog.open) {
      dialog.close();
    }
  }, [agent]);

  return (
    <dialog
      aria-labelledby="agent-output-review-heading"
      className="fixed bottom-0 right-0 top-0 m-0 ml-auto h-dvh max-h-dvh w-[min(540px,100vw)] overflow-hidden rounded-l-[20px] border border-[rgba(217,146,79,.3)] bg-[var(--bg-shell)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop:bg-[rgba(0,0,0,.52)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      {agent ? (
        <div className="flex h-full flex-col">
          <div className="border-b border-[var(--border-subtle)] bg-[rgba(217,146,79,.06)] px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-orange)]">
                  Output Review Sheet
                </p>
                <h2
                  className="mt-1 text-[22px] font-semibold leading-7 text-[var(--text-primary)]"
                  id="agent-output-review-heading"
                >
                  Agent output review
                </h2>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                  Generated suggestion · not applied automatically
                </p>
              </div>
              <button
                aria-label="Close agent output review"
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
              <CodingPill accent="var(--accent-orange)">
                Generated suggestion
              </CodingPill>
              <CodingPill accent="var(--accent-orange)">
                {decision ?? agent.statusLabel}
              </CodingPill>
            </div>

            <div className="mt-5 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] p-4">
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                {agent.promptRef}
              </p>
              <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
                Summary: {agent.outputSummary}
              </p>
              <p className="mt-5 text-[12px] font-semibold text-[var(--accent-orange)]">
                Review status: {decision ?? "needs human decision"}
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.72)] px-5 py-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["Accepted", "Editing", "Rejected", "Saved as note"] as const).map(
                (action) => {
                  const actionLabel: Record<ReviewDecision, string> = {
                    Accepted: "Accept",
                    Editing: "Edit",
                    Rejected: "Reject",
                    "Saved as note": "Save as note",
                  };

                  return (
                  <button
                    className={action === "Accepted" ? primaryButtonClass : secondaryButtonClass}
                    key={action}
                    onClick={() => onDecision(agent, action)}
                    type="button"
                  >
                    {actionLabel[action]}
                  </button>
                  );
                },
              )}
            </div>
            <button
              className={cn(quietButtonClass, "mt-3 w-full")}
              onClick={onClose}
              type="button"
            >
              Close sheet
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

function RepositoryInspectorSheet({
  repository,
  onClose,
  onToast,
}: Readonly<{
  repository: RepositoryAttentionViewModel | null;
  onClose: () => void;
  onToast: (toast: ToastState) => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (repository && !dialog.open) {
      dialog.showModal();
    }

    if (!repository && dialog.open) {
      dialog.close();
    }
  }, [repository]);

  return (
    <dialog
      aria-labelledby="repository-inspector-heading"
      className="fixed bottom-0 right-0 top-0 m-0 ml-auto h-dvh max-h-dvh w-[min(540px,100vw)] overflow-hidden rounded-l-[20px] border border-[rgba(91,124,250,.28)] bg-[var(--bg-shell)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop:bg-[rgba(0,0,0,.52)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      {repository ? (
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
                  {repository.name}
                </h2>
                <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                  {repository.provider} · {repository.defaultBranch}
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
            <div className="grid gap-2 sm:grid-cols-3">
              <MetricCard
                accent={repository.primarySignalAccent}
                detail={repository.primarySignalLabel}
                label="Status"
                value={repository.status.replaceAll("_", " ")}
              />
              <MetricCard
                accent={
                  repository.signals.includes("failed_check")
                    ? "var(--accent-red)"
                    : "var(--accent-blue)"
                }
                detail={repository.checksSummary}
                label="Checks"
                value={repository.signals.includes("failed_check") ? "1 failed" : "manual"}
              />
              <MetricCard
                accent="var(--accent-blue)"
                detail={repository.lastActivityLabel}
                label="Activity"
                value={repository.lastActivityLabel}
              />
            </div>

            <div className="mt-5 space-y-3">
              <InspectorSignal
                accent={repository.primarySignalAccent}
                label="Latest signal"
                summary={repository.summary}
                tag={repository.primarySignalLabel}
              />
              <InspectorSignal
                accent={
                  repository.reviewSummary.includes("review") ||
                  repository.reviewSummary.includes("Review")
                    ? "var(--accent-orange)"
                    : "var(--accent-cyan)"
                }
                label="Review signal"
                summary={repository.reviewSummary}
                tag={
                  repository.reviewSummary.includes("review") ||
                  repository.reviewSummary.includes("Review")
                    ? "Review needed"
                    : "No review"
                }
              />
            </div>

            <div className="mt-5 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.56)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Next Action
              </p>
              <p className="mt-2 text-[13px] leading-5 text-[var(--text-secondary)]">
                {repository.nextAction}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.72)] px-5 py-4">
            <Link className={primaryButtonClass} href="/coding/repositories">
              Open detail
            </Link>
            <button
              className={secondaryButtonClass}
              onClick={() =>
                onToast({
                  title: "Next action prepared",
                  body: "A local next-action draft was prepared. No repository metadata was changed.",
                  tone: "info",
                })
              }
              type="button"
            >
              Set next action
            </button>
            <button className={quietButtonClass} onClick={onClose} type="button">
              Close inspector
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

function MetricCard({
  label,
  value,
  detail,
  accent,
}: Readonly<{
  label: string;
  value: string;
  detail: string;
  accent: string;
}>) {
  return (
    <div
      className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.66)] p-3"
      style={accentStyle(accent)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold text-[var(--text-muted)]">
          {label}
        </p>
        <StatusDot accent={accent} />
      </div>
      <p className="mt-2 text-[19px] font-semibold capitalize leading-6 text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
        {detail}
      </p>
    </div>
  );
}

function InspectorSignal({
  label,
  summary,
  tag,
  accent,
}: Readonly<{
  label: string;
  summary: string;
  tag: string;
  accent: string;
}>) {
  return (
    <div
      className="relative overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.56)] p-4 pl-5"
      style={accentStyle(accent)}
    >
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 top-0 w-1 bg-[var(--accent)]"
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
            {label}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
            {summary}
          </p>
        </div>
        <CodingPill accent={accent}>{tag}</CodingPill>
      </div>
    </div>
  );
}

function PageHeader({
  viewModel,
  onStartSession,
  onCaptureNote,
  onAddRepository,
}: Readonly<{
  viewModel: CodingOverviewViewModel;
  onStartSession: () => void;
  onCaptureNote: () => void;
  onAddRepository: () => void;
}>) {
  return (
    <header className="min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.76)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-4 bg-[linear-gradient(90deg,rgba(91,124,250,.055),transparent_48%)] px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
            {viewModel.header.eyebrow}
          </p>
          <h1 className="mt-1 text-[30px] font-semibold leading-none text-[var(--text-primary)]">
            {viewModel.header.title}
          </h1>
          <p className="mt-2 max-w-4xl text-[12px] leading-5 text-[var(--text-secondary)]">
            {viewModel.header.summary}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            {viewModel.header.contextLine}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {viewModel.header.stats.map((stat) => (
              <CodingPill accent={stat.accent} key={stat.label}>
                {stat.label}
              </CodingPill>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button className={secondaryButtonClass} onClick={onAddRepository} type="button">
            {viewModel.header.secondaryActions[0]}
          </button>
          <button className={secondaryButtonClass} onClick={onCaptureNote} type="button">
            {viewModel.header.secondaryActions[1]}
          </button>
          <button className={primaryButtonClass} onClick={onStartSession} type="button">
            {viewModel.header.primaryAction}
          </button>
        </div>
      </div>
    </header>
  );
}

function CurrentFocusCard({
  viewModel,
  onStartSession,
}: Readonly<{
  viewModel: CodingOverviewViewModel;
  onStartSession: () => void;
}>) {
  const focus = viewModel.currentFocus;

  return (
    <section
      aria-labelledby="current-focus-heading"
      className="order-1 min-w-0 overflow-hidden rounded-[20px] border border-[rgba(91,124,250,.28)] bg-[rgba(15,23,36,.92)] shadow-[0_8px_22px_rgba(0,0,0,.14)] xl:col-span-7"
    >
      <div className="bg-[linear-gradient(180deg,rgba(91,124,250,.12),rgba(95,200,215,.035)_78%,transparent)] p-4 sm:p-5">
        {focus ? (
          <>
            <CodingPill accent="var(--accent-blue)">P0 Current Focus</CodingPill>
            <h2
              className="mt-4 text-[28px] font-semibold leading-8 text-[var(--text-primary)]"
              id="current-focus-heading"
            >
              {focus.projectTitle}
            </h2>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
              {focus.repositoryName} · branch: {focus.branchContext}
            </p>

            <div className="mt-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Next checkable step
              </p>
              <p className="mt-2 max-w-3xl text-[20px] font-semibold leading-7 text-[var(--text-primary)]">
                {focus.nextAction}
              </p>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <MetricCard
                accent="var(--accent-blue)"
                detail="Deep work block"
                label="Planned session"
                value={focus.plannedDuration}
              />
              <MetricCard
                accent="var(--accent-cyan)"
                detail={focus.contextLabel}
                label="Branch context"
                value="Next.js"
              />
              <MetricCard
                accent="var(--accent-orange)"
                detail="Needs human review"
                label="Expected result"
                value={focus.expectedOutput}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-xl text-[11px] leading-5 text-[var(--text-muted)]">
                Start coding when goal, repo and review boundary are explicit.
              </p>
              <button className={primaryButtonClass} onClick={onStartSession} type="button">
                Start session
              </button>
            </div>
          </>
        ) : (
          <EmptyStateCard
            action={
              <button className={primaryButtonClass} onClick={onStartSession} type="button">
                Set focus
              </button>
            }
            description={viewModel.emptyStates.noFocus.description}
            title={viewModel.emptyStates.noFocus.title}
          />
        )}
      </div>
    </section>
  );
}

function ActiveWorkPanel({
  viewModel,
  onRepositoryOpen,
}: Readonly<{
  viewModel: CodingOverviewViewModel;
  onRepositoryOpen: (repositoryId: string) => void;
}>) {
  return (
    <CodingPanel
      className="order-3 xl:order-2 xl:col-span-5"
      subtitle="Maximal drei aktive Projekte oder Repositories."
      title="Active Work"
    >
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-3">
        {viewModel.activeWork.map((item) => (
          <button
            className="min-h-[128px] rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] p-3 text-left transition hover:border-[color-mix(in_srgb,var(--accent)_32%,var(--border-default))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            key={item.id}
            onClick={() => onRepositoryOpen(item.repositoryId)}
            style={accentStyle(item.accent)}
            type="button"
          >
            <div className="flex items-start gap-2">
              <StatusDot accent={item.accent} />
              <div className="min-w-0">
                <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
                  {item.title}
                </p>
                <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">
                  {item.repositoryName}
                </p>
              </div>
            </div>
            <p className="mt-4 line-clamp-2 text-[11px] leading-4 text-[var(--text-secondary)]">
              Next: {item.nextAction}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <CodingPill accent={item.accent}>{item.status}</CodingPill>
              <CodingPill quiet>{item.area}</CodingPill>
            </div>
          </button>
        ))}
      </div>
    </CodingPanel>
  );
}

function AgentQueuePanel({
  agents,
  decisions,
  onReview,
}: Readonly<{
  agents: AgentSessionViewModel[];
  decisions: Record<string, ReviewDecision>;
  onReview: (agent: AgentSessionViewModel) => void;
}>) {
  const reviewNeeded = agents.find((agent) => agent.reviewNeeded);

  return (
    <CodingPanel
      badge={
        reviewNeeded ? (
          <CodingPill accent="var(--accent-orange)">Review needed</CodingPill>
        ) : null
      }
      className="order-2 xl:order-3 xl:col-span-4"
      subtitle="Generated output waits for proposal review."
      title="Agent Queue"
    >
      <div className="space-y-2">
        {agents.map((agent) => {
          const decision = decisions[agent.id];
          const isReview = agent.reviewNeeded;

          return (
            <div
              className={cn(
                "rounded-[14px] border bg-[rgba(18,28,43,.54)] p-3",
                isReview
                  ? "border-[rgba(217,146,79,.28)]"
                  : "border-[var(--border-subtle)]",
              )}
              key={agent.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
                    {agent.promptRef}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                    {agent.helperText}
                  </p>
                </div>
                <CodingPill accent={agent.statusAccent}>
                  {decision ?? agent.statusLabel}
                </CodingPill>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="max-w-xs text-[11px] leading-4 text-[var(--text-secondary)]">
                  {agent.outputSummary}
                </p>
                <button
                  className={isReview ? primaryButtonClass : quietButtonClass}
                  disabled={!isReview}
                  onClick={() => onReview(agent)}
                  type="button"
                >
                  {isReview ? "Review output" : "No review"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </CodingPanel>
  );
}

function RepositoryAttentionPanel({
  repositories,
  emptyState,
  onRepositoryOpen,
}: Readonly<{
  repositories: RepositoryAttentionViewModel[];
  emptyState: CodingOverviewViewModel["emptyStates"]["noRepositories"];
  onRepositoryOpen: (repository: RepositoryAttentionViewModel) => void;
}>) {
  return (
    <CodingPanel
      className="order-4 xl:col-span-5"
      subtitle="Manual mock signals with a checkable next action."
      title="Repositories requiring attention"
    >
      {repositories.length === 0 ? (
        <EmptyStateCard
          description={emptyState.description}
          title={emptyState.title}
        />
      ) : (
        <div className="space-y-2">
          {repositories.map((repository) => (
            <button
              className="relative w-full overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] p-3 pl-5 text-left transition hover:border-[color-mix(in_srgb,var(--accent)_34%,var(--border-default))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              key={repository.repositoryId}
              onClick={() => onRepositoryOpen(repository)}
              style={accentStyle(repository.primarySignalAccent)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 top-0 w-1 bg-[var(--accent)]"
              />
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                    {repository.name}
                  </p>
                  <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">
                    {repository.lastActivityLabel} · {repository.summary}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CodingPill accent={repository.primarySignalAccent}>
                    {repository.primarySignalLabel}
                  </CodingPill>
                  <span
                    aria-hidden="true"
                    className="text-[18px] font-semibold text-[var(--text-secondary)]"
                  >
                    ›
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </CodingPanel>
  );
}

function RecentSessionsPanel({
  sessions,
  onToast,
}: Readonly<{
  sessions: RecentCodingSessionViewModel[];
  onToast: (toast: ToastState) => void;
}>) {
  return (
    <CodingPanel
      className="order-5 xl:col-span-3"
      subtitle="Outcome notes keep context recoverable."
      title="Recent Sessions"
    >
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.5)] p-3"
            key={session.id}
          >
            <div className="flex items-start gap-2">
              <StatusDot accent="var(--accent-blue)" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                  {session.goal}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                  {session.timeLabel} · {session.durationLabel} ·{" "}
                  {session.repositoryName}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-[var(--text-secondary)]">
              {session.outcomeLabel}
            </p>
            <button
              className="mt-3 text-[11px] font-semibold text-[var(--accent-blue)] transition hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={() =>
                onToast({
                  title: "Session note opened locally",
                  body: `${session.goal} is represented as static mock context in this overview.`,
                  tone: "info",
                })
              }
              type="button"
            >
              Open note
            </button>
          </div>
        ))}
      </div>
    </CodingPanel>
  );
}

function SkillFocusPanel({
  viewModel,
  onToast,
}: Readonly<{
  viewModel: CodingOverviewViewModel;
  onToast: (toast: ToastState) => void;
}>) {
  const skill = viewModel.skillFocus;

  return (
    <CodingPanel
      badge={<CodingPill accent="var(--accent-cyan)">{skill.evidenceStatus}</CodingPill>}
      className="order-6 xl:col-span-4"
      subtitle="One learning target linked to work evidence."
      title="Skill Focus"
    >
      <p className="text-[22px] font-semibold leading-7 text-[var(--text-primary)]">
        {skill.title}
      </p>
      <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
        {skill.summary}
      </p>
      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-[rgba(23,34,53,.92)]">
          <div
            className="h-full w-[var(--progress-width)] rounded-full bg-[var(--accent-cyan)]"
            style={codingStyle({ "--progress-width": `${skill.progress}%` })}
          />
        </div>
        <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
          {skill.evidenceDetail}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          className={secondaryButtonClass}
          onClick={() =>
            onToast({
              title: "Practice plan prepared",
              body: "A local practice intention was prepared. No Skills record was changed.",
              tone: "info",
            })
          }
          type="button"
        >
          {skill.primaryAction}
        </button>
        <button className={quietButtonClass} disabled type="button">
          {skill.secondaryAction}
        </button>
      </div>
    </CodingPanel>
  );
}

function KnowledgeUpdatesPanel({
  updates,
  onToast,
}: Readonly<{
  updates: KnowledgeUpdateViewModel[];
  onToast: (toast: ToastState) => void;
}>) {
  return (
    <CodingPanel
      className="order-7 xl:col-span-5"
      subtitle="Recently relevant technical notes and decisions."
      title="Knowledge Updates"
    >
      <div className="space-y-2">
        {updates.map((update) => (
          <div
            className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.5)] p-3"
            key={update.id}
          >
            <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
              <CodingPill accent={update.accent}>{update.type}</CodingPill>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                  {update.title}
                </p>
                <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">
                  {update.updatedAt} · {update.summary}
                </p>
              </div>
              <button
                className="justify-self-start text-[11px] font-semibold text-[var(--accent-blue)] transition hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] sm:justify-self-end"
                onClick={() =>
                  onToast({
                    title: "Knowledge item opened locally",
                    body: `${update.title} is a static mock entry for this overview.`,
                    tone: "info",
                  })
                }
                type="button"
              >
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </CodingPanel>
  );
}

function CodingRhythmPanel({
  viewModel,
}: Readonly<{
  viewModel: CodingOverviewViewModel;
}>) {
  const rhythm = viewModel.codingRhythm;
  const maxMinutes = Math.max(...rhythm.days.map((day) => day.minutes), 1);

  return (
    <CodingPanel
      className="order-8 xl:col-span-3"
      subtitle={`${rhythm.period} with text insight, not pressure.`}
      title={rhythm.title}
    >
      <p className="text-[13px] font-medium leading-5 text-[var(--text-secondary)]">
        {rhythm.statement}
      </p>
      <div
        aria-label={`${rhythm.title}: ${rhythm.statement}`}
        className="mt-5 flex h-[118px] items-end justify-between gap-2"
        role="img"
      >
        {rhythm.days.map((day) => (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={day.day}>
            <div
              aria-label={day.label}
              className="w-full max-w-[34px] rounded-[10px] border border-[rgba(91,124,250,.24)] bg-[rgba(91,124,250,.38)]"
              style={codingStyle({
                "--bar-height": `${Math.max(14, (day.minutes / maxMinutes) * 74)}px`,
                height: "var(--bar-height)",
              })}
              title={day.label}
            />
            <p className="text-[10px] text-[var(--text-muted)]">{day.day}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3">
        <p className="text-[12px] leading-5 text-[var(--text-secondary)]">
          {rhythm.insight}
        </p>
      </div>
    </CodingPanel>
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

export function CodingOverviewPage({
  viewModel,
}: Readonly<{
  viewModel: CodingOverviewViewModel;
}>) {
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [reviewAgent, setReviewAgent] = useState<AgentSessionViewModel | null>(
    null,
  );
  const [reviewDecisions, setReviewDecisions] = useState<
    Record<string, ReviewDecision>
  >({});
  const [inspectedRepository, setInspectedRepository] =
    useState<RepositoryAttentionViewModel | null>(null);
  const [localSession, setLocalSession] =
    useState<RecentCodingSessionViewModel | null>(null);
  const [capturedKnowledge, setCapturedKnowledge] = useState<
    KnowledgeUpdateViewModel[]
  >([]);

  const recentSessions = useMemo(() => {
    return [
      ...(localSession ? [localSession] : []),
      ...viewModel.recentSessions,
    ].slice(0, 3);
  }, [localSession, viewModel.recentSessions]);

  const knowledgeUpdates = useMemo(() => {
    return [...capturedKnowledge, ...viewModel.knowledgeUpdates].slice(0, 3);
  }, [capturedKnowledge, viewModel.knowledgeUpdates]);

  function openRepositoryById(repositoryId: string) {
    const repository = viewModel.repositoriesAttention.find(
      (item) => item.repositoryId === repositoryId,
    );

    if (repository) {
      setInspectedRepository(repository);
    }
  }

  function saveSession(draft: SessionDraft) {
    const project = viewModel.projects.find((item) => item.id === draft.projectId);
    const repository = viewModel.repositories.find(
      (item) => item.id === draft.repositoryId,
    );
    const duration = draft.plannedDuration.trim() || "planned";

    setLocalSession({
      id: `local-session-${Date.now()}`,
      projectId: draft.projectId,
      repositoryId: draft.repositoryId,
      goal: draft.goal.trim(),
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      outcome:
        "Session draft prepared locally. Review status and repository metadata stay unchanged.",
      projectTitle: project?.title ?? "Local session",
      repositoryName: repository?.name ?? "Manual repository",
      durationLabel: duration,
      timeLabel: "Now",
      outcomeLabel: "Session draft prepared locally · no persistence",
    });
    setSessionDialogOpen(false);
    setToast({
      title: "Session saved locally",
      body: "The session appears in Recent Sessions for this UI state only.",
      tone: "success",
    });
  }

  function saveNote(draft: NoteDraft) {
    const firstLine = draft.body.trim().split("\n")[0] ?? "Captured code note";

    setCapturedKnowledge((current) => [
      {
        id: `local-note-${Date.now()}`,
        type: draft.type,
        title: firstLine.slice(0, 72),
        summary: "Captured locally from Coding Overview",
        updatedAt: "Now",
        accent:
          draft.type === "Decision"
            ? "var(--accent-cyan)"
            : draft.type === "Question"
              ? "var(--accent-orange)"
              : "var(--accent-blue)",
      },
      ...current,
    ]);
    setCaptureDialogOpen(false);
    setToast({
      title: "Code note saved locally",
      body: `${draft.type} was added to the local Knowledge Updates preview.`,
      tone: "success",
    });
  }

  function handleReviewDecision(
    agent: AgentSessionViewModel,
    decision: ReviewDecision,
  ) {
    setReviewDecisions((current) => ({
      ...current,
      [agent.id]: decision,
    }));

    if (decision === "Saved as note") {
      setCapturedKnowledge((current) => [
        {
          id: `agent-note-${Date.now()}`,
          type: "Note",
          title: agent.promptRef,
          summary: "Agent output saved as local review note",
          updatedAt: "Now",
          accent: "var(--accent-orange)",
        },
        ...current,
      ]);
    }

    setReviewAgent(null);
    setToast({
      title: `Review ${decision.toLowerCase()}`,
      body: "The decision is local UI state only. Nothing was applied automatically.",
      tone: decision === "Rejected" ? "error" : "success",
    });
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6"
      id="coding-overview-page"
    >
      <PageHeader
        onAddRepository={() =>
          setToast({
            title: "Repository draft prepared",
            body: "Add repository is represented as a local phase-2 action. No GitHub sync was started.",
            tone: "info",
          })
        }
        onCaptureNote={() => setCaptureDialogOpen(true)}
        onStartSession={() => setSessionDialogOpen(true)}
        viewModel={viewModel}
      />

      <div className="grid min-w-0 gap-2 xl:grid-cols-12">
        <CurrentFocusCard
          onStartSession={() => setSessionDialogOpen(true)}
          viewModel={viewModel}
        />
        <AgentQueuePanel
          agents={viewModel.agentQueue}
          decisions={reviewDecisions}
          onReview={setReviewAgent}
        />
        <ActiveWorkPanel
          onRepositoryOpen={openRepositoryById}
          viewModel={viewModel}
        />
        <RepositoryAttentionPanel
          emptyState={viewModel.emptyStates.noRepositories}
          onRepositoryOpen={setInspectedRepository}
          repositories={viewModel.repositoriesAttention}
        />
        <RecentSessionsPanel onToast={setToast} sessions={recentSessions} />
        <SkillFocusPanel onToast={setToast} viewModel={viewModel} />
        <KnowledgeUpdatesPanel onToast={setToast} updates={knowledgeUpdates} />
        <CodingRhythmPanel viewModel={viewModel} />
      </div>

      <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3">
        <PageContractNote>
          {viewModel.pageContract.pageType} · {viewModel.pageContract.writes} ·{" "}
          {viewModel.pageContract.canonicalSource}
        </PageContractNote>
      </div>

      <StartCodingSessionDialog
        onClose={() => setSessionDialogOpen(false)}
        onSave={saveSession}
        open={sessionDialogOpen}
        viewModel={viewModel}
      />
      <CaptureCodeNoteDialog
        onClose={() => setCaptureDialogOpen(false)}
        onSave={saveNote}
        open={captureDialogOpen}
      />
      <AgentOutputReviewSheet
        agent={reviewAgent}
        decision={reviewAgent ? reviewDecisions[reviewAgent.id] : undefined}
        onClose={() => setReviewAgent(null)}
        onDecision={handleReviewDecision}
      />
      <RepositoryInspectorSheet
        onClose={() => setInspectedRepository(null)}
        onToast={setToast}
        repository={inspectedRepository}
      />
      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}
