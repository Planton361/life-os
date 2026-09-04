import type { CalendarTimedBlockViewModel } from "./calendar-types";

export type VisibleSchedulingCandidate = {
  durationMinutes: number;
  plannedDate: string;
  scheduledTime: string;
  taskId: string;
};

export type VisibleSchedulingConflict = {
  timeLabel: string;
  title: string;
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

/**
 * Checks the same loaded Calendar projection that the user can see. This is a
 * visible conflict gate, not a database-wide scheduling guarantee.
 */
export function findVisibleSchedulingConflict(
  candidate: VisibleSchedulingCandidate,
  scheduledBlocks: readonly CalendarTimedBlockViewModel[],
): VisibleSchedulingConflict | null {
  const candidateStart = timeToMinutes(candidate.scheduledTime);
  const candidateEnd = candidateStart + candidate.durationMinutes;
  const conflict = scheduledBlocks
    .filter((block) => block.taskId !== candidate.taskId)
    .filter((block) => block.date === candidate.plannedDate)
    .find(
      (block) =>
        candidateStart < block.endMinutes && block.startMinutes < candidateEnd,
    );

  if (!conflict) return null;

  return {
    timeLabel: conflict.timeLabel ?? `${conflict.startTime}-${conflict.endTime}`,
    title: conflict.title,
  };
}
