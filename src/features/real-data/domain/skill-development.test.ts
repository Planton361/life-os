import { describe, expect, it } from "vitest";
import {
  skillPracticeReads,
  type PracticeTask,
  type DevelopmentEvidence,
} from "./skill-development";
import { parseSkillCommand } from "../schemas/skill-development.schema";
const task = (patch: Partial<PracticeTask> = {}): PracticeTask => ({
  id: "a",
  title: "Task",
  status: "done",
  completed_at: "2026-09-30T08:00:00Z",
  archived_at: null,
  linked_at: "2026-10-01T10:00:00Z",
  project_id: null,
  goal_id: null,
  ...patch,
});
const evidence = (
  patch: Partial<DevelopmentEvidence> = {},
): DevelopmentEvidence => ({
  user_id: "owner",
  created_at: "2026-09-29T10:00:00Z",
  updated_at: "2026-09-29T10:00:00Z",
  id: "e",
  skill_id: "s",
  title: "Observed",
  note: null,
  source_type: "manual_note",
  source_id: null,
  evidence_date: "2026-09-29",
  weight: null,
  revision: 1,
  withdrawn_at: null,
  source_snapshot: null,
  provenance_state: "legacy_unverified",
  ...patch,
});
const read = (tasks: PracticeTask[], rows: DevelopmentEvidence[]) =>
  skillPracticeReads(tasks, rows, "2026-10-01T23:00:00Z", "Europe/Berlin");
describe("PP2 canonical reads", () => {
  it("keeps Task completion separate from Evidence, including late links", () => {
    const r = read([task()], [evidence({ evidence_date: "2026-10-02" })]);
    expect(r.latestLinkedTaskCompletionAt).toBe("2026-09-30T08:00:00Z");
    expect(r.latestEvidenceDate).toBe("2026-10-02");
    expect(r.completed).toHaveLength(1);
  });
  it("reopen, unlink, archive, canceled and missing/future completion never invent practice history", () => {
    const r = read(
      [
        task({ status: "active", completed_at: null }),
        task({ id: "b", archived_at: "2026-10-01" }),
        task({ id: "c", status: "canceled" }),
        task({ id: "d", completed_at: null }),
        task({ id: "f", completed_at: "2999-01-01T00:00:00Z" }),
      ],
      [],
    );
    expect(r.latestLinkedTaskCompletionAt).toBeNull();
    expect(r.open).toHaveLength(1);
    expect(r.canceled).toHaveLength(1);
    expect(read([], []).latestLinkedTaskCompletionAt).toBeNull();
  });
  it("withdrawal excludes current evidence; restore retains original date; future legacy is not recency", () => {
    expect(
      read([], [evidence({ withdrawn_at: "2026-10-01" })]).latestEvidenceDate,
    ).toBeNull();
    expect(read([], [evidence({ revision: 3 })]).latestEvidenceDate).toBe(
      "2026-09-29",
    );
    expect(
      read([], [evidence({ evidence_date: "2999-01-01" })]).latestEvidenceDate,
    ).toBeNull();
  });
});
describe("PP2 command boundary", () => {
  const id = "94000000-0000-4000-8000-000000000001";
  const create = {
    operation: "skill.create",
    commandId: id,
    skillId: null,
    expectedRevision: null,
    payload: { name: "  Skill  ", user_id: id },
  };
  it("normalizes and strips client owner; Create has no expected aggregate revision", () => {
    const r = parseSkillCommand(create);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.payload).toEqual({ name: "Skill" });
    expect(parseSkillCommand({ ...create, expectedRevision: 0 }).success).toBe(
      false,
    );
  });
  it("existing mutations require owner-scoped identity and expected revision, not a synthesized one", () => {
    expect(
      parseSkillCommand({ ...create, operation: "skill.archive", payload: {} })
        .success,
    ).toBe(false);
    expect(
      parseSkillCommand({
        ...create,
        operation: "skill.archive",
        skillId: id,
        expectedRevision: 0,
        payload: {},
      }).success,
    ).toBe(true);
  });
  it("requires reason and stable source reference, never permits moving Evidence to another Skill", () => {
    expect(
      parseSkillCommand({
        ...create,
        operation: "evidence.withdraw",
        skillId: id,
        expectedRevision: 0,
        payload: { evidence_id: id },
      }).success,
    ).toBe(false);
    expect(
      parseSkillCommand({
        ...create,
        operation: "evidence.create",
        skillId: id,
        expectedRevision: 0,
        payload: {
          title: "x",
          evidence_date: "2026-01-01",
          source_type: "task",
          source_id: null,
        },
      }).success,
    ).toBe(false);
  });
});
it("review lifecycle requires an explicit note and cannot retire a Milestone", () => {
  const id = "94000000-0000-4000-8000-000000000001";
  const header = {
    operation: "review.submit",
    commandId: id,
    skillId: id,
    expectedRevision: 1,
    payload: {
      target_id: id,
      milestone_id: id,
      decision: "retired",
      note: "reason",
      open_milestones_acknowledged: false,
      evidence: [],
    },
  };
  expect(parseSkillCommand(header).success).toBe(false);
  expect(
    parseSkillCommand({
      ...header,
      payload: { ...header.payload, decision: "completed" },
    }).success,
  ).toBe(true);
  expect(
    parseSkillCommand({
      ...header,
      payload: { ...header.payload, milestone_id: null, note: " " },
    }).success,
  ).toBe(false);
});
