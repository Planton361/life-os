import type { EducationLog } from "@/features/education/education-log";

export function mapEducationLogRow(row: {
  archived_at: string | null; created_at: string; duration_minutes: number; focus: string; id: string; log_date: string; log_type: "learning" | "writing"; notes: string | null; outcome: string; project_id: string; start_time: string | null; units_completed: number | null; word_count_delta: number | null;
}): EducationLog {
  return { archivedAt: row.archived_at, createdAt: row.created_at, durationMinutes: row.duration_minutes, focus: row.focus, id: row.id, logDate: row.log_date, logType: row.log_type, notes: row.notes, outcome: row.outcome, projectId: row.project_id, startTime: row.start_time, unitsCompleted: row.units_completed, wordCountDelta: row.word_count_delta };
}
