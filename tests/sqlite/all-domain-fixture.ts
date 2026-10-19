import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import {
  goalCommandFingerprint,
  type GoalCommandKind,
} from "../../src/features/real-data/sqlite/commands/goal-commands";
import { ownedArea } from "../../src/features/real-data/sqlite/commands/retained-commands";
import { createSqliteCanonicalBaseRepository } from "../../src/features/real-data/sqlite/repositories/canonical-base-repository";
import { createSqliteGoalOutcomeRepository } from "../../src/features/real-data/sqlite/repositories/goal-outcome-repository";
import { createSqliteHabitRepository } from "../../src/features/real-data/sqlite/repositories/habit-repository";
import { createSqliteHealthRepository } from "../../src/features/real-data/sqlite/repositories/health-repository";
import { createSqliteInboxRepository } from "../../src/features/real-data/sqlite/repositories/inbox-repository";
import {
  projectDepthCommand,
  readSqliteProjectDepth,
} from "../../src/features/real-data/sqlite/repositories/project-depth-repository";
import { createSqliteRecurringTaskTemplateRepository } from "../../src/features/real-data/sqlite/repositories/recurring-task-template-repository";
import { createSqliteRetainedRepository } from "../../src/features/real-data/sqlite/repositories/retained-repository";
import {
  readSqliteSkillDevelopment,
  skillDevelopmentCommand,
} from "../../src/features/real-data/sqlite/repositories/skill-development-repository";
import { createSqliteTaskStepRepository } from "../../src/features/real-data/sqlite/repositories/task-step-repository";
import { generateRecurringTaskInstancesForDate } from "../../src/features/real-data/use-cases/recurring-task-generation";
import {
  populatedNutritionTrainingFixture,
  result,
} from "./nutrition-training-fixture";
import { challengeInput, wishlistInput } from "./retained-fixture";
import { at, daily, owner, scope } from "./source-review-fixture";

export async function populatedAllDomainFixture(fullReset = false) {
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
    if (fullReset) {
      f.store.command(f.context, "project.edit", (db) =>
        db
          .prepare("UPDATE projects SET goal_id=? WHERE user_id=? AND id=?")
          .run(f.goal, owner, f.project),
      );
      f.store.command(f.context, "task.edit", (db) =>
        db
          .prepare("UPDATE tasks SET goal_id=? WHERE user_id=? AND id=?")
          .run(f.goal, owner, task.id),
      );
      result(
        await goals.addGoalProjectSupport({
          ...scope,
          goalId: f.goal,
          goalMilestoneId: milestone.id,
          projectId: f.project,
        }),
      );
      result(
        await goals.addGoalTaskSupport({
          ...scope,
          goalId: f.goal,
          goalMilestoneId: milestone.id,
          taskId: task.id,
        }),
      );
      f.store.command(f.context, "skill.link", (db) =>
        db
          .prepare(
            "INSERT INTO task_skill_links(user_id,task_id,skill_id) VALUES(?,?,?)",
          )
          .run(owner, task.id, f.skill),
      );
    }
    let evaluation = await goalCommand("criterion.evaluate", {
      criterion_id: criterion.id,
      boolean_value: true,
    });
    if (fullReset) {
      await goalCommand("criterion.evidence", { evaluation_id: evaluation.evaluation_id, references: [{ source_type: "resource", source_id: second.id }] });
      const prior = f.store.read(f.context, db => db.prepare("SELECT id FROM goal_criterion_evaluation_evidence WHERE user_id=?").get(owner)) as { id: string };
      await goalCommand("criterion.evidence", { evaluation_id: evaluation.evaluation_id, action: "withdrawn", references: [{ supersedes_reference_id: prior.id, reason: "Disposable self-reference" }] });
      evaluation = await goalCommand("criterion.correct", { criterion_id: criterion.id, boolean_value: true, expected_latest_evaluation_id: evaluation.evaluation_id, correction_reason: "Disposable corrected evaluation" });
    }
    result(
      await goals.setGoalMilestoneStatus({
        ...scope,
        goalId: f.goal,
        milestoneId: milestone.id,
        status: "active",
      }),
    );
    let milestoneEvent = await goalCommand("milestone.achieve", {
      milestone_id: milestone.id,
    });
    if (fullReset) milestoneEvent = await goalCommand("milestone.amend", { milestone_id: milestone.id, event_id: milestoneEvent.event_id, correction_reason: "Disposable correction", note: "Corrected milestone" });
    let goalEvent = await goalCommand("goal.achieve", {});
    if (fullReset) goalEvent = await goalCommand("goal.amend", { event_id: goalEvent.event_id, correction_reason: "Disposable correction", achievement_note: "Corrected goal" });
    if (fullReset) {
      const references = [{ source_type: "resource", source_id: second.id }];
      await goalCommand("criterion.evidence", {
        evaluation_id: evaluation.evaluation_id,
        references,
      });
      await goalCommand("milestone.evidence", {
        milestone_id: milestone.id,
        achievement_event_id: milestoneEvent.event_id,
        references,
      });
      await goalCommand("goal.evidence", {
        achievement_event_id: goalEvent.event_id,
        references,
      });
      for (const [kind, table, target] of [
        ["milestone.evidence", "goal_milestone_achievement_evidence", { milestone_id: milestone.id, achievement_event_id: milestoneEvent.event_id }],
        ["goal.evidence", "goal_achievement_evidence", { achievement_event_id: goalEvent.event_id }],
      ] as const) {
        const prior = f.store.read(f.context, db => db.prepare(`SELECT id FROM ${table} WHERE user_id=?`).get(owner)) as { id: string };
        await goalCommand(kind, { ...target, action: "withdrawn", references: [{ supersedes_reference_id: prior.id, reason: "Disposable self-reference" }] });
      }
    }
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
    const projectReview = projectCommand("review.submit", {
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
      evidence: fullReset
        ? [
            {
              relation_id: c.resources[0].relation_id,
              criterion_id: null,
              token: c.resources[0].token,
            },
          ]
        : [],
      open_work_acknowledged: false,
    });
    if (fullReset) {
      projectCommand("review.amend", {
        review_id: projectReview.review_id,
        kind: "clarification",
        review_resource_id: null,
        reason: "Disposable review clarification",
      });
      projectCommand("project.reopen", {
        reason: "Disposable reopened project",
        mistaken_completion: false,
      });
    }
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
    const skillReview = skillCommand("review.submit", {
      target_id: target,
      milestone_id: skillMilestone,
      decision: "completed",
      note: "Reviewed",
      open_milestones_acknowledged: true,
      evidence: [{ id: evidence, revision: 1 }],
    });
    if (fullReset)
      skillCommand("review.amend", {
        review_id: skillReview.review_id,
        kind: "clarification",
        note: "Disposable clarification",
      });
    skillCommand("evidence.withdraw", {
      evidence_id: evidence,
      reason: "Withdraw",
    });
    skillCommand("evidence.restore", {
      evidence_id: evidence,
      reason: "Restore",
    });
  } catch (error) {
    f.store.close();
    throw error;
  }
  return { ...f, ids };
}
