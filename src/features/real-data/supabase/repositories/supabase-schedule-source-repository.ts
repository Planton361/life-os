import type { ScheduleSourceInput } from "../../schemas/schedule-source.schema";
import type { SupabaseClientLike, SupabaseQueryResult } from "../database.types";
import type { TaskRow } from "../row-types";
import type { MealRow } from "../row-types";

export type ScheduleSourceLinkRow = {
  source_id: string;
  source_type: "meal" | "review" | "running_plan_item" | "strength_plan";
  task_id: string;
  user_id: string;
};

export function createSupabaseScheduleSourceRepository(client: SupabaseClientLike) {
  return {
    async schedule(input: ScheduleSourceInput) {
      return (await client.rpc("schedule_linked_source", {
        p_duration_minutes: input.durationMinutes,
        p_planned_date: input.plannedDate,
        p_scheduled_start_at: input.scheduledStartAt,
        p_source_id: input.sourceId,
        p_source_type: input.sourceType,
      })) as SupabaseQueryResult<TaskRow>;
    },
    async getLinks(userId: string) {
      return (await client.from("schedule_source_links").select("user_id,source_type,source_id,task_id").eq("user_id", userId)) as SupabaseQueryResult<readonly ScheduleSourceLinkRow[]>;
    },
    async completeLinkedTask(taskId: string, completedAt: string) {
      return (await client.rpc("complete_linked_task", { p_completed_at: completedAt, p_task_id: taskId })) as SupabaseQueryResult<TaskRow>;
    },
    async completeLinkedMeal(mealId: string, completedAt: string) {
      return (await client.rpc("complete_linked_meal", { p_completed_at: completedAt, p_meal_id: mealId })) as SupabaseQueryResult<MealRow>;
    },
  };
}
