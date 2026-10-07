import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
export async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
export async function startApplication(
  fixture,
  { authentication = "issue", port } = {},
) {
  port ??= await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    [
      "--import",
      fileURLToPath(new URL("./no-supabase-network.mjs", import.meta.url)),
      "scripts/ops/run-production.mjs",
      "-p",
      String(port),
      "-H",
      "127.0.0.1",
    ],
    {
      env: {
        PATH: process.env.PATH,
        TMPDIR: realpathSync(tmpdir()),
        NODE_ENV: "production",
        LIFE_OS_APPLICATION_RUNTIME: "sqlite-synthetic",
        LIFE_OS_SYNTHETIC_SQLITE_PATH: fixture.path,
        LIFE_OS_SYNTHETIC_ORIGIN: origin,
        LIFE_OS_SYNTHETIC_AUTH: authentication,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (b) => {
    output += b;
  });
  child.stderr.on("data", (b) => {
    output += b;
  });
  const exited = new Promise((resolve) =>
    child.once("exit", (code, signal) => resolve({ code, signal })),
  );
  const started = performance.now();
  try {
    while (performance.now() - started < 15_000) {
      if (child.exitCode !== null || child.signalCode !== null)
        throw new Error(output);
      try {
        const response = await fetch(`${origin}/today`, {
          headers: { cookie: "life_os_profile=manual" },
        });
        if (response.ok) {
          const html = await response.text();
          if (html.includes("life-os-canvas"))
            return {
              child,
              origin,
              exited,
              startupMs: performance.now() - started,
              output: () => output,
              stop: async (signal = "SIGTERM") => {
                child.kill(signal);
                let timer;
                try {
                  const result = await Promise.race([
                    exited,
                    new Promise((_, reject) => {
                      timer = setTimeout(
                        () =>
                          reject(
                            new Error(
                              `APPLICATION_SHUTDOWN_TIMEOUT\n${output}`,
                            ),
                          ),
                        10_000,
                      );
                    }),
                  ]);
                  if (
                    signal !== "SIGKILL" &&
                    result.code !== 143 &&
                    result.code !== 130
                  )
                    throw new Error(
                      `APPLICATION_SHUTDOWN_FAILED ${JSON.stringify(result)}`,
                    );
                  return result;
                } finally {
                  clearTimeout(timer);
                  if (child.exitCode === null && child.signalCode === null)
                    child.kill("SIGKILL");
                }
              },
            };
        }
      } catch {
        if (child.exitCode !== null || child.signalCode !== null)
          throw new Error(output);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`SQLITE_APPLICATION_START_TIMEOUT\n${output}`);
  } catch (e) {
    child.kill("SIGKILL");
    await exited;
    throw e;
  }
}
