export const antiRotCategories = [
  "movement",
  "social",
  "creative",
  "outside",
  "learning",
  "reset",
  "custom",
] as const;
export const antiRotEnergies = ["low", "medium", "high"] as const;
export type AntiRotAction = {
  archivedAt: string | null;
  category: (typeof antiRotCategories)[number] | null;
  createdAt: string;
  description: string | null;
  energy: (typeof antiRotEnergies)[number] | null;
  estimatedMinutes: number | null;
  id: string;
  status: "active" | "paused";
  title: string;
  updatedAt: string;
};
export type AntiRotEvent = {
  actionId: string;
  createdAt: string;
  eventType: "recommended" | "completed" | "skipped";
  id: string;
  recommendationEventId: string | null;
};
export type AntiRotWorkspace = {
  actions: AntiRotAction[];
  current: { action: AntiRotAction; recommendation: AntiRotEvent } | null;
  events: AntiRotEvent[];
};

export function activeAntiRotActions<
  T extends Pick<AntiRotAction, "archivedAt" | "status">,
>(actions: readonly T[]) {
  return actions.filter(
    (action) => !action.archivedAt && action.status === "active",
  );
}
export function sortAntiRotHistory<
  T extends Pick<AntiRotEvent, "createdAt" | "id">,
>(events: readonly T[]) {
  return [...events].sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
}
export function currentAntiRotRecommendation(events: readonly AntiRotEvent[]) {
  const resolved = new Set(
    events.map((event) => event.recommendationEventId).filter(Boolean),
  );
  return (
    sortAntiRotHistory(events).find(
      (event) => event.eventType === "recommended" && !resolved.has(event.id),
    ) ?? null
  );
}
export function selectAntiRotAction(
  actions: readonly AntiRotAction[],
  events: readonly AntiRotEvent[],
) {
  const candidates = activeAntiRotActions(actions);
  if (!candidates.length) return null;
  const lastSkipped = sortAntiRotHistory(events).find(
    (event) => event.eventType === "skipped",
  )?.actionId;
  const usedAt = new Map<string, string>();
  for (const event of events)
    if (
      (event.eventType === "recommended" || event.eventType === "completed") &&
      (!usedAt.get(event.actionId) ||
        usedAt.get(event.actionId)! < event.createdAt)
    )
      usedAt.set(event.actionId, event.createdAt);
  return [...candidates].sort(
    (a, b) =>
      (candidates.length > 1
        ? Number(a.id === lastSkipped) - Number(b.id === lastSkipped)
        : 0) ||
      (usedAt.get(a.id) ?? "").localeCompare(usedAt.get(b.id) ?? "") ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  )[0];
}
