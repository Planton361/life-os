import * as resetPlan from "./preview-reset-plan";
import { populatedAllDomainFixture } from "../../../../tests/sqlite/all-domain-fixture";
import { owner as allDomainOwner } from "../../../../tests/sqlite/source-review-fixture";
import { canonicalTableNames } from "./canonical-catalog";
import { afterEach, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  chmodSync,
  writeFileSync,
  mkdirSync,
  lstatSync,
  linkSync,
  symlinkSync,
} from "node:fs";
import { realpathSync } from "node:fs";
import { tmpdir, hostname } from "node:os";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { bootstrapProductionDatabase } from "./production-bootstrap";
import { SqliteRuntime } from "./runtime";
import { issueOwnerContext, issuePreviewOwnerContext } from "./owner-context";
import { admitPreviewReset } from "./preview-grant";
import { initializeCanonicalSchema } from "./canonical-schema";
import { configureConnection } from "./runtime";
import { upgradePreviewSchemaV9 } from "./preview-upgrade";
import { schemaFingerprint } from "./reset-schema";

const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const fn of cleanup.splice(0).reverse()) fn();
  vi.unstubAllEnvs();
});
function fixture(legacy = false, existing?: { path: string; owner: string }) {
  const root = existing
    ? dirname(existing.path)
    : mkdtempSync(join(realpathSync(tmpdir()), "life-os-142-"));
  chmodSync(root, 0o700);
  const path = existing?.path ?? join(root, "application.db"),
    ownerId = existing?.owner ?? randomUUID();
  if (legacy) {
    writeFileSync(path, "", { mode: 0o600 });
    const db = new Database(path);
    configureConnection(db);
    db.function("life_owner", () => ownerId);
    db.function("life_command", () => "runtime.bootstrap");
    initializeCanonicalSchema(db, { legacyV9: true });
    db.prepare(
      "INSERT INTO runtime_metadata(singleton,schema_version,dataset_kind,owner_id,compatibility_ready) VALUES(1,9,'canonical',?,1)",
    ).run(ownerId);
    db.prepare(
      "INSERT INTO profiles(id,display_name,created_at,updated_at) VALUES(?,'Operator fixture',life_now(),life_now())",
    ).run(ownerId);
    db.prepare(
      "INSERT INTO journal_entries(id,user_id,entry_date,title,body,created_at,updated_at) VALUES(?,?,'2026-10-09','v9 data','Must survive migration',life_now(),life_now())",
    ).run(randomUUID(), ownerId);
    db.pragma("user_version=9");
    db.close();
  } else if (!existing)
    bootstrapProductionDatabase(path, {
      ownerId,
      displayName: "Preview fixture",
      timezone: "Europe/Berlin",
    });
  const release = join(root, "release");
  mkdirSync(release, { mode: 0o700 });
  mkdirSync(join(release, ".next"), { mode: 0o700 });
  writeFileSync(join(release, ".next/BUILD_ID"), "fixture-build");
  writeFileSync(
    join(release, ".next/life-preview-composition.json"),
    JSON.stringify({ version: 2, buildId: "fixture-build" }),
  );
  const identity = lstatSync(path),
    instance = randomUUID(),
    grantPath = join(root, "grant.json");
  const grant = {
    version: 2,
    schema: 10,
    instance,
    host: hostname(),
    uid: process.getuid!(),
    device: identity.dev,
    inode: identity.ino,
    owner: ownerId,
    origin: "https://fixture.ts.net",
    login: "fixture@example.test",
  };
  writeFileSync(grantPath, JSON.stringify(grant), { mode: 0o600 });
  const cwd = vi.spyOn(process, "cwd").mockReturnValue(release);
  const old = globalThis.__lifeOsPreviewLaunch;
  globalThis.__lifeOsPreviewLaunch = {
    releasePath: release,
    grantPath,
    buildId: "fixture-build",
    pid: process.pid,
  };
  cleanup.push(() => {
    cwd.mockRestore();
    globalThis.__lifeOsPreviewLaunch = old;
  });
  const context = issueOwnerContext(ownerId);
  const policy = {
    path,
    owner: ownerId,
    origin: grant.origin,
    login: grant.login,
  };
  return { root, path, ownerId, context, policy, grant, grantPath, identity };
}
function previewFixture() {
  const f = fixture();
  vi.stubEnv("LIFE_OS_BUILD_COMPOSITION", "personal-preview-v2");
  const store = new SqliteRuntime(f.path);
  cleanup.push(() => store.close());
  return {
    ...f,
    store,
    admission: admitPreviewReset(f.policy, "fixture-session"),
  };
}
it("default composition refuses copied grant/flags; forged admission cannot delete", () => {
  const f = fixture();
  vi.stubEnv("LIFE_OS_BUILD_COMPOSITION", "standard");
  expect(() => admitPreviewReset(f.policy, "fixture-session")).toThrow(
    "PREVIEW_COMPOSITION_REQUIRED",
  );
  const store = new SqliteRuntime(f.path);
  cleanup.push(() => store.close());
  expect(() =>
    store.preparePreviewReset(f.context, {
      instance: f.grant.instance,
      session: "fixture-session",
    } as never),
  ).toThrow("PREVIEW_RESET_DENIED");
});
it("one commit preserves profile/schema/inode and receipt survives fresh writes/restart", () => {
  const f = previewFixture();
  const initial = f.store.datasetState(f.context);
  const fresh = issuePreviewOwnerContext(f.ownerId, initial.epoch);
  f.store.command(fresh, "retained.journal", (db) =>
    db
      .prepare(
        "INSERT INTO journal_entries(id,user_id,entry_date,title,body,created_at,updated_at) VALUES(?,?,'2026-10-09','Reset fixture','Unique disposable body',life_now(),life_now())",
      )
      .run(randomUUID(), f.ownerId),
  );
  const schema = f.store.read(f.context, schemaFingerprint),
    profile = f.store.read(f.context, (db) =>
      db.prepare("SELECT * FROM profiles").get(),
    );
  const challenge = f.store.preparePreviewReset(f.context, f.admission);
  const input = { ...challenge, confirmation: "ZURÜCKSETZEN" };
  const receipt = f.store.executePreviewReset(f.context, f.admission, input);
  expect(
    f.store.read(f.context, (db) =>
      db.prepare("SELECT count(*) c FROM journal_entries").get(),
    ),
  ).toEqual({ c: BigInt(0) });
  expect(f.store.read(f.context, schemaFingerprint)).toEqual(schema);
  expect(
    f.store.read(f.context, (db) => db.prepare("SELECT * FROM profiles").get()),
  ).toEqual(profile);
  expect(lstatSync(f.path).ino).toEqual(f.identity.ino);
  expect(() => f.store.command(fresh, "retained.journal", () => null)).toThrow(
    "DATASET_STALE_REFRESH_REQUIRED",
  );
  const current = issuePreviewOwnerContext(f.ownerId, receipt.epoch);
  f.store.command(current, "retained.journal", (db) =>
    db
      .prepare(
        "INSERT INTO journal_entries(id,user_id,entry_date,title,body,created_at,updated_at) VALUES(?,?,'2026-10-09','New data','Must survive replay',life_now(),life_now())",
      )
      .run(randomUUID(), f.ownerId),
  );
  expect(() =>
    f.store.command(current, "preview.reset", (db) =>
      db.prepare("DELETE FROM journal_entries WHERE user_id=?").run(f.ownerId),
    ),
  ).toThrow("RETAINED_ARCHIVE_REQUIRED");
  expect(f.store.executePreviewReset(f.context, f.admission, input)).toEqual(
    receipt,
  );
  f.store.close();
  const restarted = new SqliteRuntime(f.path);
  cleanup.push(() => restarted.close());
  const admission = admitPreviewReset(f.policy, "fixture-session");
  expect(restarted.executePreviewReset(f.context, admission, input)).toEqual(
    receipt,
  );
  expect(
    restarted.read(f.context, (db) =>
      db.prepare("SELECT count(*) c FROM journal_entries").get(),
    ),
  ).toEqual({ c: BigInt(1) });
});
it("revision, expiry, revocation, session and draining deny without changing epoch/receipt", () => {
  const f = previewFixture();
  const before = f.store.datasetState(f.context);
  const c = f.store.preparePreviewReset(f.context, f.admission);
  f.store.command(
    issuePreviewOwnerContext(f.ownerId, before.epoch),
    "test.write",
    () => null,
  );
  expect(() =>
    f.store.executePreviewReset(f.context, f.admission, {
      ...c,
      confirmation: "ZURÜCKSETZEN",
    }),
  ).toThrow("RESET_DATA_CHANGED");
  const expired = f.store.preparePreviewReset(f.context, f.admission);
  const clock = vi.spyOn(Date, "now").mockReturnValue(expired.expires);
  expect(() =>
    f.store.executePreviewReset(f.context, f.admission, {
      ...expired,
      confirmation: "ZURÜCKSETZEN",
    }),
  ).toThrow("RESET_CHALLENGE_INVALID");
  clock.mockRestore();
  const other = admitPreviewReset(f.policy, "other-session"),
    c2 = f.store.preparePreviewReset(f.context, f.admission);
  expect(() =>
    f.store.executePreviewReset(f.context, other, {
      ...c2,
      confirmation: "ZURÜCKSETZEN",
    }),
  ).toThrow("RESET_CHALLENGE_INVALID");
  const c3 = f.store.preparePreviewReset(f.context, f.admission);
  writeFileSync(f.grantPath, JSON.stringify({ ...f.grant, login: "revoked" }));
  expect(() =>
    f.store.executePreviewReset(f.context, f.admission, {
      ...c3,
      confirmation: "ZURÜCKSETZEN",
    }),
  ).toThrow("PREVIEW_GRANT_DENIED");
  writeFileSync(f.grantPath, JSON.stringify(f.grant));
  f.store.stopWrites();
  expect(() => f.store.preparePreviewReset(f.context, f.admission)).toThrow(
    "RESET_UNAVAILABLE",
  );
  expect(f.store.datasetState(f.context).epoch).toEqual(before.epoch);
  expect(
    f.store.previewResetReceipt(f.context, f.admission, c.commandId),
  ).toBeNull();
});
it("v9 forward migration retains identity/data and normal startup never auto-migrates", () => {
  const f = fixture(true);
  expect(() => new SqliteRuntime(f.path)).toThrow(
    "SQLITE_SCHEMA_VERSION_MISMATCH",
  );
  const result = upgradePreviewSchemaV9(f.path);
  expect(result).toEqual({ schema: 10, owner: f.ownerId });
  expect(lstatSync(f.path).ino).toEqual(f.identity.ino);
  const store = new SqliteRuntime(f.path);
  cleanup.push(() => store.close());
  expect(
    store.read(f.context, (db) =>
      db.prepare("SELECT display_name FROM profiles").get(),
    ),
  ).toEqual({ display_name: "Operator fixture" });
  expect(
    store.read(f.context, (db) =>
      db.prepare("SELECT body FROM journal_entries").get(),
    ),
  ).toEqual({ body: "Must survive migration" });
  expect(() => upgradePreviewSchemaV9(f.path)).toThrow();
});

