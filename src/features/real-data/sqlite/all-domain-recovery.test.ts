import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  populatedNutritionTrainingFixture,
  result,
} from "../../../../tests/sqlite/nutrition-training-fixture";
import {
  owner,
  scope,
  daily,
  at,
} from "../../../../tests/sqlite/source-review-fixture";
import {
  wishlistInput,
  challengeInput,
} from "../../../../tests/sqlite/retained-fixture";
import { createSqliteRetainedRepository } from "./repositories/retained-repository";
import { ownedArea } from "./commands/retained-commands";
import { createSqliteGoalOutcomeRepository } from "./repositories/goal-outcome-repository";
import {
  goalCommandFingerprint,
  type GoalCommandKind,
} from "./commands/goal-commands";
import {
  readSqliteProjectDepth,
  projectDepthCommand,
} from "./repositories/project-depth-repository";
import {
  readSqliteSkillDevelopment,
  skillDevelopmentCommand,
} from "./repositories/skill-development-repository";
import { createSqliteTaskStepRepository } from "./repositories/task-step-repository";
import { createSqliteRecurringTaskTemplateRepository } from "./repositories/recurring-task-template-repository";
import { createSqliteHealthRepository } from "./repositories/health-repository";
import { createSqliteHabitRepository } from "./repositories/habit-repository";
import { createSqliteReviewRepository } from "./repositories/review-repository";
import { createSqliteNutritionRepository } from "./repositories/nutrition-repository";
import { createSqliteTrainingRepository } from "./repositories/training-repository";
import { createSqliteCanonicalBaseRepository } from "./repositories/canonical-base-repository";
import { createSqliteInboxRepository } from "./repositories/inbox-repository";
import { generateRecurringTaskInstancesForDate } from "../use-cases/recurring-task-generation";
import { canonicalTableNames } from "./canonical-catalog";
import { inspectSyntheticDatabase, restoreSyntheticBackup } from "./recovery";
import { SqliteRuntime } from "./runtime";

