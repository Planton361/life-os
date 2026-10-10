import { performance } from "node:perf_hooks";
import { createConnection } from "node:net";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { LABEL, deny } from "./preview-cd-core.mjs";
import { createHash } from "node:crypto";
import {
  boundary,
  command,
  cleanEnvironment,
  readJson,
  pause,
  operationalLock,
  leaseFree,
} from "./preview-cd-host.mjs";

// Only the verified launchd job is stopped. Waiting never signals a PID, removes
// a lease, or retries an operator command. A dead/reused PID is not an identity.
export class SupervisorHandoff {
  constructor({
    root,
    config,
    source,
    label = LABEL,
    port = 3000,
    legacyV9 = false,
    timeout = legacyV9 ? 60_000 : 30_000,
    diagnostic = () => {},
    plist,
    programArguments,
  }) {
    if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 60_000)
      deny("UPGRADE_HANDOFF_BUDGET_INVALID");
    Object.assign(this, {
      root,
      config,
      source,
      label,
      port,
      timeout,
      diagnostic,
    });
    this.observations = {};
    this.probes = {};
    this.started = performance.now();
    this.env = cleanEnvironment(config.node);
    this.job = `gui/${process.getuid()}/${label}`;
    this.plist =
      plist ?? join(process.env.HOME, "Library/LaunchAgents", `${label}.plist`);
    this.programArguments = programArguments ?? [
      config.node,
      join(config.workerSource, "scripts/ops/preview-cd.mjs"),
      "supervise",
      root,
    ];
  }
  begin(budget = this.timeout) {
    this.started = performance.now();
    this.deadline = this.started + budget;
    this.activeBudget = budget;
    this.observations = Object.fromEntries(
      [
        "job",
        "supervisor",
        "identity",
        "workerHandles",
        "workerLease",
        "writerHandles",
        "writerLease",
        "databaseHandles",
        "port",
      ].map((name) => [name, { state: "unobserved", atMs: 0 }]),
    );
    this.probes = {};
    this.phase = "capture";
  }
  elapsed() {
    return Math.round(performance.now() - this.started);
  }
  observe(name, state) {
    const previous = this.observations[name];
    const confirmed =
      previous && !["unknown", "unobserved"].includes(previous.state)
        ? { state: previous.state, atMs: previous.atMs }
        : previous?.lastConfirmed;
    this.observations[name] = {
      state,
      atMs: this.elapsed(),
      ...(state === "unknown" && confirmed ? { lastConfirmed: confirmed } : {}),
    };
  }
  evidence(error) {
    return {
      version: 1,
      phase: this.phase,
      elapsedMs: this.elapsed(),
      budgetMs: this.activeBudget ?? this.timeout,
      ...(error ? { error } : {}),
      // Absent observations mean unobserved, not released. atMs makes retained
      // earlier observations distinguishable from the most recent probe.
      observations: { ...this.observations },
      probes: structuredClone(this.probes),
    };
  }
  report(phase, error) {
    this.phase = phase;
    this.diagnostic(this.evidence(error));
  }
  probeTimeout() {
    if (!this.deadline) return 5000;
    const remaining = this.deadline - performance.now();
    if (remaining <= 0) deny("UPGRADE_SUPERVISOR_HANDOFF_TIMEOUT");
    return Math.max(1, Math.min(5000, Math.floor(remaining)));
  }
  measured(name, run) {
    const started = performance.now();
    const finish = () => {
      const ms = Math.round(performance.now() - started);
      const p = (this.probes[name] ??= { count: 0, totalMs: 0, maxMs: 0 });
      p.count++;
      p.totalMs += ms;
      p.maxMs = Math.max(p.maxMs, ms);
    };
    this.observe(name, "unknown");
    try {
      const result = run();
      if (result?.then) return result.finally(finish);
      finish();
      return result;
    } catch (error) {
      finish();
      throw error;
    }
  }
  syncProbe(name, file, args) {
    return this.measured(name, () => {
      const r = spawnSync(file, args, {
        env: this.env,
        encoding: "utf8",
        timeout: this.probeTimeout(),
        // This bounds only our owned inspection helper, never the supervisor.
        killSignal: "SIGKILL",
      });
      if (r.error) deny("UPGRADE_HANDOFF_PROBE_FAILED");
      return r;
    });
  }
  async portBusy() {
    return this.measured(
      "port",
      () =>
        new Promise((resolve) => {
          const timeout = Math.min(1000, this.probeTimeout());
          const socket = createConnection({
            host: "127.0.0.1",
            port: this.port,
          });
          const finish = (value) => {
            socket.destroy();
            this.observe("port", value ? "occupied" : "free");
            resolve(value);
          };
          socket.setTimeout(timeout);
          socket.once("connect", () => finish(true));
          socket.once("error", (error) => {
            // Refused loopback connection proves free; other errors are unknown.
            if (error.code === "ECONNREFUSED") finish(false);
            else {
              socket.destroy();
              resolve(true);
            }
          });
          socket.once("timeout", () => {
            socket.destroy();
            resolve(true);
          });
        }),
    );
  }
  writerFree() {
    return this.measured("writerLease", () => {
      this.probeTimeout();
      const free = leaseFree(this.config, this.config.workerSource);
      this.observe("writerLease", free ? "free" : "held");
      return free;
    });
  }
  registered() {
    const r = this.syncProbe("job", "/bin/launchctl", ["print", this.job]);
    if (r.status === 0) {
      this.observe("job", "registered");
      return r.stdout;
    }
    if (r.status !== null && /Could not find service/.test(r.stderr)) {
      this.observe("job", "removed");
      return null;
    }
    deny("UPGRADE_LAUNCHD_STATE_UNKNOWN");
  }
  alive(pid) {
    const r = this.syncProbe("supervisor", "/bin/ps", [
      "-p",
      String(pid),
      "-o",
      "pid=",
    ]);
    if (r.status === 0 && Number(r.stdout) === pid) {
      this.observe("supervisor", "alive");
      return true;
    }
    if (r.status === 1 && !r.stdout.trim() && !r.stderr.trim()) {
      this.observe("supervisor", "exited");
      return false;
    }
    deny("UPGRADE_SUPERVISOR_STATE_UNKNOWN");
  }
  holders(path) {
    boundary(path);
    const name =
      path === join(this.root, "worker-lease.db")
        ? "workerHandles"
        : path === this.config.database
          ? "databaseHandles"
          : "writerHandles";
    const owner =
      name === "workerHandles" ? this.worker.pid : this.worker.serverPid;
    const r = this.syncProbe(name, "/usr/sbin/lsof", ["-t", path]);
    if (r.status === 1 && !r.stdout.trim() && !r.stderr.trim()) {
      this.observe(name, "none");
      return [];
    }
    if (r.status !== 0) deny("UPGRADE_LEASE_HOLDERS_UNKNOWN");
    const holders = [...new Set(r.stdout.trim().split(/\s+/).map(Number))];
    if (holders.some((pid) => !Number.isSafeInteger(pid) || pid <= 1))
      deny("UPGRADE_LEASE_HOLDERS_UNKNOWN");
    this.observe(
      name,
      holders.some((pid) => pid !== owner) ? "foreign" : "owned",
    );
    return holders;
  }

  async identity() {
    const options = () => ({ env: this.env, timeout: this.probeTimeout() });
    const info = await command(
      "/bin/ps",
      [
        "-p",
        String(this.worker.pid),
        "-o",
        "lstart=",
        "-o",
        "ppid=",
        "-o",
        "command=",
      ],
      options(),
    );
    const cwd = await command(
      "/usr/sbin/lsof",
      ["-a", "-p", String(this.worker.pid), "-d", "cwd", "-Fn"],
      options(),
    );
    return createHash("sha256").update(info).update(cwd).digest("hex");
  }
  async sameSupervisor() {
    if (!this.alive(this.worker.pid)) return false;
    try {
      const identity = await this.measured("identity", () => this.identity());
      if (identity !== this.worker.identity) {
        this.observe("identity", "changed");
        deny("UPGRADE_SUPERVISOR_IDENTITY_CHANGED");
      }
      this.observe("identity", "verified");
      return true;
    } catch (error) {
      if (!this.alive(this.worker.pid)) return false;
      throw error;
    }
  }
  async capture(allowUnregistered) {
    this.worker = readJson(join(this.root, "worker.json"));
    if (
      !Number.isSafeInteger(this.worker.pid) ||
      this.worker.pid <= 1 ||
      !/^[a-f0-9]{64}$/.test(this.worker.identity ?? "")
    )
      deny("UPGRADE_SUPERVISOR_IDENTITY_INVALID");
    const job = this.registered();
    const alive = await this.sameSupervisor();
    if (job) {
      boundary(this.plist);
      const args = JSON.parse(
        await command(
          "/usr/bin/plutil",
          ["-extract", "ProgramArguments", "json", "-o", "-", this.plist],
          { env: this.env, timeout: this.probeTimeout() },
        ),
      );
      if (
        !alive ||
        !job.includes(`pid = ${this.worker.pid}\n`) ||
        !isDeepStrictEqual(args, this.programArguments)
      )
        deny("UPGRADE_SUPERVISOR_IDENTITY_CHANGED");
    } else if (!allowUnregistered) deny("UPGRADE_SUPERVISOR_NOT_REGISTERED");
    return job;
  }
  async acquireReleased({ wait = true } = {}) {
    // Recovery's one-shot topology check has its own bounded probe allowance;
    // it never polls or consumes a second stop budget.
    const ownBudget = !wait || !this.deadline;
    if (ownBudget) this.begin(wait ? this.timeout : 5000);
    try {
      return await this.waitReleased(wait);
    } catch (error) {
      if (ownBudget)
        this.report(
          "failed",
          /^[A-Z0-9_]+$/.test(error.message)
            ? error.message
            : "UPGRADE_HANDOFF_FAILED",
        );
      throw error;
    } finally {
      if (ownBudget) this.deadline = null;
    }
  }
  async waitReleased(wait) {
    if (!this.worker) await this.capture(true);
    this.report("wait");
    do {
      const job = this.registered();
      if (job) {
        const pid = /\bpid = (\d+)\n/.exec(job);
        if (pid && Number(pid[1]) !== this.worker.pid)
          deny("UPGRADE_SUPERVISOR_IDENTITY_CHANGED");
      }
      const alive = await this.sameSupervisor(),
        lease = join(this.root, "worker-lease.db"),
        holders = this.holders(lease);
      for (const file of [
        this.config.database,
        `${this.config.database}.writer-lease.db`,
      ]) {
        if (this.holders(file).some((pid) => pid !== this.worker.serverPid))
          deny("UPGRADE_FOREIGN_DATABASE_HANDLE");
      }
      if (holders.some((pid) => pid !== this.worker.pid))
        deny("UPGRADE_FOREIGN_WORKER_LEASE");
      // Observe every gate independently even while PID/job still block us.
      const portBusy = await this.portBusy(),
        writerFree = this.writerFree();
      if (!job && !alive && holders.length === 0 && !portBusy && writerFree) {
        if (this.holders(this.config.database).length)
          deny("UPGRADE_FOREIGN_DATABASE_HANDLE");
        this.probeTimeout();
        const unlock = operationalLock(lease, this.source());
        this.observe("workerLease", "exclusive");
        this.report("verify");
        // Check again with the lease held: no launchd restart, reused PID or new
        // writer can be mistaken for a successfully completed old shutdown.
        try {
          if (
            this.registered() ||
            this.alive(this.worker.pid) ||
            (await this.portBusy()) ||
            !this.writerFree() ||
            this.holders(this.config.database).length
          )
            deny("UPGRADE_HANDOFF_CHANGED");
          this.probeTimeout();
          this.report("complete");
          return unlock;
        } catch (error) {
          unlock();
          throw error;
        }
      }
      if (!wait || performance.now() >= this.deadline)
        deny("UPGRADE_SUPERVISOR_HANDOFF_TIMEOUT");
      await pause(
        Math.min(100, Math.max(1, this.deadline - performance.now())),
      );
    } while (true);
  }
  async assertReleased() {
    if (
      !this.worker ||
      this.registered() ||
      this.alive(this.worker.pid) ||
      (await this.portBusy()) ||
      !this.writerFree() ||
      this.holders(this.config.database).length ||
      !isDeepStrictEqual(this.holders(join(this.root, "worker-lease.db")), [
        process.pid,
      ])
    )
      deny("UPGRADE_HANDOFF_CHANGED");
  }
  async stop({ allowUnregistered = false } = {}) {
    this.begin();
    try {
      const job = await this.capture(allowUnregistered);
      this.report("bootout");
      if (job)
        await this.measured("bootout", () =>
          command("/bin/launchctl", ["bootout", this.job], {
            env: this.env,
            timeout: this.probeTimeout(),
          }),
        );
      return await this.acquireReleased();
    } catch (error) {
      this.report(
        "failed",
        /^[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : "UPGRADE_HANDOFF_FAILED",
      );
      throw error;
    } finally {
      this.deadline = null;
    }
  }
}