it("deletes the populated all-domain canonical fixture, including all history, with unchanged schema", async () => {
  const all = await populatedAllDomainFixture(true);
  all.store.close();
  const promotion = new Database(all.path);
  promotion
    .prepare(
      "UPDATE runtime_metadata SET dataset_kind='canonical',compatibility_ready=1 WHERE singleton=1",
    )
    .run();
  promotion.close();
  const f = fixture(false, { path: all.path, owner: allDomainOwner });
  vi.stubEnv("LIFE_OS_BUILD_COMPOSITION", "personal-preview-v2");
  const store = new SqliteRuntime(f.path);
  cleanup.push(() => store.close());
  const counts = store.read(f.context, (db) =>
    Object.fromEntries(
      canonicalTableNames.map((table) => [
        table,
        (db.prepare(`SELECT count(*) c FROM ${table}`).get() as { c: bigint })
          .c,
      ]),
    ),
  );
  expect(
    canonicalTableNames.filter((table) => counts[table] === BigInt(0)),
  ).toEqual([]);
  const snapshot = () =>
    store.read(f.context, (db) =>
      JSON.stringify(
        [...canonicalTableNames, "runtime_metadata"].map((table) => [
          table,
          db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
        ]),
        (_, v) => (typeof v === "bigint" ? String(v) : v),
      ),
    );
  const before = snapshot();
  const guarded = store.read(f.context, (db) =>
    db
      .prepare(
        "SELECT name,tbl_name FROM sqlite_schema WHERE type='trigger' AND sql LIKE '%BEFORE DELETE%' AND sql LIKE '%life_preview_reset_admitted%' ORDER BY name",
      )
      .all(),
  ) as { name: string; tbl_name: string }[];
  expect(guarded).toHaveLength(46);
  for (const table of new Set(guarded.map((g) => g.tbl_name))) {
    expect(() =>
      store.command(
        issuePreviewOwnerContext(
          f.ownerId,
          store.datasetState(f.context).epoch,
        ),
        "preview.reset",
        (db) =>
          db.prepare(`DELETE FROM ${table} WHERE user_id=?`).run(f.ownerId),
      ),
    ).toThrow();
    expect(snapshot()).toEqual(before);
  }
  expect(() => new SqliteRuntime(f.path)).toThrow();
  const admission = admitPreviewReset(f.policy, "all-domain-session");
  for (const n of [1, 15, 30, 45, 82]) {
    const original = resetPlan.deletePreviewDataset;
    const injected = vi
      .spyOn(resetPlan, "deletePreviewDataset")
      .mockImplementationOnce((db, owner) => {
        if (n === 82) original(db, owner);
        else
          for (const table of resetPlan.previewResetTables.slice(0, n))
            db.prepare(`DELETE FROM ${table} WHERE user_id=?`).run(owner);
        throw new Error("ISOLATED_INJECTED_STORAGE_FAILURE");
      });
    const attempt = store.preparePreviewReset(f.context, admission);
    expect(() =>
      store.executePreviewReset(f.context, admission, {
        ...attempt,
        confirmation: "ZURÜCKSETZEN",
      }),
    ).toThrow();
    injected.mockRestore();
    expect(snapshot()).toEqual(before);
    expect(
      store.read(f.context, (db) => db.pragma("foreign_key_check")),
    ).toEqual([]);
  }
  for (const fault of ["schema", "profile", "receipt", "revocation"]) {
    let prepareSpy: ReturnType<typeof vi.spyOn> | undefined;
    const original = resetPlan.deletePreviewDataset;
    const injected = vi
      .spyOn(resetPlan, "deletePreviewDataset")
      .mockImplementationOnce((db, owner) => {
        original(db, owner);
        if (fault === "schema")
          db.exec(
            "CREATE INDEX isolated_fault_index ON profiles(display_name)",
          );
        if (fault === "profile")
          db.prepare(
            "UPDATE profiles SET display_name='Unexpected change' WHERE id=?",
          ).run(owner);
        if (fault === "receipt") {
          const prepare = db.prepare.bind(db);
          prepareSpy = vi
            .spyOn(db, "prepare")
            .mockImplementation((sql: string) => {
              if (sql.startsWith("UPDATE runtime_metadata SET dataset_epoch="))
                throw new Error("ISOLATED_RECEIPT_STORAGE_FAILURE");
              return prepare(sql);
            });
        }
        if (fault === "revocation")
          writeFileSync(
            f.grantPath,
            JSON.stringify({ ...f.grant, login: "revoked-during-execute" }),
          );
      });
    const attempt = store.preparePreviewReset(f.context, admission);
    expect(() =>
      store.executePreviewReset(f.context, admission, {
        ...attempt,
        confirmation: "ZURÜCKSETZEN",
      }),
    ).toThrow();
    prepareSpy?.mockRestore();
    injected.mockRestore();
    writeFileSync(f.grantPath, JSON.stringify(f.grant));
    expect(snapshot()).toEqual(before);
  }
  const challenge = store.preparePreviewReset(f.context, admission);
  store.executePreviewReset(f.context, admission, {
    ...challenge,
    confirmation: "ZURÜCKSETZEN",
  });
  for (const table of canonicalTableNames)
    expect(
      store.read(f.context, (db) =>
        db.prepare(`SELECT count(*) c FROM ${table}`).get(),
      ),
    ).toEqual({ c: BigInt(table === "profiles" ? 1 : 0) });
});

