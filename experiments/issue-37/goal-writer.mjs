import { openDb, owner } from "./fixture.mjs";
import { executeGoalCommand } from "./goal-command.mjs";

const [path, goalId, commandId, fingerprint] = process.argv.slice(2);
if (!path || !goalId || !commandId || !fingerprint) throw new Error("Invalid Goal writer arguments");
const db = openDb(path);
try {
  const eventId = executeGoalCommand(db, owner, "goal.achieve", commandId, fingerprint, { goalId });
  process.stdout.write(`${eventId}\n`);
} finally { db.close(); }
