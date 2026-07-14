export type JournalEntry = {
  archivedAt: string | null;
  body: string;
  createdAt: string;
  entryDate: string;
  id: string;
  title: string | null;
  updatedAt: string;
};

export type LifeNoteRelation = {
  href: string;
  id: string;
  label: string;
  relationType: string;
  targetType: "goal" | "project" | "task";
};

export type LifeNote = {
  archivedAt: string | null;
  body: string;
  createdAt: string;
  id: string;
  relations: LifeNoteRelation[];
  title: string;
  updatedAt: string;
};

export type LifeWorkspace = {
  areaAvailable: boolean;
  journalEntries: JournalEntry[];
  notes: LifeNote[];
};

export const entertainmentMediaTypes = ["book", "movie", "series", "game"] as const;
export type EntertainmentMediaType = (typeof entertainmentMediaTypes)[number];

export const entertainmentStatuses = ["planned", "in_progress", "completed", "dropped"] as const;
export type EntertainmentStatus = (typeof entertainmentStatuses)[number];

export const entertainmentProgressUnits = ["pages", "episodes", "percent", "hours"] as const;
export type EntertainmentProgressUnit = (typeof entertainmentProgressUnits)[number];

export type EntertainmentItem = {
  archivedAt: string | null;
  completedOn: string | null;
  createdAt: string;
  creatorOrStudio: string | null;
  id: string;
  mediaType: EntertainmentMediaType;
  notes: string | null;
  progressCurrent: number | null;
  progressTotal: number | null;
  progressUnit: EntertainmentProgressUnit | null;
  rating: number | null;
  releaseYear: number | null;
  startedOn: string | null;
  status: EntertainmentStatus;
  title: string;
  updatedAt: string;
};

export type EntertainmentWorkspace = {
  areaAvailable: boolean;
  items: EntertainmentItem[];
};
