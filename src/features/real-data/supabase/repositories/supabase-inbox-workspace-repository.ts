import type { SupabaseClientLike } from "../database.types";
import type {
  InboxClarificationInput,
  InboxCompletionInput,
  InboxRouteInput,
} from "../../schemas/inbox-workspace.schemas";

export function createInboxWorkspaceRepository(
  client: SupabaseClientLike,
  userId: string,
) {
  async function ownsOpenItem(id: string) {
    const { data, error } = await client
      .from("inbox_items")
      .select("id")
      .eq("user_id", userId)
      .eq("id", id)
      .is("archived_at", null)
      .in("status", ["raw", "clarified"])
      .maybeSingle();
    return !error && Boolean(data);
  }
  return {
    async complete(input: InboxCompletionInput) {
      if (!(await ownsOpenItem(input.inboxItemId)))
        return { data: null, error: { code: "P0002" } };
      return client.rpc("complete_inbox_triage", {
        p_route: input.route,
        p_target_id: input.targetId,
        p_inbox_item_id: input.inboxItemId,
        p_expected_updated_at: input.expectedUpdatedAt,
        p_title: input.title,
        p_body: input.body,
        p_next_action: input.nextAction,
        p_missing_info: input.missingInfo,
        p_priority: input.priority,
        p_energy: input.energy,
        p_duration_minutes: input.durationMinutes,
        p_area_id: input.areaId,
        p_review_needed: input.reviewNeeded,
        p_today_candidate: input.todayCandidate,
        p_deadline_hint: input.deadlineHint,
      });
    },
    async save(input: InboxClarificationInput) {
      if (!(await ownsOpenItem(input.inboxItemId)))
        return { data: null, error: { code: "P0002" } };
      return client.rpc("save_inbox_clarification", {
        p_inbox_item_id: input.inboxItemId,
        p_expected_updated_at: input.expectedUpdatedAt,
        p_title: input.title,
        p_body: input.body,
        p_next_action: input.nextAction,
        p_missing_info: input.missingInfo,
        p_priority: input.priority,
        p_energy: input.energy,
        p_duration_minutes: input.durationMinutes,
        p_area_id: input.areaId,
        p_review_needed: input.reviewNeeded,
        p_today_candidate: input.todayCandidate,
        p_deadline_hint: input.deadlineHint,
      });
    },
    async route(input: InboxRouteInput) {
      if (!(await ownsOpenItem(input.inboxItemId)))
        return { data: null, error: { code: "P0002" } };
      return client.rpc("route_saved_inbox_item", {
        p_inbox_item_id: input.inboxItemId,
        p_expected_updated_at: input.expectedUpdatedAt,
        p_route: input.route,
        p_target_id: input.targetId,
      });
    },
  };
}
