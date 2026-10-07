import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  retainedFixture,
  challengeInput,
} from "../../../../../tests/sqlite/retained-fixture";
import { owner, at } from "../../../../../tests/sqlite/source-review-fixture";
import { configureConnection } from "../runtime";
import { insert } from "../commands/nutrition-commands";
import {
  createKnowledgeResource,
  meetingFollowup,
} from "../commands/retained-commands";
it("DB guards reject actual foreign parents across every retained family", () => {
  const f = retainedFixture(),
    foreign = randomUUID();
  const ids = Object.fromEntries(
    [
      "project",
      "area",
      "meeting",
      "task",
      "wishlist",
      "inventory",
      "challenge",
      "action",
      "item",
    ].map((k) => [k, randomUUID()]),
  );
  const db = new Database(f.path);
  try {
    configureConnection(db);
    db.function("life_owner", () => foreign);
    db.function("life_command", () => "retained.write");
    db.transaction(() => {
      db.prepare(
        "INSERT INTO profiles(id,created_at,updated_at) VALUES(?,?,?)",
      ).run(foreign, at, at);
      insert(db, "areas", foreign, {
        id: ids.area,
        user_id: foreign,
        key: "work",
        name: "Work",
        created_at: at,
        updated_at: at,
      });
      insert(db, "projects", foreign, {
        id: ids.project,
        user_id: foreign,
        area_id: ids.area,
        title: "Foreign",
        status: "active",
        created_at: at,
        updated_at: at,
      });
      insert(db, "tasks", foreign, {
        id: ids.task,
        user_id: foreign,
        title: "Foreign",
        created_at: at,
        updated_at: at,
      });
      insert(db, "work_meetings", foreign, {
        id: ids.meeting,
        user_id: foreign,
        project_id: ids.project,
        meeting_date: "2026-10-01",
        duration_minutes: 30,
        title: "Foreign",
        outcome: "Done",
      });
      insert(db, "wishlist_items", foreign, {
        id: ids.wishlist,
        user_id: foreign,
        title: "Foreign",
        category: "Item",
      });
      insert(db, "inventory_items", foreign, {
        id: ids.inventory,
        user_id: foreign,
        name: "Foreign",
        category: "Item",
      });
      insert(db, "challenges", foreign, {
        id: ids.challenge,
        user_id: foreign,
        title: "Foreign",
        period_type: "daily",
        start_date: "2026-10-01",
        end_date: "2026-10-01",
        target_value: "1",
        unit: "sessions",
        reward_coins: 10,
      });
      insert(db, "anti_rot_actions", foreign, {
        id: ids.action,
        user_id: foreign,
        title: "Foreign",
      });
      insert(db, "shop_items", foreign, {
        id: ids.item,
        user_id: foreign,
        title: "Foreign",
        cost_coins: 1,
      });
    }).immediate();
  } finally {
    db.close();
  }
  try {
    const attempts: [string, string, Record<string, string | number | null>][] =
      [
        [
          "coding_sessions",
          "retained.write",
          {
            project_id: ids.project,
            session_date: "2026-10-01",
            duration_minutes: 30,
            activity: "Code",
            outcome: "Done",
          },
        ],
        [
          "education_logs",
          "retained.write",
          {
            project_id: ids.project,
            log_date: "2026-10-01",
            log_type: "learning",
            duration_minutes: 30,
            focus: "Focus",
            outcome: "Done",
          },
        ],
        [
          "work_logs",
          "retained.write",
          {
            project_id: ids.project,
            log_date: "2026-10-01",
            duration_minutes: 30,
            focus: "Focus",
            outcome: "Done",
          },
        ],
        [
          "work_decisions",
          "retained.write",
          {
            project_id: ids.project,
            decision_date: "2026-10-01",
            title: "Title",
            decision: "Decide",
          },
        ],
        [
          "work_meetings",
          "retained.write",
          {
            project_id: ids.project,
            meeting_date: "2026-10-01",
            duration_minutes: 30,
            title: "Title",
            outcome: "Done",
          },
        ],
        [
          "work_meeting_followups",
          "retained.followup",
          { meeting_id: ids.meeting, task_id: ids.task },
        ],
        [
          "inventory_items",
          "retained.write",
          {
            source_wishlist_item_id: ids.wishlist,
            name: "Title",
            category: "Item",
          },
        ],
        [
          "purchase_decisions",
          "retained.write",
          {
            wishlist_item_id: ids.wishlist,
            inventory_item_id: ids.inventory,
            decision_date: "2026-10-01",
            context: "Context",
            decision: "Buy",
            rationale: "Reason",
          },
        ],
        [
          "challenge_progress_logs",
          "reward.progress",
          { challenge_id: ids.challenge, increment: "1" },
        ],
        [
          "anti_rot_events",
          "reward.antirot",
          {
            action_id: ids.action,
            event_type: "recommended",
            recommendation_event_id: null,
          },
        ],
        [
          "shop_redemptions",
          "reward.redeem",
          {
            shop_item_id: ids.item,
            title_snapshot: "Foreign",
            cost_coins: 1,
            request_key: randomUUID(),
          },
        ],
        [
          "reward_ledger_entries",
          "reward.complete",
          {
            source_id: ids.challenge,
            source_type: "challenge",
            entry_type: "challenge_reward",
            amount: 10,
            description: "Foreign",
          },
        ],
      ];
    for (const [table, command, values] of attempts)
      expect(() =>
        f.store.command(f.context, command, (connection) =>
          insert(connection, table, owner, {
            id: randomUUID(),
            user_id: owner,
            ...values,
            ...(table === "coding_sessions"
              ? { created_at: at, updated_at: at }
              : {}),
          }),
        ),
      ).toThrow(/DENIED|ANTI_ROT_ROTATION_REQUIRED/);
  } finally {
    f.store.close();
  }
});
it("injected Resource relation and Meeting follow-up failures roll back their newly created parents", () => {
  const f = retainedFixture();
  try {
    const project = f.retained.project(owner, "education", {
      title: "Education",
      status: "active",
    });
    f.store.command(f.context, "synthetic.fail", (db) =>
      db.exec(
        "CREATE TRIGGER injected_resource_failure BEFORE INSERT ON resource_relations BEGIN SELECT RAISE(ABORT,'INJECTED_FAILURE'); END",
      ),
    );
    expect(() =>
      f.store.command(f.context, "retained.knowledge", (db) =>
        createKnowledgeResource(db, owner, "education", {
          areaId: project.area_id,
          projectId: project.id,
          title: "Literature",
          type: "source",
        }),
      ),
    ).toThrow("INJECTED_FAILURE");
    expect(f.retained.workspace(owner, "education").resources).toHaveLength(0);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare("SELECT COUNT(*) n FROM resources WHERE user_id=?")
          .get(owner),
      ),
    ).toEqual({ n: BigInt(0) });
    f.store.command(f.context, "synthetic.fail", (db) =>
      db.exec("DROP TRIGGER injected_resource_failure"),
    );
    const workProject = f.retained.project(owner, "work", {
      title: "Work",
      status: "active",
    });
    const meeting = f.retained.create(owner, "work.meeting", {
      projectId: workProject.id,
      meetingDate: "2026-10-01",
      durationMinutes: 30,
      title: "Meeting",
      outcome: "Done",
    });
    f.store.command(f.context, "synthetic.fail", (db) =>
      db.exec(
        "CREATE TRIGGER injected_followup_failure BEFORE INSERT ON work_meeting_followups BEGIN SELECT RAISE(ABORT,'INJECTED_FAILURE'); END",
      ),
    );
    expect(() =>
      f.store.command(f.context, "retained.followup", (db) =>
        meetingFollowup(db, owner, "create", {
          meetingId: meeting.id,
          title: "Follow up",
        }),
      ),
    ).toThrow("INJECTED_FAILURE");
    expect(f.retained.workspace(owner, "work").tasks).toHaveLength(0);
  } finally {
    f.store.close();
  }
});
it("append-only histories deny native UPDATE/DELETE and failed Shop debit rolls back the Redemption", () => {
  const f = retainedFixture();
  try {
    const challenge = f.retained.create(owner, "challenge", challengeInput);
    f.retained.progress(owner, "append", {
      challengeId: challenge.id,
      increment: "2",
      note: null,
    });
    f.retained.completeChallenge(owner, { challengeId: challenge.id });
    f.retained.create(owner, "antirot.action", {
      title: "Walk",
      description: null,
      category: null,
      energy: null,
      estimatedMinutes: null,
    });
    const recommendation = f.retained.rotate(owner);
    f.retained.resolve(owner, {
      recommendationEventId: recommendation,
      eventType: "completed",
    });
    const item = f.retained.create(owner, "shop", {
      title: "Break",
      costCoins: 7,
      description: null,
      category: null,
    });
    f.store.command(f.context, "synthetic.fail", (db) =>
      db.exec(
        "CREATE TRIGGER injected_debit_failure BEFORE INSERT ON reward_ledger_entries WHEN NEW.entry_type='shop_redemption' BEGIN SELECT RAISE(ABORT,'INJECTED_FAILURE'); END",
      ),
    );
    expect(() =>
      f.retained.redeem(owner, {
        shopItemId: item.id,
        requestKey: randomUUID(),
      }),
    ).toThrow("INJECTED_FAILURE");
    expect(f.retained.rewardWorkspace(owner).balance).toBe(BigInt(10));
    expect(f.retained.rewardWorkspace(owner).redemptions).toHaveLength(0);
    f.store.command(f.context, "synthetic.fail", (db) =>
      db.exec("DROP TRIGGER injected_debit_failure"),
    );
    f.retained.redeem(owner, { shopItemId: item.id, requestKey: randomUUID() });
    for (const table of [
      "anti_rot_events",
      "reward_ledger_entries",
      "shop_redemptions",
    ])
      for (const sql of [
        `UPDATE ${table} SET id=id WHERE user_id=?`,
        `DELETE FROM ${table} WHERE user_id=?`,
      ])
        expect(() =>
          f.store.command(f.context, "raw.bypass", (db) =>
            db.prepare(sql).run(owner),
          ),
        ).toThrow("RETAINED_HISTORY_IMMUTABLE");
  } finally {
    f.store.close();
  }
});
