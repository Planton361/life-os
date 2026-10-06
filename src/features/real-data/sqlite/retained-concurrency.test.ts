import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { owner } from "../../../../tests/sqlite/source-review-fixture";
import { compileRuntime } from "../../../../tests/sqlite/compile-runtime.mjs";
import {
  retainedFixture,
  wishlistInput,
  challengeInput,
} from "../../../../tests/sqlite/retained-fixture";
const compiled = compileRuntime();
type Reply = {
  ready?: boolean;
  held?: boolean;
  ok?: boolean;
  error?: string;
  result?: string;
};
async function worker(path: string) {
  const child = fork(
    "tests/sqlite/retained-race-worker.mjs",
    [compiled, path, owner],
    { stdio: ["ignore", "ignore", "pipe", "ipc"] },
  );
  const queue: Reply[] = [],
    waiting: ((r: Reply) => void)[] = [];
  let stderr = "",
    exited = false;
  child.stderr?.on("data", (chunk) => {
    stderr += chunk;
  });
  child.on("message", (message) => {
    const waiter = waiting.shift();
    if (waiter) waiter(message as Reply);
    else queue.push(message as Reply);
  });
  const next = () =>
    queue.length
      ? Promise.resolve(queue.shift()!)
      : new Promise<Reply>((resolve, reject) => {
          if (exited) reject(new Error(stderr));
          else {
            waiting.push(resolve);
            child.once("exit", () => {
              if (waiting.includes(resolve))
                reject(new Error(stderr || "Worker exited without response"));
            });
          }
        });
  const exit = new Promise<void>((resolve) =>
    child.once("exit", () => {
      exited = true;
      resolve();
    }),
  );
  expect(await next()).toEqual({ ready: true });
  return { child, next, exit, pending: () => queue.length };
}

async function race(path: string, first: object, second: object) {
  const a = await worker(path),
    b = await worker(path);
  try {
    a.child.send({ ...first, hold: true });
    expect(await a.next()).toEqual({ held: true });
    b.child.send(second);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(b.pending()).toBe(0);
    a.child.send("commit");
    const replies = await Promise.all([a.next(), b.next()]);
    await Promise.all([a.exit, b.exit]);
    return replies;
  } finally {
    for (const w of [a, b])
      if (w.child.exitCode === null && w.child.signalCode === null)
        w.child.kill("SIGKILL");
    await Promise.all([a.exit, b.exit]);
  }
}

