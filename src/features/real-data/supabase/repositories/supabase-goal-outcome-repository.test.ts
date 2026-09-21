import { describe, expect, it, vi } from "vitest";
import {
  addGoalTaskSupport,
  achieveGoal,
  appendGoalCriterionEvaluation,
  createGoalMilestone,
  projectEffectiveGoalAchievementEvidence,
  projectEffectiveMilestoneAchievementEvidence,
  setGoalMilestoneStatus,
} from "./supabase-goal-outcome-repository";
import type {
  GoalAchievementEvidenceRow,
  GoalMilestoneAchievementEvidenceRow,
} from "../row-types";

const userId = "11111111-1111-4111-8111-111111111111";
const goalId = "22222222-2222-4222-8222-222222222222";

type MockQuery = {
  select: (...args: unknown[]) => MockQuery;
  eq: (...args: unknown[]) => MockQuery;
  is: (...args: unknown[]) => MockQuery;
  insert: (...args: unknown[]) => MockQuery;
  update: (...args: unknown[]) => MockQuery;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  single: () => Promise<{ data: unknown; error: null }>;
};

describe("Goal outcome repository boundaries", () => {
  it("projects Goal amendment evidence from the full correction chain without changing event-local rows", () => {
    const eventRows = [
      { id: "goal-a", episode_id: "episode-a", corrects_event_id: null },
      { id: "goal-b", episode_id: "episode-b", corrects_event_id: null },
      { id: "goal-b-amendment", episode_id: "episode-b", corrects_event_id: "goal-b" },
    ];
    const evidence = (
      overrides: Record<string, unknown>,
    ) =>
      ({
        id: "reference",
        reference_group_id: "group",
        reference_action: "attached",
        source_type: "project",
        source_id: "source-a",
        source_title_snapshot: "Source A",
        source_context_snapshot: null,
        supersedes_reference_id: null,
        reason: null,
        retrospective: false,
        occurred_at: null,
        recorded_at: "2026-09-21T10:00:00.000Z",
        achievement_event_id: "goal-b",
        user_id: userId,
        ...overrides,
      }) as unknown as GoalAchievementEvidenceRow;

    const root = evidence({ id: "goal-reference-root" });
    const replacement = evidence({
      id: "goal-reference-replacement",
      reference_action: "replaced",
      source_id: "source-b",
      source_title_snapshot: "Source B",
      supersedes_reference_id: root.id,
      reason: "Newer source",
      achievement_event_id: "goal-b-amendment",
      recorded_at: "2026-09-21T10:01:00.000Z",
    });
    const withdrawn = evidence({
      id: "goal-reference-withdrawn",
      reference_action: "withdrawn",
      supersedes_reference_id: replacement.id,
      reason: "No longer accepted",
      achievement_event_id: "goal-b-amendment",
      recorded_at: "2026-09-21T10:02:00.000Z",
    });
    const oldEpisode = evidence({
      id: "goal-reference-old-episode",
      source_id: "source-old",
      source_title_snapshot: "Old episode",
      achievement_event_id: "goal-a",
    });

    const projection = projectEffectiveGoalAchievementEvidence(
      "goal-b-amendment",
      eventRows,
      [root, replacement, withdrawn, oldEpisode],
    );
    expect(projection.history.map((reference) => reference.id)).toEqual([
      withdrawn.id,
      replacement.id,
      root.id,
    ]);
    expect(projection.active).toEqual([]);
    expect(
      projectEffectiveGoalAchievementEvidence("goal-b", eventRows, [root, oldEpisode])
        .active.map((reference) => reference.id),
    ).toEqual([root.id]);
  });

  it("keeps Etappe evidence active through a note/time amendment and isolates episodes", () => {
    const eventRows = [
      { id: "milestone-a", episode_id: "episode-a", corrects_event_id: null },
      { id: "milestone-b", episode_id: "episode-b", corrects_event_id: null },
      { id: "milestone-b-amendment", episode_id: "episode-b", corrects_event_id: "milestone-b" },
    ];
    const evidence = (
      overrides: Record<string, unknown>,
    ) =>
      ({
        id: "reference",
        reference_group_id: "group",
        reference_action: "attached",
        source_type: "project",
        source_id: "source-b",
        source_title_snapshot: "Source B",
        source_context_snapshot: null,
        supersedes_reference_id: null,
        reason: null,
        retrospective: false,
        occurred_at: null,
        recorded_at: "2026-09-21T10:00:00.000Z",
        achievement_event_id: "milestone-b",
        episode_id: "episode-b",
        user_id: userId,
        ...overrides,
      }) as unknown as GoalMilestoneAchievementEvidenceRow;
    const root = evidence({ id: "milestone-reference-root" });
    const supplement = evidence({
      id: "milestone-reference-supplement",
      reference_group_id: "supplement-group",
      reference_action: "supplemented",
      source_id: "source-supplement",
      source_title_snapshot: "Supplement",
      reason: "Retrospective context",
      retrospective: true,
      achievement_event_id: "milestone-b-amendment",
      recorded_at: "2026-09-21T10:01:00.000Z",
    });
    const oldEpisode = evidence({
      id: "milestone-reference-old-episode",
      source_id: "source-old",
      source_title_snapshot: "Old episode",
      achievement_event_id: "milestone-a",
      episode_id: "episode-a",
    });

    const projection = projectEffectiveMilestoneAchievementEvidence(
      "milestone-b-amendment",
      eventRows,
      [root, supplement, oldEpisode],
    );
    expect(projection.active.map((reference) => reference.id)).toEqual([
      supplement.id,
      root.id,
    ]);
    expect(
      projectEffectiveMilestoneAchievementEvidence(
        "milestone-b-amendment",
        eventRows,
        [root, oldEpisode],
      ).active.map((reference) => reference.id),
    ).toEqual([root.id]);
  });

  it("rejects a non-owned Goal before milestone persistence", async () => {
    const tables: string[] = [];
    const filters: Array<[string, unknown]> = [];
    const client = {
      from(table: string) {
        tables.push(table);
        const chain = {
          eq(column: string, value: unknown) {
            filters.push([column, value]);
            return chain;
          },
          is() {
            return chain;
          },
          maybeSingle: async () => ({ data: null, error: null }),
          select() {
            return chain;
          },
        };
        return chain;
      },
    };

    const result = await createGoalMilestone(client as never, {
      goalId,
      profileId: userId,
      sortOrder: 0,
      status: "planned",
      title: "First outcome milestone",
      userId,
    });

    expect(result).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(tables).toEqual(["goals"]);
    expect(filters).toContainEqual(["user_id", userId]);
    expect(filters).toContainEqual(["id", goalId]);
  });

  it("translates the database achievement gate into a visible conflict", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "GOAL_ACHIEVEMENT_CRITERIA_NOT_MET" },
    });

    const result = await achieveGoal(
      { rpc } as never,
      { goalId, note: "Ready", profileId: userId, userId },
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "conflict",
        message: "Alle aktiven Kriterien müssen erfüllt sein.",
      },
    });
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "GOAL_STALE_STATE" },
    });
    const stale = await achieveGoal({ rpc } as never, { goalId, profileId: userId, userId });
    expect(stale).toMatchObject({ ok: false, error: { code: "conflict" } });
  });

  it("blocks criterion revisions for an achieved Goal before RPC execution", async () => {
    const rpc = vi.fn();
    const from = vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        maybeSingle: vi.fn(async () =>
          table === "goals"
            ? { data: { id: goalId, status: "achieved", archived_at: null }, error: null }
            : { data: null, error: null },
        ),
      } as unknown as MockQuery;
      return chain;
    });

    const result = await appendGoalCriterionEvaluation(
      { from, rpc } as never,
      {
        criterionId: "77777777-7777-4777-8777-777777777777",
        criterionType: "boolean",
        evaluationState: "value",
        goalId,
        profileId: userId,
        userId,
      },
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "conflict", message: "Ein erreichtes Goal kann nicht verändert werden." },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("resolves a project Goal for an inherited-only Task before support insert", async () => {
    const projectId = "33333333-3333-4333-8333-333333333333";
    const milestoneId = "44444444-4444-4444-8444-444444444444";
    let inserted: Record<string, unknown> | undefined;
    const from = vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        insert: vi.fn((payload: Record<string, unknown>) => {
          inserted = payload;
          return chain;
        }),
        maybeSingle: vi.fn(async () => {
          if (table === "goals") return { data: { id: goalId, status: "active", archived_at: null }, error: null };
          if (table === "goal_milestones") return { data: { id: milestoneId, status: "active", archived_at: null }, error: null };
          if (table === "tasks") return { data: { id: "55555555-5555-4555-8555-555555555555", goal_id: null, project_id: projectId, archived_at: null }, error: null };
          if (table === "projects") return { data: { goal_id: goalId, archived_at: null }, error: null };
          return { data: null, error: null };
        }),
        single: vi.fn(async () => ({ data: { id: "66666666-6666-4666-8666-666666666666" }, error: null })),
      } as unknown as MockQuery;
      return chain;
    });

    const result = await addGoalTaskSupport(
      { from } as never,
      {
        goalId,
        goalMilestoneId: milestoneId,
        profileId: userId,
        taskId: "55555555-5555-4555-8555-555555555555",
        userId,
      },
    );

    expect(result).toMatchObject({ ok: true });
    expect(inserted).toMatchObject({
      goal_id: goalId,
      goal_milestone_id: milestoneId,
      task_id: "55555555-5555-4555-8555-555555555555",
      user_id: userId,
    });
    expect(from).toHaveBeenCalledWith("projects");
  });

  it("writes deferred evaluations as append-only no-decision rows", async () => {
    const criterionId = "77777777-7777-4777-8777-777777777777";
    const evaluationId = "88888888-8888-4888-8888-888888888888";
    const rpc = vi.fn().mockResolvedValue({
      data: { evaluation_id: evaluationId },
      error: null,
    });
    const from = vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => {
          if (table === "goals") return { data: { id: goalId, status: "active", archived_at: null }, error: null };
          if (table === "goal_outcome_criteria") return { data: { id: criterionId, criterion_type: "boolean", unit: null, archived_at: null }, error: null };
          if (table === "goal_criterion_evaluations") return {
            data: {
              id: evaluationId,
              user_id: userId,
              criterion_id: criterionId,
              is_deferred: true,
              boolean_value: null,
              numeric_value: null,
              unit: null,
              evaluated_at: "2026-09-21T00:00:00.000Z",
              recorded_at: "2026-09-21T00:00:00.000Z",
              note: "Later",
              created_at: "2026-09-21T00:00:00.000Z",
              goal_id_snapshot: goalId,
              goal_milestone_id_snapshot: null,
              criterion_title_snapshot: "Criterion",
              criterion_type_snapshot: "boolean",
              unit_snapshot: null,
              target_snapshot: null,
              direction_snapshot: null,
              revision_kind: "evaluation",
              supersedes_evaluation_id: null,
              correction_reason: null,
              is_retracted: false,
              legacy_state: null,
              retrospective: false,
            },
            error: null,
          };
          return { data: null, error: null };
        }),
      } as unknown as MockQuery;
      return chain;
    });

    const result = await appendGoalCriterionEvaluation(
      { from, rpc } as never,
      {
        criterionId,
        criterionType: "boolean",
        evaluationState: "deferred",
        goalId,
        note: "Later",
        profileId: userId,
        userId,
      },
    );

    expect(result).toMatchObject({ ok: true, data: { deferred: true, booleanValue: null, numericValue: null } });
    expect(rpc).toHaveBeenCalledWith("execute_goal_command", expect.objectContaining({
      p_command_kind: "criterion.evaluate",
      p_payload: expect.objectContaining({ deferred: true }),
    }));
  });

  it("rejects a planned-to-achieved shortcut before persistence", async () => {
    const update = vi.fn();
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "GOAL_MILESTONE_ACHIEVE_REQUIRES_ACTIVE" },
    });
    const from = vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        update: vi.fn(() => {
          update();
          return chain;
        }),
        maybeSingle: vi.fn(async () => {
          if (table === "goals") return { data: { id: goalId, status: "active", archived_at: null }, error: null };
          if (table === "goal_milestones") return { data: { id: "99999999-9999-4999-8999-999999999999", status: "planned", archived_at: null }, error: null };
          return { data: null, error: null };
        }),
      } as unknown as MockQuery;
      return chain;
    });

    const result = await setGoalMilestoneStatus(
      { from, rpc } as never,
      {
        goalId,
        milestoneId: "99999999-9999-4999-8999-999999999999",
        profileId: userId,
        status: "achieved",
        userId,
      },
    );

    expect(result).toMatchObject({ ok: false, error: { code: "conflict" } });
    expect(update).not.toHaveBeenCalled();
  });
});
