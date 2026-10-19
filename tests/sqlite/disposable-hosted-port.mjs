import { Server } from "node:net";
import { realpathSync } from "node:fs";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { request } from "node:http";
// Test-process-only redirection. Production launchers retain their fixed port;
// a test must never send a write to an already running personal port 3000.
const port = Number(process.env.LIFE_OS_DISPOSABLE_HOSTED_PORT);
const path = process.env.LIFE_OS_HOSTED_SQLITE_PATH;
if (
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535 ||
  port === 3000 ||
  !path ||
  !realpathSync(dirname(path)).startsWith(`${realpathSync(tmpdir())}/life-os-`)
)
  throw new Error("DISPOSABLE_PORT_BOUNDARY_REQUIRED");
const listen = Server.prototype.listen;
Server.prototype.listen = function (...args) {
  if (typeof args[0] === "object" && Number(args[0]?.port) === 3000)
    args[0] = { ...args[0], port };
  else if (Number(args[0]) === 3000) args[0] = port;
  return listen.apply(this, args);
};

// Next's server-action redirect performs a server-side GET to the gateway
// origin. Only this disposable child knows the synthetic gateway mapping.
const fixtureOrigin = process.env.LIFE_OS_DISPOSABLE_GATEWAY_ORIGIN;
if (fixtureOrigin) {
  if (fixtureOrigin !== "https://reset-fixture.owner-tailnet.ts.net")
    throw new Error("DISPOSABLE_GATEWAY_BOUNDARY_REQUIRED");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    );
    if (url.origin !== fixtureOrigin) return originalFetch(input, init);
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");
    if (method !== "GET") throw new Error("DISPOSABLE_GATEWAY_READ_ONLY");
    const headers = Object.fromEntries(
      new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      ),
    );
    headers.host = url.host;
    headers["tailscale-user-login"] = process.env.LIFE_OS_HOSTED_OWNER_LOGIN;
    return new Promise((resolve, reject) => {
      const req = request(
        {
          hostname: "127.0.0.1",
          port,
          path: url.pathname + url.search,
          method,
          headers,
        },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () =>
            resolve(
              new Response(Buffer.concat(chunks), {
                status: res.statusCode,
                headers: res.headers,
              }),
            ),
          );
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.end();
    });
  };
}
