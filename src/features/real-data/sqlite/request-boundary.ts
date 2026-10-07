import "server-only";
import { issueOwnerContext, type OwnerContext } from "./owner-context";

export type OwnerGatewayPolicy = Readonly<{
  ownerId: string;
  ownerLogin: string;
  origin: string;
}>;

// The final Tailscale Serve deployment must provide the authenticated identity
// header, strip inbound spoofed copies and bind Next to localhost. This module
// does not provision or configure that provider. No cookie/body/query determines
// the fixed canonical owner. Missing/ambiguous gateway identity fails closed.
export function authenticateGatewayRequest(requestHeaders: Headers, policy: OwnerGatewayPolicy): OwnerContext | null {
  let origin: URL;
  try { origin = new URL(policy.origin); } catch { return null; }
  if (origin.protocol !== "https:" || origin.origin !== policy.origin || origin.username || origin.password) return null;
  if (requestHeaders.get("host") !== origin.host) return null;
  if (requestHeaders.get("tailscale-user-login") !== policy.ownerLogin || !policy.ownerLogin.trim()) return null;
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  if (forwardedHost !== null && forwardedHost !== origin.host) return null;
  try { return issueOwnerContext(policy.ownerId); } catch { return null; }
}

export function assertBrowserWriteOrigin(requestHeaders: Headers, allowedOrigin: string): void {
  let origin: URL;
  try { origin = new URL(allowedOrigin); } catch { throw new Error("WRITE_ORIGIN_DENIED"); }
  if (origin.origin !== allowedOrigin || requestHeaders.get("origin") !== origin.origin || requestHeaders.get("host") !== origin.host)
    throw new Error("WRITE_ORIGIN_DENIED");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  if (forwardedHost !== null && forwardedHost !== origin.host) throw new Error("WRITE_ORIGIN_DENIED");
  if (requestHeaders.get("sec-fetch-site") === "cross-site") throw new Error("WRITE_ORIGIN_DENIED");
}
