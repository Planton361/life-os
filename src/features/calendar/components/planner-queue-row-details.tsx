import type { PlannerQueueItem } from "../calendar-types";
import { weeklyOrientation } from "../weekly-task-context";

/** Queue-only display; eligibility, ordering and Inspector context stay separate. */
export function PlannerQueueRowDetails({
  task,
  sourceLabel,
}: {
  task: PlannerQueueItem;
  sourceLabel: string | null;
}) {
  const metadata = [
    task.dueDate ? `Deadline ${task.dueDate}` : undefined,
    task.isRecurringOccurrence ? "Recurring" : undefined,
    sourceLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  const orientation = task.contextUnavailable
    ? "Kontext derzeit nicht verfügbar"
    : (task.orientation ??
      weeklyOrientation({
        project: task.project ? { ...task.project, result: null } : undefined,
        goals: task.goal
          ? [
              {
                ...task.goal,
                description: null,
                why: null,
                support: [],
                path: "direct",
              },
            ]
          : [],
        skills: [...task.skills],
      }));
  return (
    <>
      {metadata ? (
        <p
          data-queue-planning-metadata
          className="truncate text-[10px] leading-4 text-[var(--text-muted)]"
        >
          {metadata}
        </p>
      ) : null}
      {orientation ? (
        <p
          data-queue-orientation
          className="truncate text-[10px] leading-4 text-[var(--text-muted)]"
        >
          {orientation}
        </p>
      ) : null}
    </>
  );
}
