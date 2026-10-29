import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// The actual proof process must exit 1 after the explicitly synthetic assertion.
// This parent checks that failure and its artifacts; it does not change the
// normal proofs' exit semantics or hide a failing regular CI step.
for (const issue of ["160", "170"]) {
  const child = spawnSync(
    process.execPath,
    [`tests/sqlite/issue-${issue}-browser-proof.mjs`],
    {
      env: { ...process.env, LIFE_OS_174_SYNTHETIC_FAILURE: issue },
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
    },
  );
  assert.equal(
    child.status,
    1,
    `synthetic #${issue} must remain a failed proof`,
  );
  assert.ok(
    child.stderr.includes(`ISSUE_${issue}_ASSERTION_OR_HARNESS_FAILURE`),
  );
  assert.doesNotMatch(
    child.stderr,
    /explicit synthetic failure fixture|Error:|PRIVATE_SECRET/,
  );
  const folder = join("test-results", `issue-${issue}`, "synthetic-injection");
  const data = JSON.parse(
    readFileSync(join(folder, "diagnostic.json"), "utf8"),
  );
  assert.equal(data.result, "failed");
  assert.equal(data.failureCategory, "assertion");
  assert.equal(data.phase, "url_matched");
  assert.equal(data.target, issue === "160" ? "/goals/new" : "/projects/[id]");
  assert.equal(data.screenshot, "captured");
  assert.equal(data.process.state, "observed_running");
  assert.ok(data.events.some((event) => event.event === "navigation_begin"));
  assert.ok(data.events.some((event) => event.event === "response"));
  assert.ok(statSync(join(folder, "failure.png")).size > 8);
  console.log(
    `PASS #${issue} synthetic assertion exits 1 and preserves redacted diagnostics`,
  );
}
