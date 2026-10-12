// Approved #151 differential gate. Fingerprints cover every field of the
// actual warning groups accepted by CONTROL, not a function-name allowlist.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const baseRevision = "0e3b4115a597841c3e8167df923cbea4063a63cf";
const knownFingerprint =
  "17c49b07237114828d0cb352782c8e23b82b33c178ada0b2c7335cd23f7cfbce";
const migration =
  "supabase/migrations/20261012113000_task_parent_completion_guard.sql";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
const digest = (value) =>
  createHash("sha256").update(canonical(value)).digest("hex");
export function fingerprints(groups) {
  const sorted = [...groups].sort((a, b) =>
    canonical(a) < canonical(b) ? -1 : canonical(a) > canonical(b) ? 1 : 0,
  );
  return {
    multiset: digest(sorted),
    groups: sorted.map((row) => ({
      function: row.function,
      issueCount: row.issues.length,
      sha256: digest(row),
    })),
  };
}

export function parseCheck(check, kind, exitCode = 0) {
  assert.ok(check, `Missing ${kind} evidence`);
  assert.equal(check.exitCode, exitCode, `${kind} tool failed`);
  assert.equal(check.signal, null, `${kind} tool interrupted`);
  assert.equal(typeof check.stdout, "string", `Missing ${kind} stdout`);
  assert.equal(typeof check.stderr, "string", `Missing ${kind} stderr`);
  const cleanText =
    kind === "advisors" ? /No issues found/ : /No schema errors found/;
  const parsed = check.stdout.trim()
    ? JSON.parse(check.stdout)
    : cleanText.test(check.stderr)
      ? { results: [] }
      : null;
  assert.ok(parsed, `Incomplete ${kind} output`);
  assert.notEqual(parsed._tag, "Error", `${kind} reported Error`);
  const results = Array.isArray(parsed) ? parsed : parsed.results;
  assert.ok(Array.isArray(results), `Unknown ${kind} result format`);
  return results;
}

