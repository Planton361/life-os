export const muscleGroups = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms",
  "Core", "Glutes", "Quadriceps", "Hamstrings", "Calves",
] as const;

export type MuscleGroup = (typeof muscleGroups)[number];

export type RunningPlan = { id: string; name: string; goal: string; archivedAt: string | null; createdAt: string; updatedAt: string };
export type RunningPlanItem = { id: string; planId: string; title: string; plannedDistanceKm: number | null; plannedDurationMinutes: number | null; sortOrder: number; archivedAt: string | null };
export type RunningSession = { id: string; planItemId: string | null; sessionDate: string; startedAt: string | null; distanceKm: number; durationMinutes: number; averageHeartRate: number | null; notes: string | null; status: "in_progress" | "completed"; completedAt: string | null; archivedAt: string | null };
export type Exercise = { id: string; name: string; description: string | null; equipment: string | null; archivedAt: string | null; muscles: readonly MuscleGroup[] };
export type StrengthPlan = { id: string; name: string; goal: string; archivedAt: string | null; createdAt: string; updatedAt: string };
export type StrengthPlanItem = { id: string; planId: string; exerciseId: string; sortOrder: number; targetSets: number; targetReps: number; targetWeightKg: number | null };
export type StrengthSession = { id: string; planId: string | null; sessionDate: string; startedAt: string; status: "in_progress" | "completed"; notes: string | null; completedAt: string | null; archivedAt: string | null };
export type StrengthSetLog = { id: string; sessionId: string; exerciseId: string; setOrder: number; repetitions: number; weightKg: number | null; notes: string | null; recordedAt: string };

export type TrainingSnapshot = {
  runningPlans: readonly RunningPlan[];
  runningPlanItems: readonly RunningPlanItem[];
  runningSessions: readonly RunningSession[];
  exercises: readonly Exercise[];
  strengthPlans: readonly StrengthPlan[];
  strengthPlanItems: readonly StrengthPlanItem[];
  strengthSessions: readonly StrengthSession[];
  strengthSetLogs: readonly StrengthSetLog[];
};

export function paceSecondsPerKilometer(distanceKm: number | null, durationMinutes: number | null) {
  if (!distanceKm || distanceKm <= 0 || !durationMinutes || durationMinutes <= 0) return null;
  return Math.round((durationMinutes * 60) / distanceKm);
}

export function formatPace(distanceKm: number | null, durationMinutes: number | null) {
  const pace = paceSecondsPerKilometer(distanceKm, durationMinutes);
  if (pace === null) return null;
  return `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")} / km`;
}

export function runningTotals(sessions: readonly RunningSession[]) {
  const completed = sessions.filter((session) => session.status === "completed" && !session.archivedAt);
  return {
    distanceKm: completed.reduce((sum, session) => sum + session.distanceKm, 0),
    durationMinutes: completed.reduce((sum, session) => sum + session.durationMinutes, 0),
    sessionCount: completed.length,
  };
}

export function strengthVolume(logs: readonly StrengthSetLog[]) {
  const weighted = logs.filter((log) => log.weightKg !== null);
  return {
    weightedSetCount: weighted.length,
    weightedVolumeKg: weighted.reduce((sum, log) => sum + log.repetitions * (log.weightKg ?? 0), 0),
    unweightedRepetitions: logs.filter((log) => log.weightKg === null).reduce((sum, log) => sum + log.repetitions, 0),
  };
}

export function muscleLoad(logs: readonly StrengthSetLog[], exercises: readonly Exercise[]) {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const result = new Map<MuscleGroup, { sets: number; weightedVolumeKg: number; unweightedRepetitions: number }>();
  for (const log of logs) {
    for (const muscle of exerciseById.get(log.exerciseId)?.muscles ?? []) {
      const current = result.get(muscle) ?? { sets: 0, weightedVolumeKg: 0, unweightedRepetitions: 0 };
      current.sets += 1;
      if (log.weightKg === null) current.unweightedRepetitions += log.repetitions;
      else current.weightedVolumeKg += log.repetitions * log.weightKg;
      result.set(muscle, current);
    }
  }
  return [...result.entries()].sort((a, b) => b[1].sets - a[1].sets || a[0].localeCompare(b[0]));
}

export function orderedPlanItems<T extends { id: string; sortOrder: number }>(items: readonly T[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

export function workoutScheduleIdentity(sourceType: "running_plan_item" | "strength_plan", sourceId: string) {
  return `${sourceType}:${sourceId}`;
}
