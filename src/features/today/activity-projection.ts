import type { Database } from "@/types/supabase";
import {
  localDateInTimeZone,
  localTimeInTimeZone,
} from "../real-data/domain/habit";
type Row<K extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][K]["Row"];
export type ActivitySources = {
  habitNames?: Record<string, string>;
  tasks: Row<"tasks">[];
  inbox: Row<"inbox_items">[];
  moods: Row<"mood_entries">[];
  habits: Row<"habit_logs">[];
  meals: Row<"meals">[];
  runs: Row<"running_sessions">[];
  strength: Row<"strength_sessions">[];
  reviews: Row<"review_records">[];
  decisions: Row<"review_task_decisions">[];
};
export type DayEvent = {
  id: string;
  at: string;
  time: string;
  kind: string;
  title: string;
  context: string;
  href: string;
  accent: string;
};
export type TodayDayLog = ReturnType<typeof projectTodayActivity>;
export function projectTodayActivity(
  sources: ActivitySources,
  timezone: string,
  now = new Date(),
) {
  const day = localDateInTimeZone(now, timezone);
  const events: DayEvent[] = [];
  const isToday = (at: string | null) =>
    Boolean(at && localDateInTimeZone(new Date(at), timezone) === day);
  function add(
    id: string,
    at: string | null,
    kind: string,
    title: string,
    context: string,
    href: string,
    accent: string,
  ) {
    if (!at || !isToday(at)) return;
    events.push({
      id,
      at,
      time: localTimeInTimeZone(new Date(at), timezone),
      kind,
      title,
      context,
      href,
      accent,
    });
  }
  for (const task of sources.tasks) {
    const href = task.archived_at
      ? ""
      : `/portfolio?view=tasks&selected=${task.id}`;
    add(
      `${task.id}:created`,
      task.created_at,
      "TASK CREATED",
      task.title,
      "Task erstellt · Portfolio",
      href,
      "blue",
    );
    if (!task.archived_at && task.status !== "canceled")
      add(
        `${task.id}:scheduled`,
        task.scheduled_start_at,
        "TASK SCHEDULED",
        task.title,
        "Vorgesehener Beginn · aktueller Tagesplan",
        href,
        "purple",
      );
    add(
      `${task.id}:completed`,
      task.completed_at,
      "TASK COMPLETED",
      task.title,
      "Task abgeschlossen",
      href,
      "green",
    );
  }
  for (const item of sources.inbox) {
    add(
      `${item.id}:capture`,
      item.created_at,
      "INBOX CAPTURE",
      item.original_title ?? item.title,
      "In Inbox erfasst",
      item.processed_at ? "/inbox" : `/inbox?item=${item.id}`,
      "cyan",
    );
    add(
      `${item.id}:processed`,
      item.processed_at,
      "INBOX PROCESSED",
      item.title,
      "Einordnung / Abschluss gespeichert",
      item.created_task_id
        ? `/portfolio?view=tasks&selected=${item.created_task_id}`
        : "/inbox",
      "cyan",
    );
  }
  for (const mood of sources.moods)
    if (!mood.archived_at)
      add(
        mood.id,
        mood.recorded_at,
        "MOOD LOGGED",
        mood.mood,
        "Gespeicherter Mood-Eintrag",
        "/health/mental",
        "orange",
      );
  for (const habit of sources.habits)
    if (!habit.archived_at && habit.value > 0)
      add(
        habit.id,
        habit.recorded_at,
        "HABIT LOGGED",
        `${sources.habitNames?.[habit.habit_id] ?? "Habit"} · +${habit.value}`,
        "Bestehender aktiver Log-Eintrag",
        "/health/habits",
        "green",
      );
  for (const meal of sources.meals)
    add(
      meal.id,
      meal.completed_at,
      "MEAL COMPLETED",
      meal.title,
      "Mahlzeit abgeschlossen",
      "/nutrition/meal-planner",
      "green",
    );
  for (const run of sources.runs)
    if (!run.archived_at)
      add(
        run.id,
        run.completed_at,
        "RUN COMPLETED",
        `Lauf · ${run.distance_km} km`,
        `${run.duration_minutes} Minuten`,
        "/health/running",
        "green",
      );
  for (const session of sources.strength)
    if (!session.archived_at)
      add(
        session.id,
        session.completed_at,
        "STRENGTH COMPLETED",
        "Krafttraining abgeschlossen",
        "Gespeicherte Session",
        "/health/strength",
        "green",
      );
  for (const review of sources.reviews)
    if (!review.archived_at) {
      add(
        `${review.id}:created`,
        review.created_at,
        "REVIEW CREATED",
        `${review.kind} Review`,
        "Review erstmals gespeichert",
        `/review/${review.kind}`,
        "orange",
      );
      add(
        `${review.id}:completed`,
        review.completed_at,
        "REVIEW COMPLETED",
        `${review.kind} Review`,
        review.outcome ?? "Review abgeschlossen",
        `/review/${review.kind}`,
        "orange",
      );
    }
  events.sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id),
  );
  const review =
    sources.reviews.find(
      (r) => r.kind === "daily" && r.period_start === day && !r.archived_at,
    ) ?? null;
  const decisions = sources.decisions.filter((d) => d.review_id === review?.id);
  const planned = sources.tasks
    .filter(
      (task) =>
        !task.archived_at &&
        task.status !== "canceled" &&
        (task.planned_date === day ||
          isToday(task.scheduled_start_at) ||
          decisions.some(
            (decision) =>
              decision.task_id === task.id &&
              decision.planning_snapshot_captured &&
              (decision.original_planned_date === day ||
                isToday(decision.original_scheduled_start_at)),
          )),
    )
    .map((task) => ({
      ...task,
      carriedForward: decisions.some(
        (decision) =>
          decision.task_id === task.id && decision.decision === "carry_forward",
      ),
    }));

  return {
    day,
    timezone,
    events,
    review,
    decisions,
    planned,
    metrics: [
      {
        label: "Created today",
        value: sources.tasks.filter((t) => isToday(t.created_at)).length,
      },
      { label: "Planned today", value: planned.length },
      {
        label: "Scheduled today",
        value: planned.filter((t) => isToday(t.scheduled_start_at)).length,
      },
      {
        label: "Completed today",
        value: sources.tasks.filter((t) => isToday(t.completed_at)).length,
      },
      {
        label: "Still open",
        value: planned.filter((t) => t.status !== "done").length,
      },
      {
        label: "Carried forward",
        value: decisions.filter((d) => d.decision === "carry_forward").length,
      },
    ],
  };
}
export const emptyActivitySources = (): ActivitySources => ({
  tasks: [],
  inbox: [],
  moods: [],
  habits: [],
  meals: [],
  runs: [],
  strength: [],
  reviews: [],
  decisions: [],
});
