"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import {
  CurrencyPill,
  DialogShell,
  EmptyState,
  FieldLabel,
  LocalMockNotice,
  Pill,
  ProgressBar,
  StatusPill,
  SystemPageHeader,
  SystemPageShell,
  SystemPanel,
  Toast,
  chipButtonClass,
  createLocalId,
  formatDate,
  inputClass,
  matchesQuery,
  optionLabel,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
  textareaClass,
  type ToastState,
} from "@/features/system/system-ui";
import type {
  Challenge,
  ChallengeCadence,
  ChallengeDifficulty,
  ChallengeStatus,
  ChallengeTemplate,
  ChallengesViewModel,
} from "./types";

type ChallengeSegment = "all" | ChallengeCadence | "completed";
type ChallengeArea = NonNullable<Challenge["linkedArea"]>;
type DialogState =
  | { kind: "create"; template?: ChallengeTemplate }
  | { kind: "log"; challenge: Challenge }
  | { kind: "complete"; challenge: Challenge }
  | null;

type ChallengeDraft = {
  title: string;
  cadence: ChallengeCadence;
  difficulty: ChallengeDifficulty;
  description: string;
  rewardAmount: number;
  progressTarget: number;
  linkedArea: ChallengeArea | "none";
  dueLabel: string;
  nextAction: string;
};

const challengesAccent = "var(--accent-cyan)";
const warmAccent = "var(--accent-orange)";

const cadenceOptions: ChallengeCadence[] = ["daily", "weekly", "monthly"];
const difficultyOptions: ChallengeDifficulty[] = ["easy", "medium", "hard"];
const statusOptions: ChallengeStatus[] = [
  "active",
  "completed",
  "failed",
  "paused",
  "draft",
  "archived",
];
const areaOptions: (ChallengeArea | "none")[] = [
  "none",
  "health",
  "education",
  "work",
  "coding",
  "personal",
  "nutrition",
  "review",
];
const segmentOptions: { label: string; value: ChallengeSegment }[] = [
  { label: "All", value: "all" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Completed", value: "completed" },
];

const statusAccent: Record<ChallengeStatus, string> = {
  active: "var(--accent-cyan)",
  archived: "var(--text-muted)",
  completed: "var(--accent-green)",
  draft: "var(--text-muted)",
  failed: "var(--accent-red)",
  paused: "var(--accent-orange)",
};

const difficultyAccent: Record<ChallengeDifficulty, string> = {
  easy: "var(--accent-green)",
  hard: "var(--accent-orange)",
  medium: "var(--accent-cyan)",
};

function progressPercent(challenge: Challenge) {
  if (challenge.progressTarget <= 0) {
    return 0;
  }

  return (challenge.progressCurrent / challenge.progressTarget) * 100;
}

function emptyDraft(template?: ChallengeTemplate): ChallengeDraft {
  return {
    cadence: template?.cadence ?? "daily",
    description: template?.description ?? "",
    difficulty: template?.difficulty ?? "easy",
    dueLabel: template?.dueLabel ?? "",
    linkedArea: template?.linkedArea ?? "none",
    nextAction: template?.nextAction ?? "",
    progressTarget: template?.progressTarget ?? 1,
    rewardAmount: template?.rewardAmount ?? 4,
    title: template?.title ?? "",
  };
}

function updateProgressLabel(challenge: Challenge) {
  if (challenge.status === "completed") {
    return `${challenge.progressTarget} / ${challenge.progressTarget} · completed`;
  }

  if (challenge.progressCurrent >= challenge.progressTarget) {
    return `${challenge.progressCurrent} / ${challenge.progressTarget} · ready to complete`;
  }

  return `${challenge.progressCurrent} / ${challenge.progressTarget} · in progress`;
}

function ActiveChallengeFocus({
  challenge,
  onComplete,
  onLog,
}: Readonly<{
  challenge: Challenge | undefined;
  onComplete: (challenge: Challenge) => void;
  onLog: (challenge: Challenge) => void;
}>) {
  if (!challenge) {
    return (
      <SystemPanel
        className="lg:col-span-2"
        subtitle="No active challenge is currently selected from the mock list."
        title="Active Challenge Focus"
      >
        <EmptyState
          description="Create or activate a challenge to keep one specific behavior in focus."
          title="No active challenge"
        />
      </SystemPanel>
    );
  }

  const completeDisabled = challenge.progressCurrent < challenge.progressTarget;

  return (
    <SystemPanel
      badge={<CurrencyPill amount={challenge.rewardAmount} />}
      className="lg:col-span-2"
      subtitle="The current focus is deliberately small and measurable."
      title="Active Challenge Focus"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.5fr)]">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill accent={challengesAccent}>{optionLabel(challenge.cadence)}</Pill>
            <StatusPill accent={statusAccent[challenge.status]}>
              {optionLabel(challenge.status)}
            </StatusPill>
            <StatusPill accent={difficultyAccent[challenge.difficulty]}>
              {optionLabel(challenge.difficulty)}
            </StatusPill>
          </div>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
            {challenge.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {challenge.description}
          </p>
          <div className="mt-5">
            <ProgressBar
              accent={warmAccent}
              label={`Progress: ${challenge.progressLabel}`}
              value={progressPercent(challenge)}
            />
          </div>
        </div>
        <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Next action
          </p>
          <p className="mt-2 text-sm font-semibold leading-5 text-[var(--text-primary)]">
            {challenge.nextAction}
          </p>
          <div className="mt-4 space-y-2 text-xs text-[var(--text-muted)]">
            <p>Reward: {challenge.rewardAmount} LC</p>
            <p>Due: {challenge.dueLabel ?? "Not set"}</p>
            <p>Area: {challenge.linkedArea ? optionLabel(challenge.linkedArea) : "None"}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={primaryButtonClass} onClick={() => onLog(challenge)} type="button">
              Log progress
            </button>
            <button
              className={secondaryButtonClass}
              disabled={completeDisabled}
              onClick={() => onComplete(challenge)}
              type="button"
            >
              Mark completed
            </button>
          </div>
        </div>
      </div>
    </SystemPanel>
  );
}