it("operator binding denies each mismatched identity and unsafe permission independently", () => {
  const f = previewFixture();
  const before = f.store.datasetState(f.context);
  const variants = [
    { host: "foreign-host" },
    { uid: f.grant.uid + 1 },
    { device: f.grant.device + 1 },
    { inode: f.grant.inode + 1 },
    { owner: randomUUID() },
    { origin: "https://foreign.ts.net" },
    { login: "foreign@example.test" },
    { version: 1 },
    { schema: 9 },
  ];
  for (const change of variants) {
    writeFileSync(f.grantPath, JSON.stringify({ ...f.grant, ...change }));
    expect(() => admitPreviewReset(f.policy, "fixture-session")).toThrow();
    expect(() => f.store.preparePreviewReset(f.context, f.admission)).toThrow();
  }
  writeFileSync(f.grantPath, JSON.stringify(f.grant));
  chmodSync(f.grantPath, 0o644);
  expect(() => admitPreviewReset(f.policy, "fixture-session")).toThrow(
    "PREVIEW_GRANT_DENIED",
  );
  chmodSync(f.grantPath, 0o600);
  chmodSync(f.root, 0o755);
  expect(() => admitPreviewReset(f.policy, "fixture-session")).toThrow(
    "PREVIEW_GRANT_DENIED",
  );
  chmodSync(f.root, 0o700);
  expect(f.store.datasetState(f.context)).toEqual(before);
});

