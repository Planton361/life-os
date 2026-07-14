import type { AntiRotAction, AntiRotEvent } from "../../domain/anti-rot";
import type { TableRow } from "../database.types";
export function mapAntiRotAction(
  row: TableRow<"anti_rot_actions">,
): AntiRotAction {
  return {
    archivedAt: row.archived_at,
    category: row.category as AntiRotAction["category"],
    createdAt: row.created_at,
    description: row.description,
    energy: row.energy as AntiRotAction["energy"],
    estimatedMinutes: row.estimated_minutes,
    id: row.id,
    status: row.status as AntiRotAction["status"],
    title: row.title,
    updatedAt: row.updated_at,
  };
}
export function mapAntiRotEvent(
  row: TableRow<"anti_rot_events">,
): AntiRotEvent {
  return {
    actionId: row.action_id,
    createdAt: row.created_at,
    eventType: row.event_type as AntiRotEvent["eventType"],
    id: row.id,
    recommendationEventId: row.recommendation_event_id,
  };
}
