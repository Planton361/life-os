import type { Database } from "@/types/supabase";
import {
  localDateInTimeZone,
  localTimeInTimeZone,
} from "../real-data/domain/habit";
type Row<K extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][K]["Row"];
export type ActivitySources = {
  habitDefinitions?: Record<
    string,
    Pick<Row<"habits">, "name" | "daily_target" | "unit">
  >;
  tasks: Row<"tasks">[];
  inbox: Row<"inbox_items">[];
  moods: Row<"mood_entries">[];
  habits: Row<"habit_logs">[];
  meals: Row<"meals">[];
  runs: Row<"running_sessions">[];
  strength: Row<"strength_sessions">[];
  reviews: Row<"review_records">[];
  decisions: Row<"review_task_decisions">[];
  goalEvents?: GoalActivityEvent[];
};
export type GoalActivityEvent = {
  id: string;
  goalId: string;
  goalTitle: string | null;
  currentGoalTitle?: string | null;
  eventType:
    | "goal_achieved"
    | "goal_reopened"
    | "milestone_achieved"
    | "milestone_reopened";
  occurredAt: string | null;
  recordedAt: string;
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
  const latestMood = sources.moods
    .filter((mood) => !mood.archived_at && isToday(mood.recorded_at))
    .sort(
      (a, b) =>
        Date.parse(b.recorded_at) - Date.parse(a.recorded_at) ||
        b.id.localeCompare(a.id),
    )[0];
  if (latestMood)
    add(
      "mood:" + day,
      latestMood.recorded_at,
      "MOOD",
      latestMood.mood,
      "Aktueller Tageszustand",
      "/health/mental",
      "orange",
    );

  const habitDays = new Map<string, { value: number; at: string }>();
  // Canonical local_date is the Habit day attribution; recorded_at supplies its clock.
  for (const log of [...sources.habits].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (log.archived_at || log.value <= 0 || log.local_date !== day) continue;
    const aggregate = habitDays.get(log.habit_id);
    habitDays.set(log.habit_id, {
      value: (aggregate?.value ?? 0) + log.value,
      at:
        aggregate && Date.parse(aggregate.at) > Date.parse(log.recorded_at)
          ? aggregate.at
          : log.recorded_at,
    });
  }
  const number = (value: number) =>
    new Intl.NumberFormat("de-DE", { maximumFractionDigits: 6 }).format(value);
  for (const [id, aggregate] of habitDays) {
    const habit = sources.habitDefinitions?.[id];
    const target = habit?.daily_target;
    const unit = habit?.unit ? " " + habit.unit : "";
    const progress =
      target != null
        ? number(aggregate.value) + "/" + number(target) + unit
        : number(aggregate.value) + unit + " heute";
    add(
      "habit:" + id + ":" + day,
      aggregate.at,
      "HABIT",
      (habit?.name ?? "Habit") + " · " + progress,
      target != null && aggregate.value >= target
        ? "Tagesziel erreicht"
        : "Fortschritt heute",
      "/health/habits",
      "green",
    );
  }
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
        `${review.id}:completed`,
        review.completed_at,
        "REVIEW COMPLETED",
        `${review.kind} Review`,
        review.outcome ?? "Review abgeschlossen",
        `/review/${review.kind}`,
        "orange",
      );
    }
  for (const event of sources.goalEvents ?? []) {
    const goalLabel = event.eventType.startsWith("goal") ? "GOAL" : "ETAPPE";
    const eventLabel = event.eventType.endsWith("achieved")
      ? "ACHIEVED"
      : "REOPENED";
    add(
      event.id,
      event.occurredAt ?? event.recordedAt,
      `${goalLabel} ${eventLabel}`,
      event.goalTitle ?? "Ziel",
      event.goalTitle
        ? event.occurredAt
          ? "Goal-Verlauf · bewusste Entscheidung"
          : "Goal-Verlauf · Zeitpunkt unbekannt, aufgezeichnet jetzt"
        : event.currentGoalTitle
          ? `Goal-Verlauf · aktuelle Zielidentität: ${event.currentGoalTitle}`
          : "Goal-Verlauf · historische Identität unbekannt",
      `/goals/${event.goalId}`,
      eventLabel === "ACHIEVED" ? "green" : "orange",
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
  goalEvents: [],
});