function ChallengeCard({
  challenge,
  onComplete,
  onLog,
  onOpen,
}: Readonly<{
  challenge: Challenge;
  onComplete: () => void;
  onLog: () => void;
  onOpen: () => void;
}>) {
  const completeDisabled =
    challenge.status === "completed" || challenge.progressCurrent < challenge.progressTarget;

  return (
    <article className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.5)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {challenge.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill quiet>{optionLabel(challenge.cadence)}</Pill>
            <StatusPill accent={statusAccent[challenge.status]}>
              {optionLabel(challenge.status)}
            </StatusPill>
            <StatusPill accent={difficultyAccent[challenge.difficulty]}>
              {optionLabel(challenge.difficulty)}
            </StatusPill>
          </div>
        </div>
        <CurrencyPill amount={challenge.rewardAmount} />
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
        {challenge.description}
      </p>
      <div className="mt-3">
        <ProgressBar
          accent={challenge.status === "completed" ? "var(--accent-green)" : warmAccent}
          label={challenge.progressLabel}
          value={progressPercent(challenge)}
        />
      </div>
      <div className="mt-3 space-y-1 text-[10px] leading-4 text-[var(--text-muted)]">
        <p>Due: {challenge.dueLabel ?? "Not set"}</p>
        <p>Next: {challenge.nextAction}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={secondaryButtonClass} onClick={onOpen} type="button">
          Open
        </button>
        <button
          className={quietButtonClass}
          disabled={challenge.status === "completed"}
          onClick={onLog}
          type="button"
        >
          Log progress
        </button>
        <button
          className={quietButtonClass}
          disabled={completeDisabled}
          onClick={onComplete}
          type="button"
        >
          Complete
        </button>
      </div>
    </article>
  );
}

