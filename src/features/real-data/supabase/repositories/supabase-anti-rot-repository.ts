import {
  currentAntiRotRecommendation,
  sortAntiRotHistory,
  type AntiRotWorkspace,
} from "../../domain/anti-rot";
import type {
  AntiRotActionInput,
  UpdateAntiRotActionInput,
} from "../../schemas/anti-rot.schemas";
import type { SupabaseClientLike } from "../database.types";
import { mapAntiRotAction, mapAntiRotEvent } from "../mappers/anti-rot.mapper";
function fail(message: string) {
  return { error: message, ok: false as const };
}
export function createSupabaseAntiRotRepository(client: SupabaseClientLike) {
  async function hasOpenRecommendation(userId: string, actionId: string) {
    const events = await client
      .from("anti_rot_events")
      .select("*")
      .eq("user_id", userId)
      .eq("action_id", actionId);
    return Boolean(
      currentAntiRotRecommendation((events.data ?? []).map(mapAntiRotEvent)),
    );
  }
  return {
    async getWorkspace(userId: string): Promise<AntiRotWorkspace> {
      const [actionsResult, eventsResult] = await Promise.all([
        client
          .from("anti_rot_actions")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .order("id"),
        client
          .from("anti_rot_events")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false }),
      ]);
      const actions = (actionsResult.data ?? []).map(mapAntiRotAction);
      const events = sortAntiRotHistory(
        (eventsResult.data ?? []).map(mapAntiRotEvent),
      );
      const recommendation = currentAntiRotRecommendation(events);
      const currentAction = recommendation
        ? actions.find((action) => action.id === recommendation.actionId)
        : undefined;
      return {
        actions,
        current:
          recommendation && currentAction
            ? {
                action: currentAction,
                recommendation,
              }
            : null,
        events,
      };
    },
    async create(userId: string, input: AntiRotActionInput) {
      const result = await client
        .from("anti_rot_actions")
        .insert({
          category: input.category,
          description: input.description,
          energy: input.energy,
          estimated_minutes: input.estimatedMinutes,
          title: input.title,
          user_id: userId,
        })
        .select("*")
        .single();
      return result.error || !result.data
        ? fail("Action could not be created.")
        : { data: mapAntiRotAction(result.data), ok: true as const };
    },
    async update(userId: string, input: UpdateAntiRotActionInput) {
      const result = await client
        .from("anti_rot_actions")
        .update({
          category: input.category,
          description: input.description,
          energy: input.energy,
          estimated_minutes: input.estimatedMinutes,
          title: input.title,
        })
        .eq("user_id", userId)
        .eq("id", input.actionId)
        .is("archived_at", null)
        .select("*")
        .maybeSingle();
      return result.error || !result.data
        ? fail("Action could not be updated.")
        : { data: mapAntiRotAction(result.data), ok: true as const };
    },
    async setStatus(
      userId: string,
      actionId: string,
      status: "active" | "paused",
    ) {
      if (await hasOpenRecommendation(userId, actionId)) return false;
      const result = await client
        .from("anti_rot_actions")
        .update({ status })
        .eq("user_id", userId)
        .eq("id", actionId)
        .is("archived_at", null);
      return !result.error;
    },
    async archive(userId: string, actionId: string) {
      if (await hasOpenRecommendation(userId, actionId)) return false;
      const result = await client
        .from("anti_rot_actions")
        .update({ archived_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("id", actionId)
        .is("archived_at", null);
      return !result.error;
    },
    async restore(userId: string, actionId: string) {
      const result = await client
        .from("anti_rot_actions")
        .update({ archived_at: null })
        .eq("user_id", userId)
        .eq("id", actionId)
        .not("archived_at", "is", null);
      return !result.error;
    },
    async rotate() {
      const result = await client.rpc("rotate_anti_rot_action");
      return result.error || !result.data
        ? fail("No active action is available.")
        : { data: { id: result.data }, ok: true as const };
    },
    async resolve(
      recommendationEventId: string,
      eventType: "completed" | "skipped",
    ) {
      const result = await client.rpc("resolve_anti_rot_recommendation", {
        p_event_type: eventType,
        p_recommendation_event_id: recommendationEventId,
      });
      return result.error || !result.data
        ? fail("Recommendation could not be resolved.")
        : { data: { id: result.data }, ok: true as const };
    },
  };
}