export function compareEvidence(evidence) {
  assert.ok(!evidence.failure, "Fixture failure");
  assert.equal(evidence.base, baseRevision, "Inconsistent base revision");
  assert.match(evidence.head, /^[a-f0-9]{40}$/, "Missing head revision");
  assert.equal(evidence.cliVersion, "2.107.0", "Inconsistent CLI version");
  assert.equal(
    evidence.image,
    "postgres:18.4-bookworm@sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382",
    "Inconsistent server image",
  );
  assert.deepEqual(
    evidence.checker,
    {
      version: "2.10.13-1.pgdg12+1",
      url: "https://apt.postgresql.org/pub/repos/apt/pool/main/p/plpgsql-check/postgresql-18-plpgsql-check_2.10.13-1.pgdg12+1_amd64.deb",
      sha256:
        "228d14fde4883f7dfc9bd4971e6cbef6a081de7c2ab6248ac25053dad20fe27d",
    },
    "Inconsistent checker package",
  );
  assert.equal(evidence.dockerEndpoint, "unix:///var/run/docker.sock");
  assert.match(evidence.isolation?.container, /^[a-f0-9]{64}$/);
  assert.match(evidence.isolation?.name, /^life-os-151-lint-[a-f0-9-]+$/);
  assert.equal(evidence.isolation?.labels?.["life-os.issue"], "151");
  assert.match(evidence.isolation?.labels?.["life-os.disposable"], /^\d+$/);
  assert.equal(evidence.isolation?.host?.HostIp, "127.0.0.1");
  assert.match(evidence.isolation.host.HostPort, /^\d+$/);
  assert.equal(evidence.isolation.mounts.length, 1);
  assert.equal(evidence.isolation.mounts[0].Type, "volume");
  assert.equal(evidence.isolation.mounts[0].Destination, "/var/lib/postgresql");
  assert.ok(evidence.isolation.mounts[0].Name);
  assert.ok(evidence.packageInstall?.includes("2.10.13-1.pgdg12+1"));
  const databases = evidence.databases;
  const findings = {};
  for (const variant of ["base", "head"]) {
    const db = databases?.[variant];
    assert.ok(db, `Missing ${variant} database evidence`);
    assert.equal(db.identity.database, `life_os_151_${variant}`);
    assert.equal(db.identity.serverVersionNum, "180004");
    assert.equal(db.identity.extensionVersion, "2.10");
    assert.equal(db.identity.extensionSchema, "extensions");
    assert.equal(db.migrations.length, variant === "base" ? 64 : 65);
    assert.equal(
      new Set(db.migrations.map((m) => m.path)).size,
      db.migrations.length,
    );
    for (const m of db.migrations) {
      assert.match(m.path, /^supabase\/migrations\/[0-9]+_[a-z0-9_]+\.sql$/);
      assert.match(m.sha256, /^[a-f0-9]{64}$/);
    }
    findings[variant] = parseCheck(db.checks.lint, "lint");
    assert.deepEqual(
      findings[variant],
      db.checks.lint.results,
      "Stored lint output mismatch",
    );
    for (const row of findings[variant]) {
      assert.equal(
        typeof row.function,
        "string",
        "Unknown lint function format",
      );
      assert.ok(
        Array.isArray(row.issues) && row.issues.length,
        "Unknown lint issues format",
      );
      for (const issue of row.issues) {
        assert.ok(
          ["warning", "error"].includes(issue.level),
          "Unknown lint severity",
        );
        assert.equal(
          typeof issue.message,
          "string",
          "Unknown lint message format",
        );
      }
    }
    const advisors = parseCheck(db.checks.advisors, "advisors");
    assert.deepEqual(
      advisors,
      db.checks.advisors.results,
      "Stored advisor output mismatch",
    );
    assert.equal(advisors.length, 0, `${variant} security advisor findings`);
  }
  const headMigrations = new Map(
    databases.head.migrations.map((m) => [m.path, m.sha256]),
  );
  for (const m of databases.base.migrations) {
    assert.notEqual(m.path, migration, "#151 migration present in base");
    assert.equal(
      headMigrations.get(m.path),
      m.sha256,
      "Base migration changed or missing",
    );
  }
  assert.ok(headMigrations.has(migration), "#151 migration missing from head");
  assert.equal(
    evidence.headSqlRegression,
    "PASS",
    "SQL regression evidence missing",
  );
  const strict = databases.head.checks.strictLint;
  const strictFindings = parseCheck(strict, "lint", 1);
  assert.match(strict.stderr, /fail-on is set to warning, non-zero exit/);
  assert.equal(
    fingerprints(strictFindings).multiset,
    fingerprints(findings.head).multiset,
    "Strict lint output differs from full head lint",
  );

  const base = fingerprints(findings.base),
    head = fingerprints(findings.head);
  assert.equal(
    base.multiset,
    knownFingerprint,
    "Inconsistent accepted base warning fingerprint",
  );
  assert.ok(
    !findings.head.some((row) =>
      /guard_task_parent_completion|guard_source_task_parent_completion/.test(
        row.function,
      ),
    ),
    "Finding in #151 function",
  );
  assert.equal(
    head.multiset,
    base.multiset,
    "New, changed or missing lint findings",
  );
  const count = (groups) => groups.reduce((n, row) => n + row.issues.length, 0);
  assert.equal(count(findings.base), 18);
  assert.equal(count(findings.head), 18);
  assert.ok(
    findings.head.every((row) =>
      row.issues.every((i) => i.level === "warning"),
    ),
  );
  return {
    status: "PASS_BASELINE_UNCHANGED_WARNINGS",
    baseIssueCount: 18,
    headIssueCount: 18,
    newIssueCount: 0,
    issue151: [],
    baseFingerprints: base,
    headFingerprints: head,
  };
}