it("serializes identical Education literature and Work Wiki retries into one canonical Resource/relation", async () => {
  for (const domain of ["education", "work"] as const) {
    const f = retainedFixture();
    try {
      const project = f.retained.project(owner, domain, {
        title: domain,
        status: "active",
      });
      const areaId = project.area_id;
      const request = {
        operation: "knowledge",
        domain,
        input: {
          projectId: project.id,
          areaId,
          title: "Knowledge",
          body: "Same body",
          type: "source",
        },
      };
      const [a, b] = await race(f.path, request, request);
      expect(a.ok && b.ok).toBe(true);
      expect(a.result).toBe(b.result);
      expect(f.retained.workspace(owner, domain).resources).toHaveLength(1);
    } finally {
      f.store.close();
    }
  }
});
it("concurrent Wishlist conversions preserve one Inventory ID and every Decision link", async () => {
  const f = retainedFixture();
  try {
    const wish = f.retained.create(owner, "wishlist", wishlistInput);
    f.retained.create(owner, "purchase", {
      wishlistItemId: wish.id,
      decisionDate: "2026-10-01",
      context: "Context",
      criteria: null,
      decision: "Buy",
      rationale: "Reason",
      status: "decided_buy",
    });
    const request = {
      operation: "convert",
      input: { wishlistItemId: wish.id },
    };
    const [a, b] = await race(f.path, request, request);
    expect(a.ok && b.ok).toBe(true);
    expect(a.result).toBe(b.result);
    expect(f.retained.read(owner, "inventory")).toHaveLength(1);
    expect(f.retained.read(owner, "purchase")[0].inventory_item_id).toBe(
      a.result,
    );
  } finally {
    f.store.close();
  }
});
it("concurrent Anti-Rot rotation resolves the predecessor and leaves one open recommendation", async () => {
  const f = retainedFixture();
  try {
    for (const title of ["Walk", "Read"])
      f.retained.create(owner, "antirot.action", {
        title,
        description: null,
        category: null,
        energy: null,
        estimatedMinutes: null,
      });
    const [a, b] = await race(
      f.path,
      { operation: "rotate" },
      { operation: "rotate" },
    );
    expect(a.ok && b.ok).toBe(true);
    expect(a.result).not.toBe(b.result);
    const history = f.retained.rewardWorkspace(owner).events as {
      id: string;
      event_type: string;
      action_id: string;
      recommendation_event_id: string | null;
    }[];
    expect(history).toHaveLength(3);
    expect(
      history.find((e) => e.recommendation_event_id === a.result)?.event_type,
    ).toBe("skipped");
    expect(history.find((e) => e.id === a.result)?.action_id).not.toBe(
      history.find((e) => e.id === b.result)?.action_id,
    );
    const [c, d] = await race(
      f.path,
      {
        operation: "resolve",
        input: { recommendationEventId: b.result, eventType: "completed" },
      },
      {
        operation: "resolve",
        input: { recommendationEventId: b.result, eventType: "skipped" },
      },
    );
    expect(c.ok && d.ok).toBe(true);
    expect(c.result).toBe(d.result);
    expect(f.retained.rewardWorkspace(owner).events).toHaveLength(4);
    expect(f.retained.rewardWorkspace(owner).balance).toBe(BigInt(0));
  } finally {
    f.store.close();
  }
});
it("concurrent Challenge completions append one credit with stable receipt identity", async () => {
  const f = retainedFixture();
  try {
    const challenge = f.retained.create(owner, "challenge", challengeInput);
    f.retained.progress(owner, "append", {
      challengeId: challenge.id,
      increment: "2",
      note: null,
    });
    const request = {
      operation: "complete",
      input: { challengeId: challenge.id },
    };
    const [a, b] = await race(f.path, request, request);
    expect(a.ok && b.ok).toBe(true);
    expect(a.result).toBe(b.result);
    expect(f.retained.rewardWorkspace(owner).ledger).toHaveLength(1);
    expect(f.retained.rewardWorkspace(owner).balance).toBe(BigInt(10));
  } finally {
    f.store.close();
  }
});
async function fundedFixture() {
  const f = retainedFixture();
  const challenge = f.retained.create(owner, "challenge", challengeInput);
  f.retained.progress(owner, "append", {
    challengeId: challenge.id,
    increment: "2",
    note: null,
  });
  f.retained.completeChallenge(owner, { challengeId: challenge.id });
  const item = f.retained.create(owner, "shop", {
    title: "Break",
    costCoins: 7,
    category: null,
    description: null,
  });
  return { ...f, item };
}
it("Shop duplicate requests debit once; a request reused for another Item conflicts", async () => {
  const f = await fundedFixture();
  try {
    const request = {
      operation: "redeem",
      input: { shopItemId: f.item.id, requestKey: randomUUID() },
    };
    const [a, b] = await race(f.path, request, request);
    expect(a.ok && b.ok).toBe(true);
    expect(a.result).toBe(b.result);
    const other = f.retained.create(owner, "shop", {
      title: "Other",
      costCoins: 1,
      category: null,
      description: null,
    });
    expect(() =>
      f.retained.redeem(owner, { ...request.input, shopItemId: other.id }),
    ).toThrow("REQUEST_ITEM_CONFLICT");
    expect(f.retained.rewardWorkspace(owner).redemptions).toHaveLength(1);
    expect(f.retained.rewardWorkspace(owner).balance).toBe(BigInt(3));
  } finally {
    f.store.close();
  }
});
it("Shop competing requests cannot overspend shared balance", async () => {
  const f = await fundedFixture();
  try {
    const request = () => ({
      operation: "redeem",
      input: { shopItemId: f.item.id, requestKey: randomUUID() },
    });
    const [a, b] = await race(f.path, request(), request());
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    expect(b.error).toBe("INSUFFICIENT_BALANCE");
    expect(f.retained.rewardWorkspace(owner).redemptions).toHaveLength(1);
    expect(f.retained.rewardWorkspace(owner).ledger).toHaveLength(2);
    expect(f.retained.rewardWorkspace(owner).balance).toBe(BigInt(3));
  } finally {
    f.store.close();
  }
});
it("Shop pause/archive serializes before redemption and leaves no partial debit", async () => {
  for (const operation of ["pause", "archive"]) {
    const f = await fundedFixture();
    try {
      const [a, b] = await race(
        f.path,
        {
          operation,
          input:
            operation === "pause"
              ? { shopItemId: f.item.id, isPaused: true }
              : { id: f.item.id },
        },
        {
          operation: "redeem",
          input: { shopItemId: f.item.id, requestKey: randomUUID() },
        },
      );
      expect(a.ok).toBe(true);
      expect(b.ok).toBe(false);
      expect(b.error).toBe("SHOP_ITEM_UNAVAILABLE");
      expect(f.retained.rewardWorkspace(owner).redemptions).toHaveLength(0);
      expect(f.retained.rewardWorkspace(owner).balance).toBe(BigInt(10));
    } finally {
      f.store.close();
    }
  }
});
it("Meeting follow-up duplicate links serialize into one relation to the same canonical Task", async () => {
  const f = retainedFixture();
  try {
    const project = f.retained.project(owner, "work", {
      title: "Work",
      status: "active",
    });
    const meeting = f.retained.create(owner, "work.meeting", {
      projectId: project.id,
      meetingDate: "2026-10-01",
      durationMinutes: 30,
      title: "Meeting",
      outcome: "Done",
    });
    const created = f.retained.followup(owner, "create", {
      meetingId: meeting.id,
      title: "Follow up",
    });
    f.retained.followup(owner, "unlink", {
      meetingId: meeting.id,
      relationId: created.id,
    });
    const request = {
      operation: "followup",
      kind: "link",
      input: { meetingId: meeting.id, taskId: created.task_id },
    };
    const [a, b] = await race(f.path, request, request);
    expect(a.ok && b.ok).toBe(true);
    expect(a.result).toBe(b.result);
    expect(f.retained.workspace(owner, "work").followups).toHaveLength(1);
    expect(f.retained.workspace(owner, "work").tasks).toHaveLength(1);
  } finally {
    f.store.close();
  }
});
it("Shop same request for different Items conflicts across processes before any second debit", async () => {
  const f = await fundedFixture();
  try {
    const other = f.retained.create(owner, "shop", {
      title: "Other",
      costCoins: 1,
      description: null,
      category: null,
    });
    const key = randomUUID();
    const [a, b] = await race(
      f.path,
      {
        operation: "redeem",
        input: { shopItemId: f.item.id, requestKey: key },
      },
      { operation: "redeem", input: { shopItemId: other.id, requestKey: key } },
    );
    expect(a.ok).toBe(true);
    expect(b.error).toBe("REQUEST_ITEM_CONFLICT");
    expect(f.retained.rewardWorkspace(owner).redemptions).toHaveLength(1);
    expect(f.retained.rewardWorkspace(owner).balance).toBe(BigInt(3));
  } finally {
    f.store.close();
  }
});