it("two browser sessions cannot commit competing resets against one epoch", () => {
  const f = previewFixture();
  const other = admitPreviewReset(f.policy, "second-browser-session");
  const first = f.store.preparePreviewReset(f.context, f.admission);
  const second = f.store.preparePreviewReset(f.context, other);
  const receipt = f.store.executePreviewReset(f.context, f.admission, {
    ...first,
    confirmation: "ZURÜCKSETZEN",
  });
  const fresh = issuePreviewOwnerContext(f.ownerId, receipt.epoch);
  f.store.command(fresh, "retained.journal", (db) =>
    db
      .prepare(
        "INSERT INTO journal_entries(id,user_id,entry_date,title,body,created_at,updated_at) VALUES(?,?,'2026-10-09','Concurrent new data','Preserve',life_now(),life_now())",
      )
      .run(randomUUID(), f.ownerId),
  );
  expect(() =>
    f.store.executePreviewReset(f.context, other, {
      ...second,
      confirmation: "ZURÜCKSETZEN",
    }),
  ).toThrow("RESET_DATA_CHANGED");
  expect(
    f.store.read(f.context, (db) =>
      db.prepare("SELECT count(*) c FROM journal_entries").get(),
    ),
  ).toEqual({ c: BigInt(1) });
  expect(f.store.datasetState(f.context).epoch).toBe(receipt.epoch);
});