function ChallengeDialog({
  dialog,
  onClose,
  onCreate,
}: Readonly<{
  dialog: Extract<DialogState, { kind: "create" }> | null;
  onClose: () => void;
  onCreate: (draft: ChallengeDraft) => void;
}>) {
  const [draft, setDraft] = useState<ChallengeDraft>(() =>
    emptyDraft(dialog?.template),
  );
  const [error, setError] = useState<string | null>(null);

  if (!dialog) {
    return null;
  }

  function update<K extends keyof ChallengeDraft>(key: K, value: ChallengeDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError("Title is required");
      return;
    }

    if (draft.rewardAmount <= 0) {
      setError("Reward LC must be positive");
      return;
    }

    if (draft.progressTarget <= 0) {
      setError("Progress target must be positive");
      return;
    }

    if (!draft.nextAction.trim()) {
      setError("Next action is required");
      return;
    }

    onCreate(draft);
  }

  return (
    <DialogShell labelledBy="challenge-dialog-heading" onClose={onClose} open>
      <form onSubmit={submit}>
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="challenge-dialog-heading">
            Create challenge
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Local mock challenge only. No persistence or automation is connected.
          </p>
        </div>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <label>
            <FieldLabel>Title *</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => update("title", event.target.value)}
              value={draft.title}
            />
          </label>
          <label>
            <FieldLabel>Cadence *</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("cadence", event.target.value as ChallengeCadence)}
              value={draft.cadence}
            >
              {cadenceOptions.map((cadence) => (
                <option key={cadence} value={cadence}>
                  {optionLabel(cadence)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Difficulty</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) =>
                update("difficulty", event.target.value as ChallengeDifficulty)
              }
              value={draft.difficulty}
            >
              {difficultyOptions.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {optionLabel(difficulty)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Reward LC *</FieldLabel>
            <input
              className={inputClass}
              min={1}
              onChange={(event) => update("rewardAmount", Number(event.target.value))}
              type="number"
              value={draft.rewardAmount}
            />
          </label>
          <label>
            <FieldLabel>Progress Target *</FieldLabel>
            <input
              className={inputClass}
              min={1}
              onChange={(event) => update("progressTarget", Number(event.target.value))}
              type="number"
              value={draft.progressTarget}
            />
          </label>
          <label>
            <FieldLabel>Linked Area</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) =>
                update("linkedArea", event.target.value as ChallengeDraft["linkedArea"])
              }
              value={draft.linkedArea}
            >
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {optionLabel(area)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel optional>Due Label</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => update("dueLabel", event.target.value)}
              value={draft.dueLabel}
            />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Description</FieldLabel>
            <textarea
              className={textareaClass}
              onChange={(event) => update("description", event.target.value)}
              value={draft.description}
            />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Next Action *</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => update("nextAction", event.target.value)}
              value={draft.nextAction}
            />
          </label>
          {error ? (
            <p className="sm:col-span-2 rounded-[12px] border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.08)] px-3 py-2 text-xs text-[var(--accent-red)]">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={primaryButtonClass} type="submit">
            Save locally
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

function LogProgressDialog({
  dialog,
  onClose,
  onLog,
}: Readonly<{
  dialog: Extract<DialogState, { kind: "log" }> | null;
  onClose: () => void;
  onLog: (challenge: Challenge, increment: number) => void;
}>) {
  const [increment, setIncrement] = useState(1);
  const [note, setNote] = useState("");

  if (!dialog) {
    return null;
  }

  const activeDialog = dialog;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onLog(activeDialog.challenge, Math.max(1, increment));
  }

  return (
    <DialogShell labelledBy="log-progress-dialog-heading" onClose={onClose} open>
      <form onSubmit={submit}>
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="log-progress-dialog-heading">
            Log progress
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {activeDialog.challenge.title}
          </p>
        </div>
        <div className="space-y-4 p-5">
          <label>
            <FieldLabel>Progress increment</FieldLabel>
            <input
              className={inputClass}
              min={1}
              onChange={(event) => setIncrement(Number(event.target.value))}
              type="number"
              value={increment}
            />
          </label>
          <label>
            <FieldLabel optional>Note</FieldLabel>
            <textarea
              className={textareaClass}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Short local note"
              value={note}
            />
          </label>
          <LocalMockNotice>
            Note is local UI state only and is not stored after this page session.
          </LocalMockNotice>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={primaryButtonClass} type="submit">
            Log locally
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

function CompleteDialog({
  dialog,
  onClose,
  onComplete,
}: Readonly<{
  dialog: Extract<DialogState, { kind: "complete" }> | null;
  onClose: () => void;
  onComplete: (challenge: Challenge) => void;
}>) {
  if (!dialog) {
    return null;
  }

  return (
    <DialogShell labelledBy="complete-challenge-dialog-heading" onClose={onClose} open>
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="complete-challenge-dialog-heading">
          Mark completed
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          Completion simulated locally
        </p>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] p-4">
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {dialog.challenge.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Reward: {dialog.challenge.rewardAmount} LC
          </p>
        </div>
        <LocalMockNotice>Completion simulated locally. No real currency booking occurs.</LocalMockNotice>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
        <button className={secondaryButtonClass} onClick={onClose} type="button">
          Cancel
        </button>
        <button className={primaryButtonClass} onClick={() => onComplete(dialog.challenge)} type="button">
          Confirm completion
        </button>
      </div>
    </DialogShell>
  );
}

function ChallengeInspector({
  challenge,
  onClose,
  onComplete,
  onLog,
}: Readonly<{
  challenge: Challenge | null;
  onClose: () => void;
  onComplete: (challenge: Challenge) => void;
  onLog: (challenge: Challenge) => void;
}>) {
  if (!challenge) {
    return null;
  }

  return (
    <DialogShell labelledBy="challenge-inspector-heading" onClose={onClose} open>
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="challenge-inspector-heading">
          {challenge.title}
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          Inspector view for the selected local challenge.
        </p>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {challenge.description}
        </p>
        <div className="flex flex-wrap gap-2">
          <Pill accent={challengesAccent}>{optionLabel(challenge.cadence)}</Pill>
          <StatusPill accent={statusAccent[challenge.status]}>
            {optionLabel(challenge.status)}
          </StatusPill>
          <CurrencyPill amount={challenge.rewardAmount} />
        </div>
        <ProgressBar
          accent={warmAccent}
          label={challenge.progressLabel}
          value={progressPercent(challenge)}
        />
        <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.5)] p-4 text-xs leading-5 text-[var(--text-secondary)]">
          <p>Next Action: {challenge.nextAction}</p>
          <p>Due: {challenge.dueLabel ?? "Not set"}</p>
          <p>History: local mock state only</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
        <button className={secondaryButtonClass} onClick={() => onLog(challenge)} type="button">
          Log progress
        </button>
        <button
          className={secondaryButtonClass}
          disabled={challenge.progressCurrent < challenge.progressTarget}
          onClick={() => onComplete(challenge)}
          type="button"
        >
          Complete
        </button>
        <button className={quietButtonClass} onClick={onClose} type="button">
          Close
        </button>
      </div>
    </DialogShell>
  );
}

export function ChallengesPage({
  viewModel,
}: Readonly<{
  viewModel: ChallengesViewModel;
}>) {
  const [challenges, setChallenges] = useState<Challenge[]>(viewModel.challenges);
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<ChallengeSegment>("all");
  const [statusFilter, setStatusFilter] = useState<ChallengeStatus | "all">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<ChallengeDifficulty | "all">("all");
  const [areaFilter, setAreaFilter] = useState<ChallengeArea | "all">("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [inspector, setInspector] = useState<Challenge | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const activeFocus =
    challenges.find((challenge) => challenge.id === "challenge-weekly-review") ??
    challenges.find((challenge) => challenge.status === "active");

  const filteredChallenges = useMemo(
    () =>
      challenges.filter((challenge) => {
        const segmentMatches =
          segment === "all" ||
          (segment === "completed"
            ? challenge.status === "completed"
            : challenge.cadence === segment);
        const statusMatches =
          statusFilter === "all" || challenge.status === statusFilter;
        const difficultyMatches =
          difficultyFilter === "all" || challenge.difficulty === difficultyFilter;
        const areaMatches =
          areaFilter === "all" || challenge.linkedArea === areaFilter;

        return (
          segmentMatches &&
          statusMatches &&
          difficultyMatches &&
          areaMatches &&
          matchesQuery(
            [
              challenge.title,
              challenge.description,
              challenge.status,
              challenge.cadence,
              challenge.nextAction,
            ],
            query,
          )
        );
      }),
    [areaFilter, challenges, difficultyFilter, query, segment, statusFilter],
  );

  const completedChallenges = challenges.filter(
    (challenge) => challenge.status === "completed",
  );
  const rhythmStats = [
    `${completedChallenges.filter((challenge) => challenge.cadence === "daily").length} daily completed`,
    `${challenges.filter((challenge) => challenge.cadence === "weekly" && challenge.status === "active").length} weekly active`,
    `${challenges.filter((challenge) => challenge.cadence === "monthly" && challenge.status === "draft").length} monthly planned`,
    `${challenges
      .filter((challenge) => challenge.status === "active")
      .reduce((sum, challenge) => sum + challenge.rewardAmount, 0)} LC available from challenges`,
  ];

  function showToast(nextToast: ToastState) {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 2800);
  }

  function createChallenge(draft: ChallengeDraft) {
    const challenge: Challenge = {
      cadence: draft.cadence,
      createdByUser: true,
      description: draft.description,
      difficulty: draft.difficulty,
      dueLabel: draft.dueLabel || undefined,
      id: createLocalId("challenge"),
      linkedArea: draft.linkedArea === "none" ? undefined : draft.linkedArea,
      nextAction: draft.nextAction,
      progressCurrent: 0,
      progressLabel: `0 / ${draft.progressTarget} · active`,
      progressTarget: draft.progressTarget,
      rewardAmount: draft.rewardAmount,
      status: "active",
      title: draft.title,
    };

    setChallenges((current) => [challenge, ...current]);
    setDialog(null);
    showToast({
      body: "Challenge created locally",
      title: "Challenge created locally",
      tone: "success",
    });
  }

  function logProgress(challenge: Challenge, increment: number) {
    setChallenges((current) =>
      current.map((item) => {
        if (item.id !== challenge.id) {
          return item;
        }

        const updated = {
          ...item,
          progressCurrent: Math.min(
            item.progressTarget,
            item.progressCurrent + increment,
          ),
        };

        return {
          ...updated,
          progressLabel: updateProgressLabel(updated),
        };
      }),
    );
    setDialog(null);
    showToast({
      body: "Progress updated in local state only.",
      title: "Progress logged locally",
      tone: "success",
    });
  }

  function completeChallenge(challenge: Challenge) {
    setChallenges((current) =>
      current.map((item) => {
        if (item.id !== challenge.id) {
          return item;
        }

        const updated: Challenge = {
          ...item,
          completedAt: "2026-06-21",
          progressCurrent: item.progressTarget,
          status: "completed",
        };

        return {
          ...updated,
          progressLabel: updateProgressLabel(updated),
        };
      }),
    );
    setDialog(null);
    setInspector(null);
    showToast({
      body: "Completion simulated locally. No real LC booking was made.",
      title: "Challenge completed locally",
      tone: "success",
    });
  }

  return (
    <SystemPageShell accent={challengesAccent}>
      <SystemPageHeader
        eyebrow="Motivation / Challenges"
        primaryAction={
          <button
            className={primaryButtonClass}
            onClick={() => setDialog({ kind: "create" })}
            type="button"
          >
            Create challenge
          </button>
        }
        secondaryActions={
          <>
            <button
              className={secondaryButtonClass}
              disabled={!activeFocus}
              onClick={() => activeFocus && setDialog({ challenge: activeFocus, kind: "log" })}
              type="button"
            >
              Log completion
            </button>
            <button
              className={secondaryButtonClass}
              onClick={() => setSegment("completed")}
              type="button"
            >
              View completed
            </button>
          </>
        }
        summary="Daily, weekly and monthly special tasks"
        title="Challenges"
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <ActiveChallengeFocus
          challenge={activeFocus}
          onComplete={(challenge) => setDialog({ challenge, kind: "complete" })}
          onLog={(challenge) => setDialog({ challenge, kind: "log" })}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <SystemPanel
          badge={<Pill quiet>{filteredChallenges.length} visible</Pill>}
          subtitle="Daily, weekly and monthly cards stay grouped without a heavy Kanban surface."
          title="Challenge Board"
        >
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(150px,auto))]">
              <label>
                <FieldLabel>Search challenges</FieldLabel>
                <input
                  className={inputClass}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Search challenges"
                  value={query}
                />
              </label>
              <label>
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as ChallengeStatus | "all")
                  }
                  value={statusFilter}
                >
                  <option value="all">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {optionLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Difficulty</FieldLabel>
                <select
                  className={inputClass}
                  onChange={(event) =>
                    setDifficultyFilter(event.target.value as ChallengeDifficulty | "all")
                  }
                  value={difficultyFilter}
                >
                  <option value="all">All difficulty</option>
                  {difficultyOptions.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {optionLabel(difficulty)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Area</FieldLabel>
                <select
                  className={inputClass}
                  onChange={(event) =>
                    setAreaFilter(event.target.value as ChallengeArea | "all")
                  }
                  value={areaFilter}
                >
                  <option value="all">All areas</option>
                  {areaOptions
                    .filter((area) => area !== "none")
                    .map((area) => (
                      <option key={area} value={area}>
                        {optionLabel(area)}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {segmentOptions.map((option) => (
                <button
                  aria-pressed={segment === option.value}
                  className={cn(
                    chipButtonClass,
                    segment === option.value
                      ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text-primary)]"
                      : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] text-[var(--text-muted)]",
                  )}
                  key={option.value}
                  onClick={() => setSegment(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            {cadenceOptions.map((cadence) => {
              const cadenceChallenges = filteredChallenges.filter(
                (challenge) => challenge.cadence === cadence,
              );

              return (
                <section aria-labelledby={`${cadence}-challenges-heading`} key={cadence}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3
                      className="text-sm font-semibold text-[var(--text-primary)]"
                      id={`${cadence}-challenges-heading`}
                    >
                      {optionLabel(cadence)} Challenges
                    </h3>
                    <Pill quiet>{cadenceChallenges.length}</Pill>
                  </div>
                  {cadenceChallenges.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {cadenceChallenges.map((challenge) => (
                        <ChallengeCard
                          challenge={challenge}
                          key={challenge.id}
                          onComplete={() => setDialog({ challenge, kind: "complete" })}
                          onLog={() => setDialog({ challenge, kind: "log" })}
                          onOpen={() => setInspector(challenge)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      description={`No ${cadence} challenges match the current filters.`}
                      title={`No ${cadence} challenges`}
                    />
                  )}
                </section>
              );
            })}
          </div>
        </SystemPanel>

        <div className="space-y-3">
          <SystemPanel
            badge={<Pill accent={warmAccent}>Rhythm</Pill>}
            subtitle="Quiet signals from mock data only. No streak pressure."
            title="Challenge Rhythm"
          >
            <div className="grid gap-2">
              {rhythmStats.map((stat) => (
                <div
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-2 text-xs text-[var(--text-secondary)]"
                  key={stat}
                >
                  {stat}
                </div>
              ))}
            </div>
          </SystemPanel>

          <SystemPanel
            subtitle="Use a template to prefill the local creator dialog."
            title="Challenge Ideas"
          >
            <div className="space-y-2">
              {viewModel.templates.map((template) => (
                <div
                  className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3"
                  key={template.title}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {template.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                        {optionLabel(template.cadence)} · {template.rewardAmount} LC
                      </p>
                    </div>
                    <button
                      className={quietButtonClass}
                      onClick={() => setDialog({ kind: "create", template })}
                      type="button"
                    >
                      Use template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SystemPanel>

          <SystemPanel
            subtitle="Rules prevent pressure, punishment and vague tasks."
            title="Challenge Rules"
          >
            <ul className="space-y-2">
              {viewModel.rules.map((rule) => (
                <li
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-2 text-xs text-[var(--text-secondary)]"
                  key={rule}
                >
                  {rule}
                </li>
              ))}
            </ul>
          </SystemPanel>
        </div>
      </div>

      <SystemPanel
        badge={<Pill quiet>{completedChallenges.length} completed</Pill>}
        subtitle="A compact record of completed special tasks, not a trophy wall."
        title="Completed Challenges"
      >
        {completedChallenges.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {completedChallenges.map((challenge) => (
              <article
                className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3"
                key={challenge.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {challenge.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      {challenge.completedAt ? formatDate(challenge.completedAt) : "Completed"} ·{" "}
                      {challenge.linkedArea ? optionLabel(challenge.linkedArea) : "No area"}
                    </p>
                  </div>
                  <CurrencyPill amount={challenge.rewardAmount} />
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                  Outcome: {challenge.nextAction}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Completed challenges will appear here after local completion simulation."
            title="No completed challenges"
          />
        )}
      </SystemPanel>

      <ChallengeDialog
        dialog={dialog?.kind === "create" ? dialog : null}
        key={dialog?.kind === "create" ? `create-${dialog.template?.title ?? "blank"}` : "create-closed"}
        onClose={() => setDialog(null)}
        onCreate={createChallenge}
      />
      <LogProgressDialog
        dialog={dialog?.kind === "log" ? dialog : null}
        key={dialog?.kind === "log" ? `log-${dialog.challenge.id}` : "log-closed"}
        onClose={() => setDialog(null)}
        onLog={logProgress}
      />
      <CompleteDialog
        dialog={dialog?.kind === "complete" ? dialog : null}
        onClose={() => setDialog(null)}
        onComplete={completeChallenge}
      />
      <ChallengeInspector
        challenge={inspector}
        onClose={() => setInspector(null)}
        onComplete={(challenge) => setDialog({ challenge, kind: "complete" })}
        onLog={(challenge) => setDialog({ challenge, kind: "log" })}
      />
      <Toast toast={toast} />
    </SystemPageShell>
  );
}
