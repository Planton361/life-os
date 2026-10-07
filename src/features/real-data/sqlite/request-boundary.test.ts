import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { authenticateGatewayRequest, assertBrowserWriteOrigin } from "./request-boundary";
import { requireOwnerContext } from "./owner-context";

const policy = { ownerId: "11600000-0000-4000-8000-000000000001", ownerLogin: "synthetic@example.invalid", origin: "https://synthetic.example.invalid" };
const valid = () => new Headers({ host: "synthetic.example.invalid", origin: policy.origin, "tailscale-user-login": policy.ownerLogin, "sec-fetch-site": "same-origin" });
describe("application side owner/origin boundary", () => {
  it("derives the configured canonical owner from an authenticated gateway request", () => {
    const h = valid(); h.set("userId", "attacker"); h.set("cookie", "owner=attacker");
    expect(requireOwnerContext(authenticateGatewayRequest(h, policy))).toBe(policy.ownerId);
    expect(authenticateGatewayRequest(new Headers({ host: "synthetic.example.invalid", cookie: `owner=${policy.ownerId}` }), policy)).toBeNull();
  });
  it("denies missing, other-owner, duplicate and mismatched gateway identities", () => {
    for (const [name, value] of [["tailscale-user-login", ""], ["tailscale-user-login", "other@example.invalid"], ["tailscale-user-login", `${policy.ownerLogin}, ${policy.ownerLogin}`], ["host", "localhost:3000"], ["x-forwarded-host", "attacker.invalid"]]) {
      const h = valid(); h.set(name, value); expect(authenticateGatewayRequest(h, policy)).toBeNull();
    }
  });
  it("denies absent/foreign Origin, Host and forwarded Host before browser writes", () => {
    expect(() => assertBrowserWriteOrigin(valid(), policy.origin)).not.toThrow();
    for (const [name, value] of [["origin", ""], ["origin", "https://attacker.invalid"], ["host", "attacker.invalid"], ["x-forwarded-host", "attacker.invalid"], ["sec-fetch-site", "cross-site"]]) {
      const h = valid(); h.set(name, value); expect(() => assertBrowserWriteOrigin(h, policy.origin)).toThrow("WRITE_ORIGIN_DENIED");
    }
  });
});
