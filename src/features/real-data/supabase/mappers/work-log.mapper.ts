import type { WorkLog } from "@/features/work/work-log";

type WorkLogRow = {
  id: string;
  project_id: string;
  log_date: string;
  started_at: string | null;
  duration_minutes: number;
  focus: string;
  outcome: string;
  notes: string | null;
  archived_at: string | null;
};

export function mapWorkLogRow(row: WorkLogRow): WorkLog {
  return {
    archivedAt: row.archived_at,
    durationMinutes: row.duration_minutes,
    focus: row.focus,
    id: row.id,
    logDate: row.log_date,
    notes: row.notes,
    outcome: row.outcome,
    projectId: row.project_id,
    startedAt: row.started_at,
  };
}