it("round-trips one populated all-domain backend fixture through clean restart, online backup and isolated restore", async () => {
  const f = await populatedNutritionTrainingFixture();
  const retained = createSqliteRetainedRepository(f.store, f.context);
  const ids: Record<string, string> = {};
  try {
    f.store.command(f.context, "retained.area", (db) => {
      for (const key of ["life", "coding", "education", "work"])
        ownedArea(db, owner, key, true);
    });
    retained.create(owner, "journal", {
      entryDate: "2026-10-01",
      title: "History",
      body: "Full private synthetic text 🧭",
    });
    retained.lifeNote(owner, "create", {
      title: "Life Note",
      body: "Canonical Resource",
    });
    for (const domain of ["coding", "education", "work"] as const) {
      const project = retained.project(owner, domain, {
        title: `${domain} Project`,
        status: "active",
        repositoryUrl:
          domain === "coding" ? "https://example.test/repository" : undefined,
      });
      ids[domain] = String(project.id);
      const input = {
        projectId: project.id,
        sessionDate: "2026-10-01",
        logDate: "2026-10-01",
        startTime: "12:30",
        startedAt: "12:30",
        durationMinutes: 30,
        activity: "Code",
        logType: "writing",
        focus: "Focus",
        outcome: "Done",
        note: "Note",
        notes: "Notes",
        wordCountDelta: 25,
        unitsCompleted: 1,
      };
      retained.create(owner, domain === "work" ? "work.log" : domain, input);
      if (domain !== "coding")
        retained.knowledge(owner, domain, {
          projectId: project.id,
          areaId: project.area_id,
          title: "Knowledge",
          body: "Full canonical knowledge",
          type: "source",
        });
      if (domain === "work") {
        retained.create(owner, "work.decision", {
          projectId: project.id,
          decisionDate: "2026-10-01",
          title: "Decision",
          decision: "Proceed",
          rationale: "Reviewed",
          status: "active",
        });
        const meeting = retained.create(owner, "work.meeting", {
          projectId: project.id,
          meetingDate: "2026-10-01",
          startedAt: "12:30",
          durationMinutes: 30,
          title: "Meeting",
          participants: "Synthetic owner",
          agenda: "Review",
          outcome: "Follow up",
          notes: "Full notes",
        });
        ids.followup = String(
          retained.followup(owner, "create", {
            meetingId: meeting.id,
            title: "Meeting follow up",
          }).task_id,
        );
      }
    }
    retained.create(owner, "entertainment", {
      title: "Book",
      mediaType: "book",
      status: "in_progress",
      completedOn: null,
      startedOn: "2026-10-01",
      creatorOrStudio: "Author",
      releaseYear: 2026,
      rating: 8,
      notes: "Read",
      progressCurrent: "9007199254740993.123456789",
      progressTotal: "9007199254740994.123456789",
      progressUnit: "pages",
    });
    const wishlist = retained.create(owner, "wishlist", wishlistInput);
    retained.create(owner, "purchase", {
      wishlistItemId: wishlist.id,
      decisionDate: "2026-10-01",
      context: "Context",
      criteria: "Useful",
      decision: "Buy",
      rationale: "Reason",
      status: "decided_buy",
    });
    ids.inventory = String(
      retained.convertWishlist(owner, { wishlistItemId: wishlist.id }).id,
    );
    retained.create(owner, "inventory", {
      name: "Exact quantity",
      category: "Items",
      description: null,
      quantity: "9007199254740993.00123456789",
      unit: "units",
      acquiredOn: "2026-10-01",
      location: null,
      condition: "good",
      amount: null,
      currency: null,
    });
    retained.create(owner, "antirot.action", {
      title: "Walk",
      description: "Outside",
      category: "movement",
      energy: "low",
      estimatedMinutes: 10,
    });
    ids.recommendation = retained.rotate(owner);
    retained.resolve(owner, {
      recommendationEventId: ids.recommendation,
      eventType: "completed",
    });
    const challenge = retained.create(owner, "challenge", challengeInput);
    retained.progress(owner, "append", {
      challengeId: challenge.id,
      increment: "1.1234567890123456789",
      note: "Measured",
    });
    ids.credit = retained.completeChallenge(owner, {
      challengeId: challenge.id,
    });
    const shop = retained.create(owner, "shop", {
      title: "Break",
      costCoins: 7,
      description: "Rest",
      category: "Personal",
    });
    ids.redemption = retained.redeem(owner, {
      shopItemId: shop.id,
      requestKey: randomUUID(),
    });
    retained.update(owner, "shop", String(shop.id), {
      title: "Edited after redemption",
      costCoins: 9,
      description: null,
      category: null,
    });
    const task = result(
      await f.tasks.createTask({
        ...scope,
        title: "Carry planning history",
        plannedDate: "2026-10-06",
        scheduledStartAt: at,
      }),
    );
    ids.carry = task.id;
    expect(
      createSqliteTaskStepRepository(f.store, f.context).write("create", {
        taskId: task.id,
        title: "Step",
        position: 0,
      }),
    ).toBe(true);
    result(
      await createSqliteRecurringTaskTemplateRepository(
        f.store,
        f.context,
      ).createRecurringTaskTemplate({
        ...scope,
        title: "Explicit recurrence",
        startsOn: "2026-10-06",
        timezone: "Europe/Berlin",
        recurrenceRule: { frequency: "daily", version: "v1" },
      }),
    );
    const base = createSqliteCanonicalBaseRepository(f.store, f.context);
    const day = base.daily({
      ...scope,
      localDate: "2026-10-06",
      timezone: "Europe/Berlin",
      openingNote: "Synthetic context",
    });
    base.linkDaily({
      ...scope,
      dailyLogId: day.id,
      taskId: task.id,
      role: "planned",
    });
    const predecessor = result(
      await f.tasks.createTask({
        ...scope,
        title: "Predecessor",
        projectId: ids.work,
      }),
    );
    const successor = result(
      await f.tasks.createTask({
        ...scope,
        title: "Successor",
        projectId: ids.work,
      }),
    );
    base.dependency(owner, {
      operation: "add",
      projectId: ids.work,
      taskId: successor.id,
      predecessorId: predecessor.id,
    });
    const stage = base.milestone(owner, {
      projectId: ids.work,
      operation: "save",
      title: "Stage",
      status: "active",
    });
    base.milestone(owner, {
      projectId: ids.work,
      operation: "assign",
      milestoneId: stage,
      taskId: successor.id,
    });
    result(
      await generateRecurringTaskInstancesForDate(
        { ...scope, date: "2026-10-06" },
        {
          tasks: f.tasks,
          recurringTaskTemplates: createSqliteRecurringTaskTemplateRepository(
            f.store,
            f.context,
          ),
        },
      ),
    );
    result(
      await createSqliteInboxRepository(f.store, f.context).createInboxItem({
        ...scope,
        title: "Capture",
        body: "Full synthetic capture",
      }),
    );
    const review = result(
      await f.reviews.saveReview({
        ...daily,
        carryTaskIds: [task.id],
        outcome: "Daily historical outcome",
      }),
    );
    ids.review = review.id;
    expect(
      (
        await f.sources.schedule({
          sourceType: "review",
          sourceId: review.id,
          plannedDate: "2026-10-06",
          scheduledStartAt: at,
          durationMinutes: 30,
        })
      ).error,
    ).toBeNull();
    result(
      await f.reviews.saveReview({
        ...daily,
        carryTaskIds: [task.id],
        outcome: "Daily historical outcome",
        status: "completed",
      }),
    );
    result(
      await f.reviews.saveReview({
        ...daily,
        kind: "weekly",
        periodStart: "2026-10-05",
        periodEnd: "2026-10-11",
        outcome: "Weekly outcome",
        nextPeriodFocus: "Focus",
      }),
    );
    const resource = result(
      await f.resources.createResource({
        ...scope,
        type: "link",
        title: "Primary proof",
        url: "https://example.test/proof",
      }),
    );
    expect(
      await f.artifacts.setProjectResourceRole({
        projectId: f.project,
        resourceId: resource.id,
        role: "primary_artifact",
      }),
    ).toBe(true);
    const second = result(
      await f.resources.createResource({
        ...scope,
        type: "note",
        title: "Additional proof",
        body: "Evidence",
      }),
    );
    expect(
      await f.artifacts.setProjectResourceRole({
        projectId: f.project,
        resourceId: second.id,
        role: "additional_artifact",
      }),
    ).toBe(true);
    const health = createSqliteHealthRepository(f.store, f.context);
    expect(
      await health.addMood(owner, owner, {
        mood: "focused",
        localDate: "2026-10-06",
        timezone: "Europe/Berlin",
      }),
    ).toBe(true);
    expect(
      await health.saveSleep(owner, owner, {
        sleepDate: "2026-10-06",
        durationMinutes: 480,
        quality: 4,
      }),
    ).toBe(true);
    expect(
      await health.saveWeight(owner, owner, {
        measuredOn: "2026-10-06",
        weightKg: 75.25,
      }),
    ).toBe(true);
    expect(
      await health.saveWeightGoal(owner, owner, {
        targetWeightKg: 74.5,
        targetDate: "2026-12-01",
      }),
    ).toBe(true);
    const habits = createSqliteHabitRepository(f.store, f.context);
    const habit = result(
      await habits.createHabit(owner, owner, {
        name: "Walk",
        unit: "minutes",
        window: "Morning",
        sortOrder: 1,
        defaultIncrement: 10,
        dailyTarget: 30,
      }),
    );
    result(await habits.addLog(owner, owner, habit.id));
    const goals = createSqliteGoalOutcomeRepository(f.store, f.context);
    const criterion = result(
      await goals.createGoalCriterion({
        ...scope,
        goalId: f.goal,
        title: "Accepted",
        criterionType: "boolean",
      }),
    );
    const milestone = result(
      await goals.createGoalMilestone({
        ...scope,
        goalId: f.goal,
        title: "Milestone",
        sortOrder: 0,
        status: "planned",
      }),
    );
    const goalCommand = async (
      kind: GoalCommandKind,
      payload: Record<string, unknown>,
    ) =>
      result(
        await goals.executeCommand({
          ...scope,
          kind,
          commandId: randomUUID(),
          requestFingerprint: goalCommandFingerprint(kind, {
            goal_id: f.goal,
            ...payload,
          }),
          payload: { goal_id: f.goal, ...payload },
        }),
      );
    await goalCommand("criterion.evaluate", {
      criterion_id: criterion.id,
      boolean_value: true,
    });
    result(
      await goals.setGoalMilestoneStatus({
        ...scope,
        goalId: f.goal,
        milestoneId: milestone.id,
        status: "active",
      }),
    );
    await goalCommand("milestone.achieve", { milestone_id: milestone.id });
    await goalCommand("goal.achieve", {});
    const projectCommand = (operation: string, payload: unknown) => {
      const c = readSqliteProjectDepth(f.store, f.context, f.project).context;
      return projectDepthCommand(f.store, f.context, {
        projectId: f.project,
        commandId: randomUUID(),
        expectedRevision: c.completion_revision,
        expectedCycle: c.completion_cycle,
        operation,
        payload,
      });
    };
    projectCommand("result.set", { desired_result: "Verified result" });
    projectCommand("criterion.create", {
      text: "Accepted",
      sort_order: "9007199254740993",
    });
    const c = readSqliteProjectDepth(f.store, f.context, f.project).context;
    projectCommand("review.submit", {
      fingerprint: c.fingerprint,
      decision: "completed",
      result_accepted: true,
      rationale: "Verified",
      criteria: c.criteria.map((x) => ({
        id: x.id,
        assessment: "satisfied",
        note: null,
      })),
      archived_ids: [],
      archived_criteria_acknowledged: false,
      evidence: [],
      open_work_acknowledged: false,
    });
    const skillCommand = (operation: string, payload: unknown) =>
      skillDevelopmentCommand(f.store, f.context, {
        operation,
        commandId: randomUUID(),
        skillId: f.skill,
        expectedRevision: readSqliteSkillDevelopment(
          f.store,
          f.context,
          f.skill,
        )!.skill.development_revision,
        payload,
      }) as Record<string, string>;
    const target = skillCommand("target.create", {
      title: "Development",
    }).target_id;
    const skillMilestone = skillCommand("milestone.create", {
      target_id: target,
      title: "Step",
    }).milestone_id;
    const evidence = skillCommand("evidence.create", {
      title: "Evidence",
      evidence_date: "2026-10-06",
      source_type: "manual_note",
      source_id: null,
    }).evidence_id;
    skillCommand("review.submit", {
      target_id: target,
      milestone_id: skillMilestone,
      decision: "completed",
      note: "Reviewed",
      open_milestones_acknowledged: true,
      evidence: [{ id: evidence, revision: 1 }],
    });
    skillCommand("evidence.withdraw", {
      evidence_id: evidence,
      reason: "Withdraw",
    });
    skillCommand("evidence.restore", {
      evidence_id: evidence,
      reason: "Restore",
    });
  } finally {
    f.store.close();
  }
  const before = inspectSyntheticDatabase(f.path);
  expect(canonicalTableNames.filter((t) => !(t in before.counts))).toEqual([]);
  expect(canonicalTableNames).toHaveLength(83);
  for (const table of [
    "journal_entries",
    "coding_sessions",
    "education_logs",
    "work_logs",
    "work_decisions",
    "work_meetings",
    "work_meeting_followups",
    "entertainment_items",
    "wishlist_items",
    "inventory_items",
    "purchase_decisions",
    "anti_rot_actions",
    "anti_rot_events",
    "challenges",
    "challenge_progress_logs",
    "reward_ledger_entries",
    "shop_items",
    "shop_redemptions",
    "goal_command_receipts",
    "goal_achievement_events",
    "goal_milestone_achievement_events",
    "project_command_receipts",
    "project_reviews",
    "skill_command_receipts",
    "skill_evidence_revisions",
    "skill_development_review_evidence",
    "review_task_decisions",
    "habit_logs",
    "sleep_entries",
    "weight_entries",
    "mood_entries",
  ])
    expect(before.counts[table]).toBeGreaterThan(0);
  async function projection(store: SqliteRuntime) {
    const r = createSqliteRetainedRepository(store, f.context);
    const links = store.read(f.context, (db) =>
      db
        .prepare(
          "SELECT l.*,t.status,t.completed_at FROM schedule_source_links l JOIN tasks t ON t.id=l.task_id AND t.user_id=l.user_id WHERE l.user_id=? ORDER BY l.id",
        )
        .all(owner),
    );
    expect(links).toHaveLength(4);
    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source_type: "meal" }),
        expect.objectContaining({ source_type: "review" }),
        expect.objectContaining({ source_type: "running_plan_item" }),
        expect.objectContaining({ source_type: "strength_plan" }),
      ]),
    );
    for (const link of links)
      expect(link).toMatchObject({
        status: "done",
        completed_at: expect.any(String),
      });
    const reward = r.rewardWorkspace(owner);
    expect(reward.balance).toBe(BigInt(3));
    expect(reward.ledger).toHaveLength(2);
    expect(reward.redemptions).toEqual([
      expect.objectContaining({
        id: ids.redemption,
        title_snapshot: "Break",
        cost_coins: BigInt(7),
      }),
    ]);
    expect(
      r.read(owner, "inventory").find((i) => i.id === ids.inventory),
    ).toMatchObject({
      id: ids.inventory,
      acquisition_value: wishlistInput.amount,
    });
    const reviews = createSqliteReviewRepository(store, f.context);
    const decisions = await reviews.getTaskDecisions(owner, ids.review);
    expect(decisions).toMatchObject({
      ok: true,
      data: [
        expect.objectContaining({
          taskId: ids.carry,
          targetDate: "2026-10-07",
        }),
      ],
    });
    const snapshots = store.read(f.context, (db) =>
      db
        .prepare(
          "SELECT original_planned_date,original_scheduled_start_at,planning_snapshot_captured FROM review_task_decisions WHERE user_id=? AND task_id=?",
        )
        .all(owner, ids.carry),
    );
    expect(snapshots).toEqual([
      {
        original_planned_date: "2026-10-06",
        original_scheduled_start_at: at,
        planning_snapshot_captured: BigInt(1),
      },
    ]);
    const base = createSqliteCanonicalBaseRepository(store, f.context);
    return {
      projectDepth: (() => {
        const p = readSqliteProjectDepth(store, f.context, f.project);
        return {
          ...p,
          context: { ...p.context, work_observed_at: "read-clock" },
        };
      })(),
      canonical: {
        profile: base.profile(owner),
        areas: base.read(owner, "areas"),
        daily: base.read(owner, "daily_logs"),
        dayTasks: base.read(owner, "daily_log_tasks"),
        milestones: base.read(owner, "project_milestones"),
        dependencies: base.dependencies(owner),
      },
      reward,
      links,
      decisions,
      snapshots,
      journal: r.read(owner, "journal"),
      entertainment: r.read(owner, "entertainment"),
      inventory: r.read(owner, "inventory"),
      coding: r.workspace(owner, "coding"),
      education: r.workspace(owner, "education"),
      work: r.workspace(owner, "work"),
      life: r.workspace(owner, "life"),
      health: await createSqliteHealthRepository(store, f.context).getSnapshot(
        owner,
        owner,
      ),
      nutrition: await createSqliteNutritionRepository(
        store,
        f.context,
      ).getRecipesByUser(owner, owner),
      training: await createSqliteTrainingRepository(
        store,
        f.context,
      ).getSnapshot(owner),
      skill: {
        ...readSqliteSkillDevelopment(store, f.context, f.skill),
        as_of: "read-clock",
      },
      goal: await createSqliteGoalOutcomeRepository(
        store,
        f.context,
      ).getGoalOutcome({ ...scope, goalId: f.goal }),
    };
  }
  const restarted = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    const original = await projection(restarted);
    expect(inspectSyntheticDatabase(f.path)).toEqual(before);
    const backup = join(f.directory, "all-domain-online.db"),
      restored = join(f.directory, "all-domain-restored.db");
    await restarted.backup(backup);
    expect(inspectSyntheticDatabase(backup)).toEqual(before);
    expect(await restoreSyntheticBackup(backup, restored)).toEqual(before);
    const candidate = new SqliteRuntime(restored, { syntheticProof: true });
    try {
      expect(await projection(candidate)).toEqual(original);
    } finally {
      candidate.close();
    }
  } finally {
    restarted.close();
  }
});
