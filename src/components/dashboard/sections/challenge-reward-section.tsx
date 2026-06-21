"use client";

import type {
  DashboardChallenge,
  DashboardChallengeCadence,
  DashboardChallengesRewardFocus,
} from "@/features/dashboard";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Pill, ProgressBar } from "./section-primitives";
import {
  DashboardDialog,
  dashboardActionButtonClass,
  dashboardPrimaryButtonClass,
} from "./dashboard-dialog";

const DASHBOARD_LINK_FOCUS_CLASSES =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

const challengeCadences: readonly DashboardChallengeCadence[] = [
  "Daily",
  "Weekly",
  "Monthly",
];

function ChallengeConfirmDialog({
  challenge,
  onClose,
  onConfirm,
}: Readonly<{
  challenge: DashboardChallenge;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  return (
    <DashboardDialog
      labelledBy="challenge-confirm-dialog-heading"
      onClose={onClose}
      open
    >
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2
          className="text-lg font-semibold text-[var(--text-primary)]"
          id="challenge-confirm-dialog-heading"
        >
          Mark as done?
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          {challenge.title}
        </p>
      </div>
      <div className="p-5">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          This is a local prototype confirmation. It does not write challenge
          history or external health data.
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
        <button className={dashboardActionButtonClass} onClick={onClose} type="button">
          Cancel
        </button>
        <button className={dashboardPrimaryButtonClass} onClick={onConfirm} type="button">
          Confirm
        </button>
      </div>
    </DashboardDialog>
  );
}

export function Challenges({
  data,
}: Readonly<{
  data: DashboardChallengesRewardFocus;
}>) {
  const [activeCadence, setActiveCadence] =
    useState<DashboardChallengeCadence>("Daily");
  const [completedIds, setCompletedIds] = useState(
    () => new Set(data.items.filter((item) => item.completed).map((item) => item.id)),
  );
  const [confirmChallenge, setConfirmChallenge] =
    useState<DashboardChallenge | null>(null);
  const visibleChallenges = data.items.filter(
    (challenge) => challenge.cadence === activeCadence,
  );
  const title = data.href ? (
    <Link
      className={cn("rounded-sm", DASHBOARD_LINK_FOCUS_CLASSES)}
      href={data.href}
    >
      {data.title}
    </Link>
  ) : (
    data.title
  );

  return (
    <section
      aria-labelledby="challenges-title"
      className="overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(216,180,90,.16)] bg-[color-mix(in_srgb,var(--accent-yellow)_3%,#0c1320)] shadow-[0_8px_22px_rgba(0,0,0,.12)] 2xl:h-[205px]"
    >
      <div className="p-4 2xl:px-[28px] 2xl:py-[9px]">
        <div className="flex items-center justify-between gap-3">
          <h2
            className="text-lg font-semibold text-[var(--text-primary)]"
            id="challenges-title"
          >
            {title}
          </h2>
          <div className="flex shrink-0 rounded-full border border-[rgba(216,180,90,.18)] bg-[rgba(12,19,32,.64)] p-0.5 text-[8px] font-semibold text-[var(--text-muted)]">
            {challengeCadences.map((cadence) => (
              <button
                aria-pressed={cadence === activeCadence}
                className={cn(
                  "rounded-full px-2 py-0.5",
                  DASHBOARD_LINK_FOCUS_CLASSES,
                  cadence === activeCadence &&
                    "border border-[rgba(216,180,90,.30)] bg-[rgba(216,180,90,.12)] text-[var(--text-secondary)]",
                )}
                key={cadence}
                onClick={() => setActiveCadence(cadence)}
                type="button"
              >
                {cadence}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex min-h-7 flex-wrap items-center justify-between gap-2 rounded-full border border-[rgba(216,180,90,.18)] bg-[rgba(216,180,90,.07)] px-3">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
            {data.summary}
          </p>
          <p className="text-[8px] font-semibold text-[var(--text-muted)]">
            {data.measurementLabel}
          </p>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-3 2xl:gap-[10px]">
          {visibleChallenges.map((challenge) => {
            const completed = completedIds.has(challenge.id);
            const sourceLabel = completed ? "Done" : challenge.sourceLabel;
            const statusLabel = completed ? "Done" : challenge.status;
            const content = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[10px] font-semibold leading-snug text-[var(--text-secondary)]">
                    {challenge.title}
                  </h3>
                  <Pill
                    accent={completed ? "var(--accent-green)" : "var(--accent-yellow)"}
                  >
                    {sourceLabel}
                  </Pill>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[8px] font-medium text-[var(--text-muted)]">
                  <span>{challenge.type}</span>
                  <span>
                    {statusLabel}
                  </span>
                </div>
                {challenge.progress > 0 ? (
                  <div className="mt-2.5">
                    <ProgressBar
                      accent={completed ? "var(--accent-green)" : "var(--accent-yellow)"}
                      progress={completed ? 100 : challenge.progress}
                    />
                  </div>
                ) : null}
              </>
            );

            if (challenge.tracking === "manual" && !completed) {
              return (
                <button
                  aria-label={`Confirm challenge: ${challenge.title}`}
                  className={cn(
                    "flex flex-col justify-between rounded-[13px] border border-[rgba(216,180,90,.16)] bg-[color-mix(in_srgb,var(--accent-yellow)_4%,#0f1724)] p-3 text-left transition hover:border-[rgba(216,180,90,.30)] 2xl:h-[96px] 2xl:p-2.5",
                    DASHBOARD_LINK_FOCUS_CLASSES,
                  )}
                  key={challenge.id}
                  onClick={() => setConfirmChallenge(challenge)}
                  type="button"
                >
                  {content}
                </button>
              );
            }

            return (
              <article
                className="flex flex-col justify-between rounded-[13px] border border-[rgba(216,180,90,.16)] bg-[color-mix(in_srgb,var(--accent-yellow)_4%,#0f1724)] p-3 2xl:h-[96px] 2xl:p-2.5"
                key={challenge.id}
              >
                {content}
              </article>
            );
          })}
        </div>
      </div>
      {confirmChallenge ? (
        <ChallengeConfirmDialog
          challenge={confirmChallenge}
          onClose={() => setConfirmChallenge(null)}
          onConfirm={() => {
            setCompletedIds((current) => new Set(current).add(confirmChallenge.id));
            setConfirmChallenge(null);
          }}
        />
      ) : null}
    </section>
  );
}
