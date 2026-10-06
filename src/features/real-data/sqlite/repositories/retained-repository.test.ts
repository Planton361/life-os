import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { owner, at } from "../../../../../tests/sqlite/source-review-fixture";
import { createSqliteRetainedRepository } from "./retained-repository";
import { issueOwnerContext, type OwnerContext } from "../owner-context";
import { canonicalTableNames } from "../canonical-catalog";
import { retainedDefinitions, ownedArea } from "../commands/retained-commands";
import {
  retainedFixture,
  wishlistInput,
  challengeInput,
} from "../../../../../tests/sqlite/retained-fixture";
it("has precisely 83 canonical tables, retains readiness zero and canonical project metadata", () => {
  const f = retainedFixture();
  try {
    const tables = f.store.read(f.context, (db) =>
      (
        db
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all() as { name: string }[]
      ).map((x) => x.name),
    );
    expect(canonicalTableNames.filter((t) => !tables.includes(t))).toEqual([]);
    expect(
      tables.filter((t) =>
        canonicalTableNames.includes(t as (typeof canonicalTableNames)[number]),
      ),
    ).toHaveLength(83);
    expect(
      tables.filter(
        (t) =>
          !canonicalTableNames.includes(
            t as (typeof canonicalTableNames)[number],
          ),
      ),
    ).toEqual(["runtime_metadata"]);
    const p = f.retained.project(owner, "coding", {
      title: "Code",
      status: "active",
      repositoryUrl: "https://example.test/repo",
    });
    expect(p.repository_url).toBe("https://example.test/repo");
    const updated = f.retained.project(
      owner,
      "coding",
      {
        title: "Code",
        status: "paused",
        repositoryUrl: "https://example.test/repo",
      },
      String(p.id),
    );
    expect(updated.status).toBe("paused");
    expect(
      f.store.read(f.context, (db) =>
        db.prepare("SELECT compatibility_ready FROM runtime_metadata").get(),
      ),
    ).toEqual({ compatibility_ready: BigInt(0) });
  } finally {
    f.store.close();
  }
});
it("retains full Journal text, chronology, filtering, IDs and archive availability; Life Notes are Resources", () => {
  const f = retainedFixture();
  try {
    const j = f.retained.create(owner, "journal", {
      title: null,
      body: "Full text 🧭 needle",
      entryDate: "2026-10-01",
    });
    f.retained.create(owner, "journal", {
      title: "Latest",
      body: "Entry",
      entryDate: "2026-10-02",
    });
    expect(f.retained.read(owner, "journal")[1].id).toBe(j.id);
    expect(
      f.retained.read(owner, "journal", {
        startDate: "2026-10-01",
        endDate: "2026-10-01",
        search: "needle",
      }),
    ).toHaveLength(1);
    expect(
      f.retained.update(owner, "journal", String(j.id), {
        title: "Edited",
        body: "Preserved full text",
        entryDate: "2026-10-01",
      }).id,
    ).toBe(j.id);
    f.retained.lifecycle(owner, "journal", String(j.id), "archive");
    expect(
      f.retained.read(owner, "journal", { activeOnly: true }),
    ).toHaveLength(1);
    expect(() =>
      f.retained.update(owner, "journal", String(j.id), {
        title: null,
        body: "No",
        entryDate: "2026-10-01",
      }),
    ).toThrow();
    const note = f.retained.lifeNote(owner, "create", {
      title: "Life Note",
      body: "Canonical full body",
    });
    expect(note.type).toBe("note");
    f.retained.lifeNote(owner, "archive", { resourceId: note.id });
    f.retained.lifeNote(owner, "restore", { resourceId: note.id });
    expect(f.retained.workspace(owner, "life").notes).toHaveLength(1);
  } finally {
    f.store.close();
  }
});
it("covers Coding/Education/Work logs, decisions, meetings, atomic Resources and canonical follow-up Tasks", () => {
  const f = retainedFixture();
  try {
    for (const domain of ["coding", "education", "work"] as const) {
      const project = f.retained.project(owner, domain, {
        title: domain,
        status: "active",
      });
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
        wordCountDelta: -5,
        unitsCompleted: 1,
      };
      const kind = domain === "work" ? "work.log" : domain;
      const log = f.retained.create(owner, kind, input);
      expect(
        f.retained.update(owner, kind, String(log.id), {
          ...input,
          outcome: "Updated",
        }).id,
      ).toBe(log.id);
      f.retained.lifecycle(owner, kind, String(log.id), "archive");
      expect(
        f.retained.workspace(owner, domain)[
          domain === "coding" ? "sessions" : "logs"
        ],
      ).toHaveLength(1);
      if (domain === "coding") continue;
      const areaId = f.store.read(f.context, (db) =>
        ownedArea(db, owner, domain),
      );
      const knowledge = {
        projectId: project.id,
        areaId,
        title: "Source",
        body: "Canonical knowledge",
        type: "source",
        url: "https://example.test",
      };
      const resource = f.retained.knowledge(owner, domain, knowledge);
      expect(f.retained.knowledge(owner, domain, knowledge).id).toBe(
        resource.id,
      );
      if (domain === "work") {
        expect(
          f.retained.editWorkWiki(owner, "update", {
            resourceId: resource.id,
            title: "Updated Wiki",
            body: "Full edited body",
          }).id,
        ).toBe(resource.id);
        f.retained.editWorkWiki(owner, "archive", { resourceId: resource.id });
        expect(f.retained.workspace(owner, "work").wiki).toContainEqual(
          expect.objectContaining({
            id: resource.id,
            archived_at: expect.any(String),
          }),
        );
        const decision = f.retained.create(owner, "work.decision", {
          projectId: project.id,
          decisionDate: "2026-10-01",
          title: "Decision",
          decision: "Choose",
          rationale: "Because",
          status: "active",
        });
        expect(decision.status).toBe("active");
        const meeting = f.retained.create(owner, "work.meeting", {
          projectId: project.id,
          meetingDate: "2026-10-01",
          durationMinutes: 30,
          title: "Meeting",
          outcome: "Done",
        });
        const followup = f.retained.followup(owner, "create", {
          meetingId: meeting.id,
          title: "Follow up",
        });
        expect(
          f.retained.followup(owner, "link", {
            meetingId: meeting.id,
            taskId: followup.task_id,
          }).id,
        ).toBe(followup.id);
        expect(
          f.store.read(f.context, (db) =>
            db
              .prepare("SELECT project_id FROM tasks WHERE user_id=? AND id=?")
              .get(owner, followup.task_id),
          ),
        ).toEqual({ project_id: project.id });
        f.retained.followup(owner, "unlink", {
          meetingId: meeting.id,
          relationId: followup.id,
        });
      }
    }
  } finally {
    f.store.close();
  }
});
it("preserves exact Entertainment, Wishlist and Inventory values and idempotent conversion decision linkage", () => {
  const f = retainedFixture();
  try {
    const entertainment = f.retained.create(owner, "entertainment", {
      title: "Read",
      mediaType: "book",
      status: "in_progress",
      completedOn: null,
      startedOn: null,
      creatorOrStudio: null,
      releaseYear: null,
      rating: null,
      notes: null,
      progressCurrent: "9007199254740993.123456789",
      progressTotal: "9007199254740994.123456789",
      progressUnit: "pages",
    });
    expect(entertainment.progress_current).toBe("9007199254740993.123456789");
    expect(() =>
      f.retained.create(owner, "wishlist", {
        ...wishlistInput,
        amount: Number("9007199254740993"),
      }),
    ).toThrow("UNSAFE_NUMERIC_INPUT_USE_EXACT_TEXT");
    const wishlist = f.retained.create(owner, "wishlist", wishlistInput);
    const decision = f.retained.create(owner, "purchase", {
      wishlistItemId: wishlist.id,
      decisionDate: "2026-10-01",
      context: "Context",
      criteria: null,
      decision: "Buy",
      rationale: "Reason",
      status: "decided_buy",
    });
    const inventory = f.retained.convertWishlist(owner, {
      wishlistItemId: wishlist.id,
    });
    expect(inventory.acquisition_value).toBe(wishlistInput.amount);
    expect(
      f.retained.convertWishlist(owner, { wishlistItemId: wishlist.id }).id,
    ).toBe(inventory.id);
    expect(
      f.retained.read(owner, "purchase", { id: String(decision.id) })[0]
        .inventory_item_id,
    ).toBe(inventory.id);
    f.retained.lifecycle(owner, "wishlist", String(wishlist.id), "archive");
    f.retained.lifecycle(owner, "wishlist", String(wishlist.id), "restore");
  } finally {
    f.store.close();
  }
});
it("Anti-Rot appends a deterministic recommendation/resolution chain and creates no coins", () => {
  const f = retainedFixture();
  try {
    const action = f.retained.create(owner, "antirot.action", {
      title: "Walk",
      description: null,
      category: "movement",
      energy: "low",
      estimatedMinutes: 5,
    });
    f.retained.create(owner, "antirot.action", {
      title: "Read",
      description: null,
      category: "learning",
      energy: "low",
      estimatedMinutes: 5,
    });
    const first = f.retained.rotate(owner);
    expect(() =>
      f.retained.lifecycle(
        owner,
        "antirot.action",
        String(action.id),
        "archive",
      ),
    ).toThrow();
    const second = f.retained.rotate(owner);
    const resolution = f.retained.resolve(owner, {
      recommendationEventId: second,
      eventType: "completed",
    });
    expect(
      f.retained.resolve(owner, {
        recommendationEventId: second,
        eventType: "skipped",
      }),
    ).toBe(resolution);
    const workspace = f.retained.rewardWorkspace(owner);
    expect(workspace.events).toHaveLength(4);
    expect(workspace.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recommendation_event_id: first,
          event_type: "skipped",
        }),
      ]),
    );
    expect(workspace.balance).toBe(BigInt(0));
  } finally {
    f.store.close();
  }
});
it("Challenge completion credits once, latest progress only, and Shop atomically debits immutable request snapshots", () => {
  const f = retainedFixture();
  try {
    const challenge = f.retained.create(owner, "challenge", challengeInput);
    const a = f.retained.progress(owner, "append", {
      challengeId: challenge.id,
      increment: "0.1234567890123456789",
      note: null,
    });
    const b = f.retained.progress(owner, "append", {
      challengeId: challenge.id,
      increment: "1",
      note: null,
    });
    expect(() =>
      f.retained.progress(owner, "update", {
        challengeId: challenge.id,
        progressLogId: a.id,
        increment: "2",
        note: null,
      }),
    ).toThrow();
    expect(b.increment).toBe("1");
    const credit = f.retained.completeChallenge(owner, {
      challengeId: challenge.id,
    });
    expect(
      f.retained.completeChallenge(owner, { challengeId: challenge.id }),
    ).toBe(credit);
    const item = f.retained.create(owner, "shop", {
      title: "Break",
      description: null,
      category: null,
      costCoins: 7,
    });
    const request = { shopItemId: item.id, requestKey: randomUUID() };
    const redemption = f.retained.redeem(owner, request);
    expect(f.retained.redeem(owner, request)).toBe(redemption);
    f.retained.update(owner, "shop", String(item.id), {
      title: "New",
      description: null,
      category: null,
      costCoins: 9,
    });
    expect(() =>
      f.retained.redeem(owner, { ...request, requestKey: randomUUID() }),
    ).toThrow();
    const workspace = f.retained.rewardWorkspace(owner);
    expect(workspace.balance).toBe(BigInt(3));
    expect(workspace.ledger).toHaveLength(2);
    expect(workspace.redemptions).toEqual([
      expect.objectContaining({
        title_snapshot: "Break",
        cost_coins: BigInt(7),
      }),
    ]);
  } finally {
    f.store.close();
  }
});
it("denies foreign and forged scopes for every retained domain, command-only histories and incomplete aggregate writes", () => {
  const f = retainedFixture();
  try {
    for (const kind of Object.keys(
      retainedDefinitions,
    ) as (keyof typeof retainedDefinitions)[]) {
      expect(() => f.retained.read(randomUUID(), kind)).toThrow("OWNER_DENIED");
      expect(() => f.retained.create(randomUUID(), kind, {})).toThrow(
        "OWNER_DENIED",
      );
    }
    expect(() =>
      createSqliteRetainedRepository(f.store, {
        ownerId: owner,
      } as OwnerContext),
    ).toThrow();
    expect(() =>
      createSqliteRetainedRepository(
        f.store,
        issueOwnerContext(randomUUID()),
      ).read(owner, "journal"),
    ).toThrow();
    for (const table of [
      "anti_rot_events",
      "reward_ledger_entries",
      "shop_redemptions",
    ])
      expect(() =>
        f.store.command(f.context, "raw.bypass", (db) =>
          db
            .prepare(`INSERT INTO ${table}(id,user_id) VALUES(?,?)`)
            .run(randomUUID(), owner),
        ),
      ).toThrow();
    const challenge = f.retained.create(owner, "challenge", challengeInput);
    expect(() =>
      f.store.command(f.context, "raw.bypass", (db) =>
        db
          .prepare(
            "UPDATE challenges SET status='completed',completed_at=? WHERE user_id=? AND id=?",
          )
          .run(at, owner, challenge.id),
      ),
    ).toThrow();
    expect(() =>
      f.store.command(f.context, "reward.complete", (db) =>
        db
          .prepare(
            "UPDATE challenges SET status='completed',completed_at=? WHERE user_id=? AND id=?",
          )
          .run(at, owner, challenge.id),
      ),
    ).toThrow("CHALLENGE_REWARD_MISSING");
    expect(
      f.retained.read(owner, "challenge", { id: String(challenge.id) })[0]
        .status,
    ).toBe("active");
  } finally {
    f.store.close();
  }
});
