import Link from "next/link";
import {
  PageHeader,
  Pill,
  RoutePage,
  SectionPanel,
} from "@/components/layout/route-page-primitives";
import {
  saveDailyReviewFormAction,
  saveWeeklyReviewFormAction,
} from "@/features/real-data/actions/review.actions";
import type { ReviewPageViewModel } from "./review-view-model";

const fieldClass =
  "mt-1 min-h-11 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus-visible:border-[var(--accent-cyan)] focus-visible:ring-2 focus-visible:ring-[rgba(95,200,215,.18)] disabled:cursor-not-allowed disabled:opacity-60";

function lines(values: readonly string[]) {
  return values.join("\n");
}

export function ReviewPage({
  feedback,
  viewModel,
}: Readonly<{
  feedback?: string;
  viewModel: ReviewPageViewModel;
}>) {
  const daily = viewModel.kind === "daily";
  const title = daily ? "Daily Review" : "Weekly Review";
  const periodLabel = daily
    ? viewModel.periodStart
    : `${viewModel.periodStart} – ${viewModel.periodEnd}`;
  const action = daily ? saveDailyReviewFormAction : saveWeeklyReviewFormAction;
  const review = viewModel.review;

  return (
    <RoutePage>
      <PageHeader
        eyebrow="Close the loop"
        summary={
          daily
            ? "Record the day outcome, protect open loops and prepare tomorrow without duplicating tasks."
            : "Review movement from canonical work and set a focused plan for the next week."
        }
        title={title}
      />

      <nav aria-label="Review views" className="flex flex-wrap gap-2">
        <Link
          className="rounded-full border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
          href="/review/daily"
        >
          Daily Review
        </Link>
        <Link
          className="rounded-full border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
          href="/review/weekly"
        >
          Weekly Review
        </Link>
      </nav>

      {feedback ? (
        <div
          className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--text-secondary)]"
          role={feedback === "saved" ? "status" : "alert"}
        >
          {feedback === "saved"
            ? `${title} gespeichert.`
            : feedback === "blocked"
              ? "Wechsle ins authentifizierte Manual-Profil, um Reviews zu speichern."
              : "Review konnte nicht gespeichert werden. Prüfe die Eingaben."}
        </div>
      ) : null}

      {viewModel.blockedReason ? (
        <div
          className="rounded-[12px] border border-[rgba(217,146,79,.30)] bg-[rgba(217,146,79,.08)] px-4 py-3 text-sm text-[var(--text-secondary)]"
          role="alert"
        >
          {viewModel.blockedReason}
        </div>
      ) : null}

      <form action={action} data-review-form={viewModel.kind}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-4">
            <SectionPanel title="Review status">
              <div
                className="flex flex-wrap items-center justify-between gap-3"
                data-review-section="status"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {periodLabel}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {review
                      ? `Last saved ${review.updatedAt}`
                      : "Not saved yet"}
                  </p>
                </div>
                <Pill
                  accent={
                    review?.status === "completed"
                      ? "var(--accent-green)"
                      : "var(--accent-cyan)"
                  }
                >
                  {review?.status ?? "not started"}
                </Pill>
              </div>
            </SectionPanel>

            <SectionPanel title={daily ? "Day outcome" : "Week outcome"}>
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Outcome
                <textarea
                  className={fieldClass}
                  defaultValue={review?.outcome ?? ""}
                  disabled={!viewModel.canWrite}
                  name="outcome"
                  placeholder={
                    daily ? "What changed today?" : "What changed this week?"
                  }
                  rows={3}
                />
              </label>
            </SectionPanel>

            <SectionPanel title="Wins, blockers and open loops">
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Wins · one per line
                  <textarea
                    className={fieldClass}
                    defaultValue={lines(review?.wins ?? [])}
                    disabled={!viewModel.canWrite}
                    name="wins"
                    rows={7}
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Blockers · one per line
                  <textarea
                    className={fieldClass}
                    defaultValue={lines(review?.blockers ?? [])}
                    disabled={!viewModel.canWrite}
                    name="blockers"
                    rows={7}
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Open loops · one per line
                  <textarea
                    className={fieldClass}
                    defaultValue={lines(review?.openLoops ?? [])}
                    disabled={!viewModel.canWrite}
                    name="openLoops"
                    rows={7}
                  />
                </label>
              </div>
            </SectionPanel>

            {daily ? (
              <SectionPanel title="Carry-over decisions">
                <div className="space-y-2" data-review-section="carry-over">
                  {viewModel.carryTasks.length > 0 ? (
                    viewModel.carryTasks.map((task) => (
                      <label
                        className="flex min-h-11 items-center gap-3 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2"
                        key={task.id}
                      >
                        <input
                          defaultChecked={task.selected}
                          disabled={!viewModel.canWrite}
                          name="carryTaskIds"
                          type="checkbox"
                          value={task.id}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[var(--text-primary)]">
                            {task.title}
                          </span>
                          <span className="block text-xs text-[var(--text-muted)]">
                            {task.meta} · move to tomorrow
                          </span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">
                      No open tasks from today require a carry-over decision.
                    </p>
                  )}
                </div>
              </SectionPanel>
            ) : (
              <SectionPanel title="Canonical movement">
                <dl
                  className="grid gap-3 sm:grid-cols-3"
                  data-review-section="movement"
                >
                  {[
                    ["Completed tasks", viewModel.movement.completedTasks],
                    ["Open tasks", viewModel.movement.openTasks],
                    ["Active projects", viewModel.movement.activeProjects],
                  ].map(([label, value]) => (
                    <div
                      className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3"
                      key={label}
                    >
                      <dt className="text-xs text-[var(--text-muted)]">
                        {label}
                      </dt>
                      <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </SectionPanel>
            )}
          </div>

          <div className="space-y-4">
            <SectionPanel
              title={daily ? "Tomorrow preparation" : "Next-week planning"}
            >
              <div className="space-y-4" data-review-section="next-period">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  {daily ? "Tomorrow focus" : "Next-week focus"}
                  <textarea
                    className={fieldClass}
                    defaultValue={review?.nextPeriodFocus ?? ""}
                    disabled={!viewModel.canWrite}
                    name="nextPeriodFocus"
                    rows={4}
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Planning note
                  <textarea
                    className={fieldClass}
                    defaultValue={review?.planningNote ?? ""}
                    disabled={!viewModel.canWrite}
                    name="planningNote"
                    rows={5}
                  />
                </label>
              </div>
            </SectionPanel>

            <SectionPanel title="Save review">
              <div className="grid gap-2">
                <button
                  className="min-h-11 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-50"
                  disabled={!viewModel.canWrite}
                  name="status"
                  type="submit"
                  value="draft"
                >
                  Save draft
                </button>
                <button
                  className="min-h-11 rounded-[10px] border border-[rgba(66,184,131,.34)] bg-[rgba(66,184,131,.12)] px-4 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-50"
                  disabled={!viewModel.canWrite}
                  name="status"
                  type="submit"
                  value="completed"
                >
                  Complete {title}
                </button>
              </div>
            </SectionPanel>
          </div>
        </div>
      </form>
    </RoutePage>
  );
}
