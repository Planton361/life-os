"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  captureDashboardQuickThoughtAction,
} from "@/features/profile-data/actions";
import { saveMoodAction } from "@/features/real-data/actions/health.actions";
import { completeTaskFormAction } from "@/features/real-data/actions/task.actions";
import { initialDashboardActionState } from "@/features/profile-data/dashboard-action-state";
import type {
  DashboardCommandCenterMeta,
  DashboardCommandCenterViewModel,
  DashboardCurrentTask,
  DashboardDailyControl,
  DashboardMetric,
  DashboardQueueItem,
  DashboardQuickCapture,
} from "@/features/dashboard";
import { resolveContentStateMeta } from "@/features/content-state";
import { contentStateAttrs } from "@/components/dashboard/sections/section-primitives";
import { cn } from "@/lib/cn";

const DASHBOARD_LINK_FOCUS_CLASSES =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

function accentStyle(accent: string, progress?: number): CSSProperties {
  return {
    "--accent": accent,
    "--progress": `${progress ?? 0}%`,
  } as CSSProperties;
}

function ProgressBar({
  progress,
  accent,
  quiet = false,
}: Readonly<{
  progress: number;
  accent: string;
  quiet?: boolean;
}>) {
  return (
    <div className="h-1.5 rounded-full bg-[rgba(168,183,204,.14)]">
      <div
        aria-hidden="true"
        className={cn(
          "h-full w-[var(--progress)] rounded-full",
          quiet
            ? "bg-[color-mix(in_srgb,var(--accent)_56%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--accent)_88%,transparent)]",
        )}
        style={accentStyle(accent, progress)}
      />
    </div>
  );
}

const moodToneByLabel: Record<string, { symbol: string; accent: string }> = {
  Empty: { symbol: "•", accent: "var(--text-muted)" },
  Happy: { symbol: "◠", accent: "var(--accent-green)" },
  Content: { symbol: "◡", accent: "var(--accent-cyan)" },
  Calm: { symbol: "◇", accent: "var(--accent-cyan)" },
  Focused: { symbol: "◎", accent: "var(--accent-blue)" },
  Tired: { symbol: "◔", accent: "var(--text-muted)" },
  Anxious: { symbol: "!", accent: "var(--accent-orange)" },
  Stressed: { symbol: "⚠", accent: "var(--accent-red)" },
};

function moodToneFor(mood: string) {
  return moodToneByLabel[mood] ?? { symbol: "•", accent: "var(--accent-cyan)" };
}

function MetricCard({
  contentState,
  label,
  value,
  detail,
  progress,
  accent,
  href,
  profileId,
  compact = false,
}: Readonly<
  DashboardMetric & {
    compact?: boolean;
    profileId: DashboardCommandCenterViewModel["profileId"];
  }
>) {
  const className = cn(
    "flex h-full flex-col rounded-[13px] border bg-[color-mix(in_srgb,var(--accent)_3%,#101a2a)] p-2.5 pb-3",
    compact && "2xl:p-2 2xl:pb-2.5",
    href && DASHBOARD_LINK_FOCUS_CLASSES,
  );
  const style = {
    "--accent": accent,
    borderColor: "color-mix(in srgb, var(--accent) 22%, rgba(148,163,184,.08))",
  } as CSSProperties;
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium leading-tight text-[var(--text-secondary)]">
            {label}
          </p>
          <p
            className={cn(
              "mt-1 text-[19px] font-semibold leading-none text-[var(--text-secondary)]",
              compact && "2xl:mt-0.5 2xl:text-[17px]",
            )}
          >
            {value}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "mt-2.5 grid size-6 place-items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_8%,transparent)] bg-[color-mix(in_srgb,var(--accent)_4%,transparent)]",
            compact && "2xl:mt-2",
          )}
          style={{ "--accent": accent } as CSSProperties}
        >
          <span className="size-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_22%,transparent)]" />
        </span>
      </div>
      <p
        className={cn(
          "mt-1 text-[10px] font-medium leading-tight text-[var(--text-muted)]",
          compact && "2xl:mt-0.5",
        )}
      >
        {detail}
      </p>
      <div className={cn("mt-auto pt-2", compact && "2xl:pt-1")}>
        <ProgressBar accent={accent} progress={progress} />
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        aria-label={`${label}: ${value}, ${detail}`}
        className={className}
        href={href}
        style={style}
        {...(contentState ? contentStateAttrs(contentState, profileId) : {})}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      className={className}
      style={style}
      {...(contentState ? contentStateAttrs(contentState, profileId) : {})}
    >
      {content}
    </article>
  );
}

