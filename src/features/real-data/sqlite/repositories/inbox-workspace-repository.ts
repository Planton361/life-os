import "server-only";
import type Database from "better-sqlite3";
import type { OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";
import { completeInboxTriage, routeSavedInboxItem, saveInboxClarification } from "../commands/inbox-commands";

export function createSqliteInboxWorkspaceRepository(store: SqliteRuntime, context: OwnerContext) {
  const command = <T>(kind: string, body: (db: Database.Database, owner: string) => T) => {
    try { return { data: store.command(context, kind, body), error: null }; }
    catch (error) {
      const message = error instanceof Error ? error.message : "";
      return { data: null, error: { code: message === "INBOX_STALE" ? "PT409" : message === "INBOX_OPEN_ITEM_UNAVAILABLE" ? "P0002" : "23514" } };
    }
  };
  return {
    complete: (input: unknown) => command("inbox.complete", (db, owner) => completeInboxTriage(db, owner, input)),
    save: (input: unknown) => command("inbox.save", (db, owner) => saveInboxClarification(db, owner, input)),
    route: (input: unknown) => command("inbox.route", (db, owner) => routeSavedInboxItem(db, owner, input)),
  };
}
