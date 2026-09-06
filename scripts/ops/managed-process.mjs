import { spawn } from "node:child_process";

// Each command owns a separate POSIX process group. Never signal by executable
// name or sweep other runtimes. The caller must await close() in finally.
export function createProcessScope({ graceMs = 5_000 } = {}) {
  const children = new Set();
  let interrupted = null;
  let closing;
  function signalGroup(child, signal) {
    if (!Number.isInteger(child.pid)) return;
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
  function terminate(child) {
    if (child.stopping) return child.stopping;
    child.stopping = new Promise((resolve) => {
      signalGroup(child, "SIGTERM");
      const deadline = Date.now() + graceMs;
      function check() {
        let alive = false;
        try {
          if (Number.isInteger(child.pid)) {
            process.kill(-child.pid, 0);
            alive = true;
          }
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
        if (!alive) return resolve();
        if (Date.now() >= deadline) {
          signalGroup(child, "SIGKILL");
          return resolve();
        }
        setTimeout(check, 20);
      }
      check();
    });
    return child.stopping;
  }
  const handlers = Object.fromEntries(
    ["SIGINT", "SIGTERM"].map((signal) => [
      signal,
      () => {
        if (interrupted) return;
        interrupted = signal;
        for (const child of children) void terminate(child);
      },
    ]),
  );
  for (const [signal, handler] of Object.entries(handlers))
    process.on(signal, handler);
  const parentPid = process.ppid;
  // Also handle an IDE/tool killing only the pnpm parent instead of the
  // foreground group. This observes our own parent; it never sweeps processes.
  const parentWatch = setInterval(() => {
    if (process.ppid !== parentPid) handlers.SIGTERM();
  }, 250);
  parentWatch.unref();

  async function run(
    command,
    args,
    {
      cwd = process.cwd(),
      env = process.env,
      inherit = false,
      cleanup = false,
    } = {},
  ) {
    if (interrupted && !cleanup)
      return {
        ok: false,
        code: interrupted === "SIGINT" ? 130 : 143,
        stdout: "",
        stderr: "Runtime interrupted.",
      };
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd,
        env,
        detached: true,
        stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
      });
      children.add(child);
      let stdout = "",
        stderr = "";
      // CLI output stays bounded and private; callers print only safe markers.
      child.stdout?.on("data", (data) => {
        stdout = (stdout + data).slice(-2_000_000);
      });
      child.stderr?.on("data", (data) => {
        stderr = (stderr + data).slice(-2_000_000);
      });
      child.on("error", () => {
        children.delete(child);
        resolve({
          ok: false,
          code: 1,
          stdout,
          stderr: "Child process could not start.",
        });
      });
      child.on("exit", () => {
        // Clean ordinary descendants even when their parent fails early.
        void terminate(child);
      });
      child.on("close", async (code) => {
        await terminate(child);
        children.delete(child);
        resolve({
          ok: code === 0 && (!interrupted || cleanup),
          code:
            interrupted && !cleanup
              ? interrupted === "SIGINT"
                ? 130
                : 143
              : (code ?? 1),
          stdout,
          stderr,
        });
      });
    });
  }
  return {
    run,
    get interrupted() {
      return interrupted;
    },
    async close() {
      closing ??= Promise.all([...children].map(terminate));
      await closing;
      clearInterval(parentWatch);
      for (const [signal, handler] of Object.entries(handlers))
        process.off(signal, handler);
    },
  };
}