function QuickThought({
  data,
  profileId,
}: Readonly<{
  data: DashboardQuickCapture;
  profileId: DashboardCommandCenterViewModel["profileId"];
}>) {
  const [state, formAction, pending] = useActionState(
    captureDashboardQuickThoughtAction,
    initialDashboardActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section
      aria-labelledby="quick-thought-title"
      className="flex h-[265px] flex-col rounded-[var(--panel-radius)] border border-[rgba(91,124,250,.30)] bg-[color-mix(in_srgb,var(--accent-blue)_8%,rgba(15,26,43,.92))] p-3 shadow-[0_8px_22px_rgba(0,0,0,.12)]"
      {...contentStateAttrs(data.contentState, profileId)}
    >
      <div className="flex items-center justify-between">
        <h2
          className="text-[13px] font-semibold text-[var(--text-primary)]"
          id="quick-thought-title"
        >
          {data.title}
        </h2>
        <span className="text-[11px] font-semibold text-[var(--text-primary)]">
          {data.destinationLabel}
        </span>
      </div>
      <form
        action={formAction}
        className="mt-2 flex flex-1 flex-col rounded-[18px] border border-[rgba(91,124,250,.30)] bg-[color-mix(in_srgb,var(--accent-cyan)_5%,rgba(15,26,43,.92))] p-3"
        ref={formRef}
      >
        <label className="sr-only" htmlFor="quick-thought-content">
          Quick Thought
        </label>
        <textarea
          className={cn(
            "min-h-0 flex-1 resize-none border-l-4 border-[rgba(91,124,250,.90)] bg-transparent pl-3 text-[11px] leading-5 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]",
            DASHBOARD_LINK_FOCUS_CLASSES,
          )}
          id="quick-thought-content"
          name="content"
          placeholder={data.placeholder}
        />
        <p className="mt-2 text-[9px] font-medium text-[var(--text-faint)]">
          {data.helperText}
        </p>
        <input name="kind" type="hidden" value={data.activeKind} />
        <div className="mt-2 flex items-center gap-2">
          <button
            className={cn(
              "ml-auto rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(91,124,250,.20)] px-5 py-2 text-[10px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]",
              DASHBOARD_LINK_FOCUS_CLASSES,
            )}
            disabled={pending}
            type="submit"
          >
            {pending ? "Saving..." : data.captureLabel}
          </button>
        </div>
        {state.message ? (
          <p
            className={cn(
              "mt-2 text-[9px] font-semibold leading-4",
              state.status === "success"
                ? "text-[var(--accent-green)]"
                : state.status === "blocked"
                  ? "text-[var(--accent-orange)]"
                  : "text-[var(--text-muted)]",
            )}
            role={state.status === "success" ? "status" : "alert"}
          >
            {state.message}
          </p>
        ) : null}
        {state.status === "success" ? (
          <Link
            className={cn(
              "mt-1 inline-flex text-[9px] font-semibold text-[var(--accent-cyan)]",
              DASHBOARD_LINK_FOCUS_CLASSES,
            )}
            href="/inbox"
          >
            Inbox öffnen
          </Link>
        ) : null}
      </form>
    </section>
  );
}

