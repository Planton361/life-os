// Policy and transition ordering are independent of macOS and the live dataset.
export const REPOSITORY = "Planton361/life-os";
export const NODE = "24.21.0";
export const PNPM = "11.3.0";
export const LABEL = "dev.life-os.preview-cd";
export const isSha = (value) => /^[a-f0-9]{40}$/.test(value ?? "");
export function deny(code) {
  throw new Error(code);
}

export function qualityRun(sha, runs) {
  if (!isSha(sha)) deny("INVALID_MAIN_SHA");
  const matching = runs.filter(
    (r) =>
      r.head_sha === sha &&
      r.head_branch === "main" &&
      r.event === "push" &&
      r.path === ".github/workflows/pr-quality.yml" &&
      r.repository?.full_name === REPOSITORY &&
      r.head_repository?.full_name === REPOSITORY,
  );
  const run = matching.sort((a, b) => b.id - a.id)[0];
  // A failed/pending rerun must never fall back to an earlier successful run.
  if (!run || run.status !== "completed" || run.conclusion !== "success")
    deny("QUALITY_NOT_SUCCESSFUL");
  return run;
}

export function qualityJob(sha, jobs) {
  const quality = jobs.filter((j) => j.name === "quality");
  if (
    quality.length !== 1 ||
    quality[0].head_sha !== sha ||
    quality[0].status !== "completed" ||
    quality[0].conclusion !== "success"
  )
    deny("QUALITY_JOB_NOT_SUCCESSFUL");
}

export function protectedMain(rules) {
  const active = rules.filter(
    (r) =>
      r.enforcement === "active" &&
      r.target === "branch" &&
      r.conditions?.ref_name?.include?.includes("refs/heads/main") &&
      !r.conditions?.ref_name?.exclude?.length &&
      !r.bypass_actors?.length,
  );
  const types = new Set(active.flatMap((r) => r.rules.map((v) => v.type)));
  const checks = active
    .flatMap((r) => r.rules)
    .find(
      (r) =>
        r.type === "required_status_checks" &&
        r.parameters.strict_required_status_checks_policy &&
        r.parameters.required_status_checks.some(
          (c) => c.context === "quality",
        ),
    );
  if (
    !checks ||
    !["pull_request", "non_fast_forward", "deletion"].every((t) => types.has(t))
  )
    deny("MAIN_RULESET_CHANGED");
}

export function publicStatus(state, running = false) {
  return {
    installation: state
      ? running
        ? "ACTIVE"
        : "INSTALLED_NOT_RUNNING"
      : "NOT_ACTIVE",
    status: state?.status ?? "idle",
    autoEnabled: state?.autoEnabled ?? false,
    deployedSha: state?.lastGood?.sha ?? null,
    buildId: state?.lastGood?.buildId ?? null,
    targetSha: state?.targetSha ?? null,
    error: state?.error ?? null,
    failures: state?.failures ?? 0,
    retryAfter: state?.retryAfter ?? 0,
    transition: state?.transition?.phase ?? null,
  };
}

export function errorCode(error) {
  const code = error?.message;
  return /^[A-Z][A-Z0-9_]{2,80}$/.test(code ?? "")
    ? code
    : "PREVIEW_OPERATION_FAILED";
}

export function initialState(release) {
  return {
    status: "idle",
    autoEnabled: true,
    lastGood: release,
    previousGood: null,
    targetSha: null,
    failures: 0,
    retryAfter: 0,
    error: null,
    transition: null,
    commandOffset: 0,
  };
}

// All physical operations must be supplied by an owning supervisor. Persist the
// last-known-good BEFORE disturbing the server, and never persist a candidate as
// good until both local and authenticated gateway health have succeeded.
export async function deploy(state, io, { now = Date.now() } = {}) {
  let stopped = false;
  try {
    const sha = await io.latest();
    if (sha !== state.targetSha) {
      state.targetSha = sha;
      state.failures = 0;
      state.retryAfter = 0;
    }
    if (!state.autoEnabled || sha === state.lastGood.sha) {
      state.status = "idle";
      return await io.save(state);
    }
    if (state.failures >= 3 || now < state.retryAfter) return;
    await io.gate(sha);
    state.status = "updating";
    state.error = null;
    await io.save(state);
    const candidate = await io.prepare(sha, state.lastGood);
    await io.commands(state);
    if (!state.autoEnabled) {
      state.status = "idle";
      return await io.save(state);
    }
    await io.gate(sha);
    if ((await io.latest()) !== sha) deny("MAIN_SUPERSEDED");
    await io.preflight(candidate);
    if ((await io.latest()) !== sha) deny("MAIN_SUPERSEDED");
    // Observe a pause queued during CI/readiness before disturbing the writer.
    await io.commands(state);
    if (!state.autoEnabled) {
      state.status = "idle";
      return await io.save(state);
    }
    state.transition = { phase: "stopping", candidate };
    await io.save(state);
    await io.stop();
    stopped = true;
    await io.free();
    state.transition.phase = "starting";
    await io.save(state);
    await io.start(candidate);
    await io.health(candidate);
    state.previousGood = state.lastGood;
    state.lastGood = candidate;
    state.status = "succeeded";
    state.transition = null;
    state.failures = 0;
    state.retryAfter = 0;
    state.error = null;
    await io.save(state);
  } catch (error) {
    const code = errorCode(error);
    if (/^(GITHUB_|QUALITY_|MAIN_SUPERSEDED)/.test(code) && !stopped) {
      state.status = code.startsWith("GITHUB_") ? "failed" : "idle";
      state.error = code;
      state.retryAfter = now + 300_000;
      return await io.save(state);
    }
    // If shutdown was interrupted, ownership must be resolved before recovery.
    // io.stop/free fail closed rather than starting an overlapping writer.
    if (stopped) {
      try {
        await io.stop();
        await io.free();
        await io.start(state.lastGood);
        await io.health(state.lastGood);
        state.transition = null;
      } catch {
        state.status = "blocked";
        state.error = "ROLLBACK_NOT_SAFE";
        state.failures = 3;
        return await io.save(state);
      }
    }
    state.error = code;
    const decision =
      /SCHEMA|COMPATIBILITY|BOUNDARY|IDENTITY|RULESET|CONFIGURATION|TOOLCHAIN|SUPERVISION/.test(
        code,
      );
    state.failures += 1;
    state.status = decision || state.failures >= 3 ? "blocked" : "failed";
    if (decision) state.failures = 3;
    state.retryAfter =
      now + Math.min(30 * 60_000, 300_000 * 2 ** (state.failures - 1));
    await io.save(state);
  }
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
export function launchAgent(node, script, root) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${LABEL}</string>
<key>ProgramArguments</key><array>${[node, script, "supervise", root].map((v) => `<string>${xml(v)}</string>`).join("")}</array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>AbandonProcessGroup</key><false/>
<key>ThrottleInterval</key><integer>30</integer>
<key>ExitTimeOut</key><integer>60</integer>
<key>Umask</key><integer>63</integer>
<key>StandardOutPath</key><string>/dev/null</string>
<key>StandardErrorPath</key><string>/dev/null</string>
</dict></plist>\n`;
}
