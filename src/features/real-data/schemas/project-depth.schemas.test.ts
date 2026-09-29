import { describe, expect, it } from "vitest";
import { projectDepthCommandSchema } from "./project-depth.schemas";
const id = "69400000-0000-4000-8000-000000000010";
const base = { projectId: id, commandId: id, expectedRevision: "9007199254740993", expectedCycle: "0", operation: "review.submit" };
const payload = {
  fingerprint: "a".repeat(64), decision: "continue", result_accepted: false, rationale: "Observed work",
  criteria: [{ id, assessment: "not_assessed", note: "" }], archived_ids: [], archived_criteria_acknowledged: false,
  evidence: [], open_work_acknowledged: false, open_work_disposition: "",
};
describe("P-DATA v4 action boundary", () => {
  it("preserves exact decimal bigint tokens", () => {
    const parsed = projectDepthCommandSchema.parse({ ...base, payload });
    expect(parsed.expectedRevision).toBe("9007199254740993");
    expect(projectDepthCommandSchema.safeParse({ ...base, expectedRevision: "9223372036854775808", payload }).success).toBe(false);
  });
  it.each([{ result_accepted: true }, { open_work_acknowledged: true }, { open_work_disposition: "Pending work" }, { rationale: "x".repeat(2001) }, { criteria: [{ id, assessment: "excluded" }] }, { criteria: [{ id, assessment: "not_satisfied" }] }])("rejects invalid continue semantics %j", (change) => {
    expect(projectDepthCommandSchema.safeParse({ ...base, payload: { ...payload, ...change } }).success).toBe(false);
  });
  it("requires explicit positive result and every active criterion satisfied", () => {
    expect(projectDepthCommandSchema.safeParse({ ...base, payload: { ...payload, decision: "completed", result_accepted: true } }).success).toBe(false);
    expect(projectDepthCommandSchema.safeParse({ ...base, payload: { ...payload, decision: "completed", result_accepted: true, criteria: [{ id, assessment: "satisfied" }] } }).success).toBe(true);
  });
  it("counts Unicode codepoints and trims the same whitespace as the DB", () => {
    expect(projectDepthCommandSchema.safeParse({ ...base, payload: { ...payload, rationale: "😀".repeat(2000) } }).success).toBe(true);
    expect(projectDepthCommandSchema.safeParse({ ...base, payload: { ...payload, rationale: "😀".repeat(2001) } }).success).toBe(false);
    const parsed = projectDepthCommandSchema.parse({ ...base, operation: "result.set", payload: { desired_result: "\u00a0Result\u00a0" } });
    expect(parsed.payload).toEqual({ desired_result: "Result" });
  });
  it("bounds amendments to a typed reason and exact withdrawal target", () => {
    const command = { ...base, operation: "review.amend" };
    expect(projectDepthCommandSchema.safeParse({ ...command, payload: { review_id: id, kind: "evidence_withdrawn", review_resource_id: null, reason: "Wrong evidence" } }).success).toBe(false);
    expect(projectDepthCommandSchema.safeParse({ ...command, payload: { review_id: id, kind: "evidence_withdrawn", review_resource_id: id, reason: "Wrong evidence" } }).success).toBe(true);
  });
});