function DailyControlStatusPill({
  label,
}: Readonly<{
  label: string;
}>) {
  return (
    <span className="rounded-full border border-[rgba(95,200,215,.30)] bg-[rgba(22,39,64,.96)] px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
      {label}
    </span>
  );
}

function DailyControlCurrentTask({
  profileId,
  task,
}: Readonly<{
  profileId: DashboardCommandCenterViewModel["profileId"];
  task: DashboardCurrentTask;
}>) {
  const canComplete =
    profileId === "manual" &&
    task.taskLifecycle &&
    task.taskLifecycle.status !== "done" &&
    task.taskLifecycle.status !== "blocked";
  const className = cn(
    "h-[204px] rounded-[18px] border border-[rgba(91,124,250,.34)] bg-[linear-gradient(180deg,rgba(24,42,70,.98),rgba(16,29,49,.98))] p-3 shadow-[inset_0_0_0_1px_rgba(91,124,250,.10)]",
    task.href && !canComplete && `block ${DASHBOARD_LINK_FOCUS_CLASSES}`,
  );
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase text-[var(--text-secondary)]">
            {task.sectionLabel}
          </p>
          <p className="mt-1 text-[10px] font-medium text-[var(--text-secondary)]">
            {task.timeRemainingLabel}
          </p>
        </div>
        <DailyControlStatusPill label={task.statusLabel} />
      </div>
      <p className="mt-3 text-[21px] font-semibold leading-[1.18] text-[var(--text-primary)]">
        {task.title}
      </p>
      <p className="mt-3 text-[11px] font-medium text-[var(--text-secondary)]">
        {task.contextLabel}
      </p>
      <div className="mt-2">
        <ProgressBar accent={task.accent} progress={task.progress} />
      </div>
      <div className="mt-3 flex min-h-[24px] items-center gap-1.5">
        {task.href && canComplete ? (
          <Link
            className={cn(
              "flex min-h-[24px] flex-1 items-center justify-center rounded-full border border-[rgba(95,200,215,.38)] bg-[rgba(91,124,250,.22)] text-[10px] font-medium text-[var(--text-secondary)] transition hover:border-[rgba(95,200,215,.52)] hover:text-[var(--text-primary)]",
              DASHBOARD_LINK_FOCUS_CLASSES,
            )}
            href={task.href}
          >
            {task.actionLabel}
          </Link>
        ) : (
          <span className="flex min-h-[24px] flex-1 items-center justify-center rounded-full border border-[rgba(95,200,215,.38)] bg-[rgba(91,124,250,.22)] text-[10px] font-medium text-[var(--text-secondary)]">
            {task.actionLabel}
          </span>
        )}
        {canComplete ? (
          <form action={completeTaskFormAction}>
            <input
              name="taskId"
              type="hidden"
              value={task.taskLifecycle?.taskId ?? ""}
            />
            <button
              className={cn(
                "min-h-[24px] rounded-full border border-[rgba(66,184,131,.32)] bg-[rgba(66,184,131,.14)] px-2.5 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(66,184,131,.48)] hover:text-[var(--text-primary)]",
                DASHBOARD_LINK_FOCUS_CLASSES,
              )}
              type="submit"
            >
              Abschließen
            </button>
          </form>
        ) : null}
      </div>
    </>
  );

  if (task.href && !canComplete) {
    return (
      <Link
        aria-label={`${task.sectionLabel}: ${task.title}`}
        className={className}
        href={task.href}
      >
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}

function DailyControlQueueItem({
  item,
}: Readonly<{
  item: DashboardQueueItem;
}>) {
  const className = cn(
    "grid min-h-12 grid-cols-[4px_8px_minmax(0,1fr)_76px_10px] items-center gap-2 rounded-xl border border-[rgba(91,124,250,.18)] bg-[color-mix(in_srgb,var(--accent-blue)_6%,#111c2e)] pr-2",
    item.href && DASHBOARD_LINK_FOCUS_CLASSES,
  );
  const content = (
    <>
      <span className="h-full rounded-full bg-[rgba(91,124,250,.84)]" />
      <span className="size-2 rounded-full bg-[var(--accent-cyan)]" />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-[var(--text-secondary)]">
          {item.title}
        </p>
        <p className="mt-0.5 truncate text-[10px] font-medium text-[var(--text-secondary)]">
          {item.meta}
        </p>
      </div>
      <span className="rounded-full border border-[rgba(91,124,250,.32)] bg-[rgba(91,124,250,.10)] px-2 py-1 text-center text-[10px] font-medium text-[var(--text-secondary)]">
        {item.tag}
      </span>
      <span
        aria-hidden="true"
        className="text-base text-[var(--text-secondary)]"
      >
        ›
      </span>
    </>
  );

  if (item.href) {
    return (
      <Link
        aria-label={`Open queued task: ${item.title}`}
        className={className}
        href={item.href}
      >
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}

function DailyControlQueue({
  data,
}: Readonly<{
  data: DashboardDailyControl;
}>) {
  return (
    <section
      aria-label={data.queueTitle}
      className="h-[204px] min-w-0 rounded-[13px] px-1"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
            {data.queueTitle}
          </h3>
          <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
            {data.queueSubtitle}
          </p>
        </div>
        <DailyControlStatusPill label={data.queueSummary} />
      </div>
      <div className="mt-2 space-y-1.5">
        {data.queue.length > 0 ? (
          data.queue.map((item) => (
            <DailyControlQueueItem item={item} key={item.id} />
          ))
        ) : (
          <div className="rounded-xl border border-[rgba(91,124,250,.18)] bg-[color-mix(in_srgb,var(--accent-blue)_5%,#111c2e)] p-3">
            <p className="text-[13px] font-medium text-[var(--text-secondary)]">
              Wähle oder erstelle eine Aufgabe für heute.
            </p>
            <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">
              Die Queue füllt sich mit priorisierten Aufgaben.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function DailyControl({
  data,
  profileId,
}: Readonly<{
  data: DashboardDailyControl;
  profileId: DashboardCommandCenterViewModel["profileId"];
}>) {
  return (
    <section
      aria-labelledby="daily-control-title"
      className="grid min-h-[265px] gap-3 overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(91,124,250,.38)] bg-[color-mix(in_srgb,var(--accent-blue)_8%,#15243a)] p-3 shadow-[0_16px_40px_rgba(0,0,0,.24)] lg:h-[265px] lg:grid-cols-[236px_minmax(0,1fr)]"
      {...contentStateAttrs(data.contentState, profileId)}
    >
      <div className="lg:col-span-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2
            className="text-sm font-semibold text-[var(--text-primary)]"
            id="daily-control-title"
          >
            {data.title}
          </h2>
          <p className="text-[10px] font-medium text-[var(--text-muted)]">
            {data.subtitle}
          </p>
        </div>
      </div>

      <DailyControlCurrentTask profileId={profileId} task={data.currentTask} />
      <DailyControlQueue data={data} />
    </section>
  );
}

function TimeProgress({
  data,
  profileId,
}: Readonly<{
  data: DashboardCommandCenterMeta;
  profileId: DashboardCommandCenterViewModel["profileId"];
}>) {
  const stateAttrs = contentStateAttrs(
    resolveContentStateMeta({
      capacity: 3,
      itemCount: data.timeProgress.length,
    }),
    profileId,
  );
  const className = cn(
    "h-full overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(95,200,215,.10)] bg-[color-mix(in_srgb,var(--accent-blue)_5%,#0d1625)] p-3 shadow-[0_10px_26px_rgba(0,0,0,.14)]",
    data.timeProgressHref && `block ${DASHBOARD_LINK_FOCUS_CLASSES}`,
  );
  const content = (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px]">
      <div>
        <h2
          className="text-xs font-medium text-[var(--text-secondary)]"
          id="time-progress-title"
        >
          Time Progress
        </h2>
        <div className="mt-2 space-y-1.5">
          {data.timeProgress.map((row) => (
            <div
              className="grid grid-cols-[72px_minmax(0,1fr)_32px] items-center gap-2"
              key={row.label}
            >
              <p className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
                {row.label}
              </p>
              <ProgressBar
                accent="var(--accent-blue)"
                progress={row.progress}
                quiet
              />
              <p className="text-[10px] font-medium text-[var(--text-muted)]">
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[18px] border border-[rgba(95,200,215,.10)] bg-[rgba(95,200,215,.07)] p-2 text-center">
        <div
          aria-hidden="true"
          className="mx-auto h-6 w-12 rounded-full bg-[rgba(95,200,215,.30)]"
        />
        <p className="mt-2 text-[9px] font-medium text-[var(--text-muted)]">
          {data.weather.temperatureLabel}
        </p>
        <p className="mt-0.5 text-[9px] font-medium text-[var(--text-muted)]">
          {data.weather.periodLabel}
        </p>
      </div>
    </div>
  );

  if (data.timeProgressHref) {
    return (
      <Link
        aria-label="Open Today time progress"
        className={className}
        href={data.timeProgressHref}
        {...stateAttrs}
      >
        {content}
      </Link>
    );
  }

  return (
    <section
      aria-labelledby="time-progress-title"
      className={className}
      {...stateAttrs}
    >
      {content}
    </section>
  );
}

function MoodBoard({
  data,
  profileId,
}: Readonly<{
  data: DashboardCommandCenterMeta;
  profileId: DashboardCommandCenterViewModel["profileId"];
}>) {
  const [activeMood, setActiveMood] = useState(data.moodCheck.activeOption);
  const activeMoodTone = moodToneFor(activeMood);
  const moodAccent = activeMoodTone.accent;

  const sourceAvailable = profileId === "manual" && data.moodCheck.options.length > 0;

  return (
    <section
      aria-labelledby="mood-title"
      className="relative isolate h-full overflow-hidden rounded-[var(--panel-radius)] border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,#0d1625)] p-2.5 shadow-[0_10px_26px_rgba(0,0,0,.14)]"
      style={accentStyle(moodAccent)}
      {...contentStateAttrs(
        {
          capacity: 1,
          itemCount: activeMood === "Empty" ? 0 : 1,
          state: activeMood === "Empty" ? "empty" : "filled",
        },
        profileId,
      )}
    >
      <div className="relative z-10 grid h-full gap-2 sm:grid-cols-[118px_minmax(0,1fr)] sm:items-center">
        <div className="flex h-full flex-col justify-center">
          <p className="text-[10px] font-semibold uppercase text-[color-mix(in_srgb,var(--accent)_86%,var(--text-secondary))]">
            {data.moodCheck.eyebrow}
          </p>
          <h2
            className="mt-1 text-base font-semibold text-[var(--text-primary)]"
            id="mood-title"
          >
            {data.moodCheck.title}
          </h2>
          <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">
            {data.moodCheck.prompt}
          </p>
          {data.moodCheck.href ? (
            <Link
              className={cn(
                "mt-1.5 w-fit rounded-full border border-[rgba(95,200,215,.18)] bg-[rgba(95,200,215,.08)] px-2 py-0.5 text-[9px] font-semibold text-[var(--text-secondary)]",
                DASHBOARD_LINK_FOCUS_CLASSES,
              )}
              href={data.moodCheck.href}
            >
              Mental health
            </Link>
          ) : null}
        </div>
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                aria-label={`${activeMood} mood indicator`}
                className="grid size-7 place-items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-sm text-[color-mix(in_srgb,var(--accent)_88%,var(--text-secondary))]"
              >
                {activeMoodTone.symbol}
              </span>
              <div>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {activeMood}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                  {data.moodCheck.detail}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-1.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[9px] font-semibold text-[var(--text-muted)]">
                {data.moodCheck.progressLabel}
              </p>
              <p className="text-[9px] font-semibold text-[var(--text-muted)]">
                {data.moodCheck.scoreLabel}
              </p>
            </div>
            <ProgressBar
              accent={moodAccent}
              progress={data.moodCheck.progress}
              quiet
            />
          </div>
          {sourceAvailable ? (
            <form action={saveMoodAction} className="mt-1.5 grid grid-cols-3 gap-1">
              <input type="hidden" name="returnTo" value="/dashboard" />
              {data.moodCheck.options.map((mood) => {
                const moodTone = moodToneFor(mood);

                return (
                  <button
                    aria-pressed={mood === activeMood}
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[9px] font-medium leading-4",
                      DASHBOARD_LINK_FOCUS_CLASSES,
                      mood === activeMood
                        ? "border-[color-mix(in_srgb,var(--accent)_36%,transparent)] bg-[color-mix(in_srgb,var(--accent)_13%,transparent)] text-[var(--text-primary)]"
                        : "border-[rgba(95,200,215,.10)] bg-[rgba(168,183,204,.04)] text-[var(--text-muted)]",
                    )}
                    key={mood}
                    onClick={() => setActiveMood(mood)}
                    name="mood"
                    style={accentStyle(moodTone.accent)}
                    type="submit"
                    value={mood}
                  >
                    {mood === activeMood ? "Set · " : ""}
                    {mood}
                  </button>
                );
              })}
            </form>
          ) : (
            <div className="mt-1.5 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] px-2 py-1.5 text-[9px] font-semibold leading-4 text-[var(--text-muted)]">
              {profileId === "manual" ? "Sign in to use Manual mood writes." : "Mood writes are unavailable in this profile."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function CommandCenter({
  data,
}: Readonly<{
  data: DashboardCommandCenterViewModel;
}>) {
  return (
    <header
      className="life-os-command-center px-3 pt-3"
      {...contentStateAttrs(data.commandCenter.contentState, data.profileId)}
    >
      <div className="rounded-[var(--panel-radius)] border border-[rgba(95,200,215,.14)] bg-[color-mix(in_srgb,var(--accent-blue)_4%,rgba(12,20,34,.94))] p-3 shadow-[0_10px_26px_rgba(0,0,0,.14)]">
        <div className="grid gap-3 min-[2400px]:h-[var(--top-zone-height)] min-[2400px]:grid-cols-[580px_278px_minmax(700px,1fr)_600px] min-[2400px]:items-start min-[2400px]:gap-[9px] min-[2400px]:overflow-hidden">
          <section
            aria-label="Command Center Stats"
            className="p-1 2xl:h-[265px] 2xl:overflow-hidden"
          >
            <p className="text-3xl font-semibold text-[var(--text-secondary)]">
              {data.commandCenter.greeting}
            </p>
            <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">
              {data.commandCenter.dateLabel} · {data.commandCenter.dayTypeLabel}
            </p>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:h-[181px] 2xl:grid-rows-[88px_81px] 2xl:gap-y-3">
              {data.commandCenter.metrics.map((metric, index) => (
                <MetricCard
                  compact={index >= 3}
                  key={`command-center-metric-${index}`}
                  profileId={data.profileId}
                  {...metric}
                />
              ))}
            </div>
          </section>

          <QuickThought data={data.quickCapture} profileId={data.profileId} />
          <DailyControl data={data.dailyControl} profileId={data.profileId} />

          <div className="grid h-[265px] grid-rows-[92px_minmax(0,1fr)] gap-3 overflow-hidden">
            <TimeProgress
              data={data.commandCenter}
              profileId={data.profileId}
            />
            <MoodBoard data={data.commandCenter} profileId={data.profileId} />
          </div>
        </div>
      </div>
    </header>
  );
}
