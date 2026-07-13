export type WorkLog = {
  id: string;
  projectId: string;
  logDate: string;
  startedAt: string | null;
  durationMinutes: number;
  focus: string;
  outcome: string;
  notes: string | null;
  archivedAt: string | null;
};
