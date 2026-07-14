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