// Exercise the production comparator against complete actual evidence. These
// copies never replace or filter the real CLI output retained by the runner.
export function selfTest(evidence) {
  compareEvidence(evidence);
  const checks = [];
  const lintChange = (e, change, variant = "head") => {
    const check = e.databases[variant].checks.lint;
    change(check.results);
    check.stdout = JSON.stringify(check.results);
    if (variant === "head")
      e.databases.head.checks.strictLint.stdout = check.stdout;
  };
  const reject = (name, change, message) => {
    const altered = structuredClone(evidence);
    change(altered);
    assert.throws(() => compareEvidence(altered), message, name);
    checks.push({ name, status: "PASS_REJECTED" });
  };
  reject(
    "additional warning",
    (e) =>
      lintChange(e, (r) =>
        r[0].issues.push({
          level: "warning",
          message: "injected new warning",
          statement: { lineNumber: "999" },
        }),
      ),
    /New, changed or missing/,
  );
  reject(
    "changed warning detail",
    (e) =>
      lintChange(e, (r) => {
        r[0].issues[0].detail += " changed";
      }),
    /New, changed or missing/,
  );
  reject(
    "new error",
    (e) =>
      lintChange(e, (r) => {
        r[0].issues[0].level = "error";
      }),
    /New, changed or missing/,
  );
  reject(
    "#151 function finding",
    (e) =>
      lintChange(e, (r) => {
        r.push({
          function: "public.guard_task_parent_completion",
          issues: [{ level: "warning", message: "new guard finding" }],
        });
      }),
    /Finding in #151/,
  );
  reject(
    "changed base and head cannot establish a new baseline",
    (e) => {
      for (const variant of ["base", "head"])
        lintChange(
          e,
          (r) => {
            r[0].issues[0].message += " changed";
          },
          variant,
        );
    },
    /Inconsistent accepted base/,
  );
  reject(
    "removed finding",
    (e) => lintChange(e, (r) => r[0].issues.pop()),
    /New, changed or missing/,
  );
  reject(
    "failed linter",
    (e) => {
      e.databases.head.checks.lint.exitCode = 1;
    },
    /lint tool failed/,
  );
  reject(
    "missing lint output",
    (e) => {
      e.databases.head.checks.lint.stdout = "";
    },
    /Incomplete lint output/,
  );
  reject(
    "unknown lint format",
    (e) => {
      e.databases.head.checks.lint.stdout = "{}";
    },
    /Unknown lint result/,
  );
  reject(
    "missing migration",
    (e) => {
      e.databases.head.migrations.pop();
    },
    /AssertionError/,
  );
  reject(
    "changed base migration",
    (e) => {
      e.databases.head.migrations[0].sha256 = "0".repeat(64);
    },
    /Base migration changed/,
  );
  reject(
    "missing extension",
    (e) => {
      e.databases.head.identity.extensionVersion = null;
    },
    /AssertionError/,
  );
  reject(
    "advisor finding",
    (e) => {
      const a = e.databases.head.checks.advisors;
      a.results = [{ name: "injected security finding" }];
      a.stdout = JSON.stringify(a.results);
    },
    /security advisor findings/,
  );
  reject(
    "failed advisor",
    (e) => {
      e.databases.head.checks.advisors.exitCode = 1;
    },
    /advisors tool failed/,
  );
  reject(
    "different strict lint output",
    (e) => {
      e.databases.head.checks.strictLint.stdout = "[]";
    },
    /Strict lint output differs/,
  );
  reject(
    "incorrect strict lint exit",
    (e) => {
      e.databases.head.checks.strictLint.exitCode = 0;
    },
    /lint tool failed/,
  );
  reject(
    "missing SQL regression",
    (e) => {
      delete e.headSqlRegression;
    },
    /SQL regression evidence missing/,
  );
  reject(
    "changed base revision",
    (e) => {
      e.base = "0".repeat(40);
    },
    /Inconsistent base revision/,
  );
  reject(
    "missing checker package identity",
    (e) => {
      delete e.checker;
    },
    /Inconsistent checker package/,
  );
  reject(
    "non-loopback isolation",
    (e) => {
      e.isolation.host.HostIp = "0.0.0.0";
    },
    /AssertionError/,
  );
  const reordered = structuredClone(evidence);
  lintChange(reordered, (r) => r.reverse());
  assert.equal(
    compareEvidence(reordered).status,
    "PASS_BASELINE_UNCHANGED_WARNINGS",
  );
  checks.push({
    name: "complete identical multiset in different group order",
    status: "PASS",
  });
  return checks;
}
