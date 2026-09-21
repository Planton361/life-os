import type { SupabaseClientLike } from "../database.types";
import { projectTodayActivity } from "@/features/today/activity-projection";
import { localDateInTimeZone } from "../../domain/habit";

/** Read-only, explicit owner scope plus existing RLS. No event copies or writes. */
export async function readTodayActivity(
  client: SupabaseClientLike,
  userId: string,
  now = new Date(),
) {
  const profile = await client
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  if (profile.error) throw new Error("Today profile unavailable");
  const timezone = profile.data?.timezone ?? "Europe/Berlin";
  const day = localDateInTimeZone(now, timezone);
  // Broad instant window includes any profile-local midnight (including DST).
  // Exact day membership is decided by the existing timezone helper, never UTC dates.
  const lower = new Date(now.getTime() - 48 * 3600000).toISOString();
  async function all<T>(query: {
    range: (
      from: number,
      to: number,
    ) => PromiseLike<{ data: T[] | null; error: unknown }>;
  }) {
    const rows: T[] = [];
    for (let start = 0; ; start += 1000) {
      const result = await query.range(start, start + 999);
      if (result.error) throw new Error("Today activity source unavailable");
      rows.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < 1000) return rows;
    }
  }
  const [
    tasks,
    inbox,
    moods,
    habits,
    meals,
    runs,
    strength,
    reviews,
    goalAchievementEvents,
    milestoneAchievementEvents,
  ] = await Promise.all([
    all(
      client
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .or(
          `created_at.gte.${lower},completed_at.gte.${lower},planned_date.eq.${day},scheduled_start_at.gte.${lower}`,
        )
        .order("id"),
    ),
    all(
      client
        .from("inbox_items")
        .select("*")
        .eq("user_id", userId)
        .or(`created_at.gte.${lower},processed_at.gte.${lower}`)
        .order("id"),
    ),
    all(
      client
        .from("mood_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("recorded_at", lower)
        .order("id"),
    ),
    all(
      client
        .from("habit_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("local_date", day)
        .order("id"),
    ),
    all(
      client
        .from("meals")
        .select("*")
        .eq("user_id", userId)
        .gte("completed_at", lower)
        .order("id"),
    ),
    all(
      client
        .from("running_sessions")
        .select("*")
        .eq("user_id", userId)
        .gte("completed_at", lower)
        .order("id"),
    ),
    all(
      client
        .from("strength_sessions")
        .select("*")
        .eq("user_id", userId)
        .gte("completed_at", lower)
        .order("id"),
    ),
    all(
      client
        .from("review_records")
        .select("*")
        .eq("user_id", userId)
        .or(
          `created_at.gte.${lower},completed_at.gte.${lower},period_start.eq.${day}`,
        )
        .order("id"),
    ),
    all(
      client
        .from("goal_achievement_events")
        .select(
          "id,goal_id,event_type,occurred_at,recorded_at,goal_title_snapshot",
        )
        .eq("user_id", userId)
        .or(`recorded_at.gte.${lower},occurred_at.gte.${lower}`)
        .order("recorded_at"),
    ),
    all(
      client
        .from("goal_milestone_achievement_events")
        .select(
          "id,goal_id,event_type,occurred_at,recorded_at,goal_title_snapshot",
        )
        .eq("user_id", userId)
        .or(`recorded_at.gte.${lower},occurred_at.gte.${lower}`)
        .order("recorded_at"),
    ),
  ]);
  const currentReviewIds = reviews
    .filter(
      (review) =>
        review.kind === "daily" &&
        review.period_start === day &&
        !review.archived_at,
    )
    .map((review) => review.id);
  const decisions = currentReviewIds.length
    ? await all(
        client
          .from("review_task_decisions")
          .select("*")
          .eq("user_id", userId)
          .in("review_id", currentReviewIds)
          .order("id"),
      )
    : [];
  const goalIds = [
    ...new Set(
      [...goalAchievementEvents, ...milestoneAchievementEvents].map(
        (event) => event.goal_id,
      ),
    ),
  ];
  const currentGoalRows = goalIds.length
    ? await all(
        client
          .from("goals")
          .select("id,title")
          .eq("user_id", userId)
          .in("id", goalIds)
          .order("id"),
      )
    : [];
  const currentGoalTitles = new Map(
    currentGoalRows.map((goal) => [goal.id, goal.title]),
  );
  const missingTaskIds = [
    ...new Set(decisions.map((decision) => decision.task_id)),
  ].filter((id) => !tasks.some((task) => task.id === id));
  if (missingTaskIds.length)
    tasks.push(
      ...(await all(
        client
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .in("id", missingTaskIds)
          .order("id"),
      )),
    );
  const habitIds = [...new Set(habits.map((log) => log.habit_id))];
  const names = habitIds.length
    ? await all(
        client
          .from("habits")
          .select("id,name,daily_target,unit")
          .eq("user_id", userId)
          .in("id", habitIds)
          .order("id"),
      )
    : [];
  const habitDefinitions = Object.fromEntries(
    names.map((habit) => [habit.id, habit]),
  );
  return projectTodayActivity(
    {
      tasks,
      inbox,
      moods,
      habits,
      habitDefinitions,
      meals,
      runs,
      strength,
      reviews,
      decisions,
      goalEvents: [
        ...goalAchievementEvents
          .filter(
            (event) =>
              event.event_type === "achieved" ||
              event.event_type === "reopened",
          )
          .map((event) => ({
            id: event.id,
            goalId: event.goal_id,
            goalTitle: event.goal_title_snapshot,
            currentGoalTitle: currentGoalTitles.get(event.goal_id) ?? null,
            eventType:
              event.event_type === "achieved"
                ? ("goal_achieved" as const)
                : ("goal_reopened" as const),
            occurredAt: event.occurred_at,
            recordedAt: event.recorded_at,
          })),
        ...milestoneAchievementEvents
          .filter(
            (event) =>
              event.event_type === "achieved" ||
              event.event_type === "reopened",
          )
          .map((event) => ({
            id: event.id,
            goalId: event.goal_id,
            goalTitle: event.goal_title_snapshot,
            currentGoalTitle: currentGoalTitles.get(event.goal_id) ?? null,
            eventType:
              event.event_type === "achieved"
                ? ("milestone_achieved" as const)
                : ("milestone_reopened" as const),
            occurredAt: event.occurred_at,
            recordedAt: event.recorded_at,
          })),
      ],
    },
    timezone,
    now,
  );
}
