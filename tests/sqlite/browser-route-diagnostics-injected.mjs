import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// The actual proof process must exit 1 after the explicitly synthetic assertion.
// This parent checks that failure and its artifacts; it does not change the
// normal proofs' exit semantics or hide a failing regular CI step.
for (const [issue, matcher] of [
  ["160", false],
  ["170", false],
  ["160", true],
  ["170", true],
]) {
  const child = spawnSync(
    process.execPath,
    [`tests/sqlite/issue-${issue}-browser-proof.mjs`],
    {
      env: {
        ...process.env,
        LIFE_OS_174_SYNTHETIC_FAILURE: matcher ? `${issue}-matcher` : issue,
      },
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
  const folder = join(
    "test-results",
    `issue-${issue}`,
    "synthetic-injection",
    ...(matcher ? ["matcher"] : []),
  );
  const data = JSON.parse(
    readFileSync(join(folder, "diagnostic.json"), "utf8"),
  );
  assert.equal(data.result, "failed");
  assert.equal(data.failureCategory, matcher ? "matcher_timeout" : "assertion");
  assert.equal(data.phase, "url_matched");
  assert.equal(data.target, issue === "160" ? "/goals/new" : "/projects/[id]");
  assert.equal(data.screenshot, "captured");
  assert.equal(data.process.state, "observed_running");
  assert.equal(data.failure.originalPhase, "url_matched");
  if (matcher) {
    assert.equal(data.failure.name, "Error");
    assert.equal(data.failure.constructor, "ExpectError");
    assert.equal(data.failure.matcherResult, true);
    assert.equal(
      data.failure.matcher,
      issue === "160" ? "toBeVisible" : "toContainText",
    );
    assert.equal(data.failure.timeoutMs, 5000);
    assert.ok(data.failure.elapsedMs >= 5000);
  }
  assert.ok(data.rscAtFailure);
  assert.equal(data.observations.relation, "sequential_not_atomic");
  assert.ok(data.observations.dom.result);
  assert.ok(data.observations.accessibility.result);
  assert.ok(data.events.some((event) => event.event === "navigation_begin"));
  assert.ok(data.events.some((event) => event.event === "response"));
  assert.ok(statSync(join(folder, "failure.png")).size > 8);
  console.log(
    `PASS #${issue} synthetic ${matcher ? "matcher timeout" : "assertion"} exits 1 and preserves redacted diagnostics`,
  );
}