it("symlink/hardlink grants and database hardlinks cannot acquire Preview permission", () => {
  const f = previewFixture();
  const binding = globalThis.__lifeOsPreviewLaunch!;
  const symlink = join(f.root, "symlink-grant.json");
  symlinkSync(f.grantPath, symlink);
  globalThis.__lifeOsPreviewLaunch = { ...binding, grantPath: symlink };
  expect(() => admitPreviewReset(f.policy, "fixture-session")).toThrow(
    "PREVIEW_GRANT_DENIED",
  );
  const hardlink = join(f.root, "hardlink-grant.json");
  linkSync(f.grantPath, hardlink);
  globalThis.__lifeOsPreviewLaunch = { ...binding, grantPath: hardlink };
  expect(() => admitPreviewReset(f.policy, "fixture-session")).toThrow(
    "PREVIEW_GRANT_DENIED",
  );
  const freshGrant = join(f.root, "fresh-grant.json");
  writeFileSync(freshGrant, JSON.stringify(f.grant), { mode: 0o600 });
  globalThis.__lifeOsPreviewLaunch = { ...binding, grantPath: freshGrant };
  expect(() => admitPreviewReset(f.policy, "fixture-session")).not.toThrow();
  linkSync(f.path, join(f.root, "hardlink-database.db"));
  expect(() => admitPreviewReset(f.policy, "fixture-session")).toThrow(
    "PREVIEW_GRANT_DENIED",
  );
});

it("synthetic runtime and foreign-process launch binding cannot become Preview", async () => {
  const all = await populatedAllDomainFixture();
  all.store.close();
  const f = fixture(false, { path: all.path, owner: allDomainOwner });
  vi.stubEnv("LIFE_OS_BUILD_COMPOSITION", "personal-preview-v2");
  expect(() => new SqliteRuntime(f.path, { syntheticProof: true })).toThrow(
    "CANONICAL_PREVIEW_REQUIRED",
  );
  const binding = globalThis.__lifeOsPreviewLaunch!;
  globalThis.__lifeOsPreviewLaunch = { ...binding, pid: process.pid + 1 };
  expect(() => admitPreviewReset(f.policy, "fixture-session")).toThrow(
    "PREVIEW_LAUNCH_REQUIRED",
  );
  globalThis.__lifeOsPreviewLaunch = undefined;
  expect(() => admitPreviewReset(f.policy, "fixture-session")).toThrow(
    "PREVIEW_LAUNCH_REQUIRED",
  );
});
