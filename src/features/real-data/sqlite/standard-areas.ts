import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

/** Context Areas every fresh database starts with; lazy creation uses the same values. */
export const standardAreas = {
  coding: { name: "Coding", sortOrder: 80 },
  education: { name: "Education", sortOrder: 90 },
  work: { name: "Work", sortOrder: 100 },
  life: { name: "Life", sortOrder: 110 },
} as const;

/** Inserts each missing active standard Area; existing (including renamed) rows are kept. */
export function seedStandardAreas(
  db: Database.Database,
  owner: string,
  at: string,
) {
  const insert = db.prepare(
    "INSERT INTO areas(id,user_id,key,name,sort_order,created_at,updated_at) SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM areas WHERE user_id=? AND key=? AND archived_at IS NULL)",
  );
  for (const [key, area] of Object.entries(standardAreas))
    insert.run(randomUUID(), owner, key, area.name, area.sortOrder, at, at, owner, key);
}
