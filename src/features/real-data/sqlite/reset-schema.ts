import "server-only";
import Database from "better-sqlite3";
import { initializeCanonicalSchema } from "./canonical-schema";
import { registerCodecs } from "./runtime";

// Versioned D1 exception: only DELETE guards, never owner, INSERT or UPDATE.
// The function is non-deterministic and defaults to denied on every connection.
export function previewDeleteGuards(sql: string): string {
  return sql.replace(
    /(CREATE TRIGGER (\w+) BEFORE DELETE ON (\w+))\s*(?:WHEN ([\s\S]*?))?\s*BEGIN/g,
    (
      whole,
      prefix: string,
      name: string,
      table: string,
      when: string | undefined,
    ) => {
      if (name.endsWith("_owner_delete") || table === "profiles") return whole;
      return `${prefix} WHEN life_preview_reset_admitted()=0 AND (${when?.trim() || "1"}) BEGIN`;
    },
  );
}
export const resetMetadataSchema = `
ALTER TABLE runtime_metadata ADD COLUMN dataset_epoch TEXT NOT NULL DEFAULT 'initial';
ALTER TABLE runtime_metadata ADD COLUMN data_revision INTEGER NOT NULL DEFAULT 0 CHECK(data_revision>=0);
ALTER TABLE runtime_metadata ADD COLUMN reset_receipt TEXT;
`;
export function schemaFingerprint(db: Database.Database): string {
  return JSON.stringify(
    db
      .prepare(
        "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
      )
      .all(),
  );
}

let expectedFingerprint: string | undefined;
export function assertCanonicalSchemaDefinition(db: Database.Database) {
  if (!expectedFingerprint) {
    const expected = new Database(":memory:");
    try {
      registerCodecs(expected);
      initializeCanonicalSchema(expected);
      expectedFingerprint = schemaFingerprint(expected);
    } finally {
      expected.close();
    }
  }
  if (schemaFingerprint(db) !== expectedFingerprint)
    throw new Error("SQLITE_SCHEMA_DEFINITION_MISMATCH");
}
