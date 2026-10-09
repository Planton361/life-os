import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { boundary, readJson } from "./preview-cd-host.mjs";
import { deny, initialState } from "./preview-cd-core.mjs";

function operatorLog(root) {
  const file = join(root, "commands.jsonl");
  if (!existsSync(file)) return [];
  boundary(file);
  const text = readFileSync(file, "utf8");
  // A partial append is not a confirmed command boundary.
  if (text && !text.endsWith("\n")) deny("UPGRADE_COMMAND_LOG_INVALID");
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const value = JSON.parse(line);
      if (
        Object.keys(value).length !== 1 ||
        !["disable", "enable", "retry", "rollback"].includes(value.command)
      )
        deny("UPGRADE_COMMAND_LOG_INVALID");
      return value;
    });
}
const digest = (entries) =>
  createHash("sha256").update(JSON.stringify(entries)).digest("hex");
function confirmedCursor(state, entries) {
  if (
    !Number.isSafeInteger(state.commandOffset) ||
    state.commandOffset < 0 ||
    state.commandOffset > entries.length ||
    typeof state.autoEnabled !== "boolean"
  )
    deny("UPGRADE_OPERATOR_STATE_INVALID");
  return {
    offset: state.commandOffset,
    prefixDigest: digest(entries.slice(0, state.commandOffset)),
  };
}

// Called only with the stopped worker's kernel lease held. Persist this before
// checking pending intents, so even an aborted upgrade restores the latest state.
export function stoppedOperatorCheckpoint(root, previous) {
  const originalState = readJson(join(root, "state.json"));
  return {
    ...previous,
    originalState,
    operator: confirmedCursor(originalState, operatorLog(root)),
    stopped: true,
  };
}
export function assertConfirmedOperatorPrefix(root, checkpoint) {
  if (!checkpoint?.stopped || !checkpoint.operator)
    deny("UPGRADE_STOPPED_CHECKPOINT_REQUIRED");
  const entries = operatorLog(root),
    cursor = confirmedCursor(checkpoint.originalState, entries);
  if (
    cursor.offset !== checkpoint.operator.offset ||
    cursor.prefixDigest !== checkpoint.operator.prefixDigest
  )
    deny("UPGRADE_COMMAND_PREFIX_CHANGED");
  return entries;
}
export function assertOperatorHandoff(root, checkpoint) {
  const entries = assertConfirmedOperatorPrefix(root, checkpoint);
  if (
    entries.length !== checkpoint.operator.offset ||
    checkpoint.originalState.rollbackRequested ||
    checkpoint.originalState.transition
  )
    deny("UPGRADE_PENDING_OPERATOR_COMMANDS");
}
export function upgradedOperatorState(root, pair, checkpoint) {
  assertOperatorHandoff(root, checkpoint);
  const state = initialState(pair.candidate);
  state.previousGood = pair.fallback;
  state.commandOffset = checkpoint.originalState.commandOffset;
  state.autoEnabled = checkpoint.originalState.autoEnabled;
  return state;
}
