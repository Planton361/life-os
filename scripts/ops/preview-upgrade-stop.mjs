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
  portOccupied,
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
    timeout = 30_000,
    plist,
    programArguments,
  }) {
    Object.assign(this, { root, config, source, label, port, timeout });
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
  registered() {
    const r = spawnSync("/bin/launchctl", ["print", this.job], {
      env: this.env,
      encoding: "utf8",
      timeout: 5000,
    });
    if (r.status === 0) return r.stdout;
    if (r.status !== null && /Could not find service/.test(r.stderr))
      return null;
    deny("UPGRADE_LAUNCHD_STATE_UNKNOWN");
  }
  alive(pid) {
    const r = spawnSync("/bin/ps", ["-p", String(pid), "-o", "pid="], {
      env: this.env,
      encoding: "utf8",
      timeout: 5000,
    });
    if (r.status === 0 && Number(r.stdout) === pid) return true;
    if (r.status === 1 && !r.stdout.trim() && !r.stderr.trim()) return false;
    deny("UPGRADE_SUPERVISOR_STATE_UNKNOWN");
  }
  holders(path) {
    boundary(path);
    const r = spawnSync("/usr/sbin/lsof", ["-t", path], {
      env: this.env,
      encoding: "utf8",
      timeout: 5000,
    });
    if (r.status === 1 && !r.stdout.trim() && !r.stderr.trim()) return [];
    if (r.status !== 0) deny("UPGRADE_LEASE_HOLDERS_UNKNOWN");
    return [...new Set(r.stdout.trim().split(/\s+/).map(Number))];
  }
  async identity() {
    const options = { env: this.env, timeout: 5000 };
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
      options,
    );
    const cwd = await command(
      "/usr/sbin/lsof",
      ["-a", "-p", String(this.worker.pid), "-d", "cwd", "-Fn"],
      options,
    );
    return createHash("sha256").update(info).update(cwd).digest("hex");
  }
  async sameSupervisor() {
    if (!this.alive(this.worker.pid)) return false;
    try {
      if ((await this.identity()) !== this.worker.identity)
        deny("UPGRADE_SUPERVISOR_IDENTITY_CHANGED");
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
          { env: this.env },
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
    if (!this.worker) await this.capture(true);
    const deadline = Date.now() + (wait ? this.timeout : 0);
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
      if (
        !job &&
        !alive &&
        holders.length === 0 &&
        !(await portOccupied(this.port)) &&
        leaseFree(this.config, this.config.workerSource)
      ) {
        if (this.holders(this.config.database).length)
          deny("UPGRADE_FOREIGN_DATABASE_HANDLE");
        const unlock = operationalLock(lease, this.source());
        // Check again with the lease held: no launchd restart, reused PID or new
        // writer can be mistaken for a successfully completed old shutdown.
        try {
          if (
            this.registered() ||
            this.alive(this.worker.pid) ||
            (await portOccupied(this.port)) ||
            !leaseFree(this.config, this.config.workerSource) ||
            this.holders(this.config.database).length
          )
            deny("UPGRADE_HANDOFF_CHANGED");
          return unlock;
        } catch (error) {
          unlock();
          throw error;
        }
      }
      if (Date.now() >= deadline) deny("UPGRADE_SUPERVISOR_HANDOFF_TIMEOUT");
      await pause(Math.min(100, Math.max(1, deadline - Date.now())));
    } while (true);
  }
  async assertReleased() {
    if (
      !this.worker ||
      this.registered() ||
      this.alive(this.worker.pid) ||
      (await portOccupied(this.port)) ||
      !leaseFree(this.config, this.config.workerSource) ||
      this.holders(this.config.database).length ||
      !isDeepStrictEqual(this.holders(join(this.root, "worker-lease.db")), [
        process.pid,
      ])
    )
      deny("UPGRADE_HANDOFF_CHANGED");
  }
  async stop({ allowUnregistered = false } = {}) {
    const job = await this.capture(allowUnregistered);
    if (job)
      await command("/bin/launchctl", ["bootout", this.job], { env: this.env });
    return this.acquireReleased();
  }
}
