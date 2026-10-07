import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  sourceReviewFixture,
  scope,
  owner,
  at,
} from "../../../../../tests/sqlite/source-review-fixture";
import { skillDevelopmentCommand } from "./skill-development-repository";
import { projectDepthCommand } from "./project-depth-repository";
import { setProjectResourceRole } from "../commands/resource-commands";
import { configureConnection } from "../runtime";
import { issueOwnerContext, type OwnerContext } from "../owner-context";
import { createSqliteResourceRepository } from "./resource-repository";

it("preserves canonical Resource fields, lifecycle and historical backlinks for every supported target", async () => {
  const f = sourceReviewFixture();
  try {
    const created = await f.resources.createResource({
      ...scope,
      title: "Full text",
      body: "Unicode 🧭 body",
      type: "note",
      areaId: f.area,
      reviewNeeded: true,
      source: "manual",
      url: "/reference.md",
    });
    if (!created.ok) throw new Error(created.error.message);
    const id = created.data.id;
    expect(created.data).toMatchObject({
      body: "Unicode 🧭 body",
      reviewNeeded: true,
      status: "processing",
      areaId: f.area,
      url: "/reference.md",
      source: "manual",
    });
    const other = await f.resources.createResource({
      ...scope,
      title: "Related Resource",
      type: "research",
    });
    const task = await f.tasks.createTask({ ...scope, title: "Related Task" });
    if (!other.ok || !task.ok) throw new Error("Fixture failed");
    for (const [targetType, targetId] of [
      ["project", f.project],
      ["goal", f.goal],
      ["resource", other.data.id],
      ["task", task.data.id],
      ["skill", f.skill],
    ] as const) {
      const input = {
        ...scope,
        resourceId: id,
        targetType,
        targetId,
        relationType: "context" as const,
      };
      const first = await f.resources.linkResource(input);
      expect(first.ok).toBe(true);
      expect(await f.resources.linkResource(input)).toEqual(first);
      const backlinks = await f.resources.getResourceRelationsForTarget(
        owner,
        owner,
        targetType,
        targetId,
      );
      expect(backlinks.ok && backlinks.data).toHaveLength(1);
    }
    expect(
      (
        await f.resources.linkResource({
          ...scope,
          resourceId: id,
          targetType: "skill",
          targetId: f.skill,
          relationType: "evidence",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await f.resources.updateResource({
          ...scope,
          resourceId: id,
          title: "Edited Resource",
          body: "New full text",
          url: "https://example.test/reference",
        })
      ).ok,
    ).toBe(true);
    expect(
      (await f.resources.archiveResource({ ...scope, resourceId: id })).ok,
    ).toBe(true);
    expect(
      (
        await f.resources.updateResource({
          ...scope,
          resourceId: id,
          title: "Unavailable",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await f.resources.linkResource({
          ...scope,
          resourceId: id,
          targetType: "goal",
          targetId: f.goal,
          relationType: "evidence",
        })
      ).ok,
    ).toBe(false);
    const active = await f.resources.getResourcesByUser(owner, owner);
    expect(active.ok && active.data.map((r) => r.id)).not.toContain(id);
    const historical = await f.resources.getResourcesByUser(owner, owner, true);
    expect(
      historical.ok && historical.data.find((r) => r.id === id)?.body,
    ).toBe("New full text");
    const relations = await f.resources.getResourceRelationsForResource(
      owner,
      owner,
      id,
    );
    expect(relations.ok && relations.data).toHaveLength(5);
    expect(() =>
      f.store.command(f.context, "resource.raw", (db) =>
        db
          .prepare(
            "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,created_at) VALUES(?,?,?,'goal',?,?)",
          )
          .run(randomUUID(), owner, id, f.goal, at),
      ),
    ).toThrow("RESOURCE_SOURCE_UNAVAILABLE");
    expect(
      (await f.resources.restoreResource({ ...scope, resourceId: id })).ok,
    ).toBe(true);
    expect(
      (await f.resources.restoreResource({ ...scope, resourceId: id })).ok,
    ).toBe(true);
    skillDevelopmentCommand(f.store, f.context, {
      operation: "skill.edit",
      commandId: randomUUID(),
      skillId: f.skill,
      expectedRevision: "0",
      payload: { status: "paused" },
    });
    expect(
      (
        await f.resources.linkResource({
          ...scope,
          resourceId: other.data.id,
          targetType: "skill",
          targetId: f.skill,
          relationType: "context",
        })
      ).ok,
    ).toBe(false);
    expect(() =>
      f.store.command(f.context, "resource.raw", (db) =>
        db
          .prepare(
            "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,relation_type,created_at) VALUES(?,?,?,'skill',?,'context',?)",
          )
          .run(randomUUID(), owner, other.data.id, f.skill, at),
      ),
    ).toThrow("RESOURCE_TARGET_UNAVAILABLE");
    if (!relations.ok) throw new Error("Missing relations");
    expect(
      (await f.resources.unlinkResource(owner, owner, relations.data[0].id)).ok,
    ).toBe(true);
    expect((await f.resources.getResourcesByUser(randomUUID(), owner)).ok).toBe(
      false,
    );
    expect(
      (
        await f.resources.createResource({
          ...scope,
          areaId: randomUUID(),
          title: "No area",
          type: "note",
        })
      ).ok,
    ).toBe(false);
  } finally {
    f.store.close();
  }
});

it("DB-enforces foreign polymorphic targets, source ownership, roles and issued context", async () => {
  const f = sourceReviewFixture(),
    raw = new Database(f.path),
    foreignOwner = randomUUID();
  let current = foreignOwner,
    marker = "skill.skill.create";
  configureConnection(raw);
  raw.function("life_owner", () => current);
  raw.function("life_command", () => marker);
  try {
    raw
      .prepare("INSERT INTO profiles(id,created_at,updated_at) VALUES(?,?,?)")
      .run(foreignOwner, at, at);
    const foreign: Record<string, string> = {};
    for (const [type, table, column] of [
      ["goal", "goals", "title"],
      ["project", "projects", "title"],
      ["resource", "resources", "title"],
      ["skill", "skills", "name"],
      ["task", "tasks", "title"],
    ]) {
      foreign[type] = randomUUID();
      raw
        .prepare(
          `INSERT INTO ${table}(id,user_id,${column},created_at,updated_at) VALUES(?,?,'Foreign',?,?)`,
        )
        .run(foreign[type], foreignOwner, at, at);
    }
    current = owner;
    marker = "resource.link";
    const created = await f.resources.createResource({
      ...scope,
      title: "Owned Resource",
      type: "note",
    });
    if (!created.ok) throw new Error(created.error.message);
    for (const type of [
      "goal",
      "project",
      "resource",
      "skill",
      "task",
    ] as const) {
      expect(
        (
          await f.resources.linkResource({
            ...scope,
            resourceId: created.data.id,
            targetType: type,
            targetId: foreign[type],
            relationType: "context",
          })
        ).ok,
      ).toBe(false);
      expect(() =>
        raw
          .prepare(
            "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,relation_type,created_at) VALUES(?,?,?,?,?,'context',?)",
          )
          .run(randomUUID(), owner, created.data.id, type, foreign[type], at),
      ).toThrow(/RESOURCE_TARGET_OWNER_DENIED|PROJECT_NOT_FOUND/);
      const target = {
        goal: f.goal,
        project: f.project,
        resource: created.data.id,
        skill: f.skill,
        task: randomUUID(),
      }[type];
      // For Task, create a real owned endpoint to exercise UPDATE independently.
      if (type === "task")
        raw
          .prepare(
            "INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,'Owned Task',?,?)",
          )
          .run(target, owner, at, at);
      const relation = randomUUID();
      raw
        .prepare(
          "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,relation_type,created_at) VALUES(?,?,?,?,?,'context',?)",
        )
        .run(relation, owner, created.data.id, type, target, at);
      expect(() =>
        raw
          .prepare(
            "UPDATE resource_relations SET target_id=? WHERE user_id=? AND id=?",
          )
          .run(foreign[type], owner, relation),
      ).toThrow(/RESOURCE_TARGET_OWNER_DENIED|PROJECT_NOT_FOUND/);
    }
    expect(() =>
      raw
        .prepare(
          "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,created_at) VALUES(?,?,?,'goal',?,?)",
        )
        .run(randomUUID(), owner, foreign.resource, f.goal, at),
    ).toThrow(/FOREIGN KEY/);
    expect(() =>
      raw
        .prepare(
          "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,project_role,created_at) VALUES(?,?,?,'goal',?,'primary_artifact',?)",
        )
        .run(randomUUID(), owner, created.data.id, f.goal, at),
    ).toThrow();
    expect(
      await f.artifacts.setProjectResourceRole({
        projectId: foreign.project,
        resourceId: created.data.id,
        role: "primary_artifact",
      }),
    ).toBe(false);
    expect(
      await f.artifacts.setProjectResourceRole({
        projectId: f.project,
        resourceId: foreign.resource,
        role: "primary_artifact",
      }),
    ).toBe(false);
    expect(() =>
      createSqliteResourceRepository(f.store, {
        ownerId: owner,
      } as OwnerContext),
    ).toThrow("OWNER_CONTEXT_REQUIRED");
    expect(
      (
        await createSqliteResourceRepository(
          f.store,
          issueOwnerContext(foreignOwner),
        ).getResourcesByUser(foreignOwner, foreignOwner)
      ).ok,
    ).toBe(false);
  } finally {
    raw.close();
    f.store.close();
  }
});

it("atomically swaps Primary, retains relation identity and permits only canonical archived demotion/removal", async () => {
  const f = sourceReviewFixture();
  try {
    const resources = await Promise.all(
      ["First artifact", "Second artifact"].map((title) =>
        f.resources.createResource({ ...scope, title, type: "research" }),
      ),
    );
    if (!resources[0].ok || !resources[1].ok) throw new Error("Fixture failed");
    const [first, second] = resources.map((r) => (r.ok ? r.data.id : ""));
    const role = (id: string, value: string) =>
      f.artifacts.setProjectResourceRole({
        projectId: f.project,
        resourceId: id,
        role: value,
      });
    expect(await role(first, "primary_artifact")).toBe(true);
    const rows = () =>
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT id,resource_id,project_role,relation_type FROM resource_relations WHERE user_id=? AND target_type='project' AND target_id=? ORDER BY resource_id",
          )
          .all(owner, f.project),
      ) as {
        id: string;
        resource_id: string;
        project_role: string;
        relation_type: string;
      }[];
    const identity = rows()[0].id;
    const standalone = new Database(f.path);
    try {
      expect(() =>
        setProjectResourceRole(standalone, owner, {
          projectId: f.project,
          resourceId: second,
          role: "primary_artifact",
        }),
      ).toThrow("ATOMIC_TRANSACTION_REQUIRED");
    } finally {
      standalone.close();
    }
    expect(rows()).toEqual([
      {
        id: identity,
        resource_id: first,
        project_role: "primary_artifact",
        relation_type: "context",
      },
    ]);

    // Failure after demotion must restore the former Primary and remove the new edge.
    f.store.command(f.context, "synthetic.failpoint", (db) =>
      db.exec(
        `CREATE TRIGGER test_primary_failure BEFORE UPDATE OF project_role ON resource_relations WHEN NEW.resource_id='${second}' AND NEW.project_role='primary_artifact' BEGIN SELECT RAISE(ABORT,'TEST_PRIMARY_FAILURE'); END;`,
      ),
    );
    expect(await role(second, "primary_artifact")).toBe(false);
    expect(rows()).toEqual([
      {
        id: identity,
        resource_id: first,
        project_role: "primary_artifact",
        relation_type: "context",
      },
    ]);
    f.store.command(f.context, "synthetic.failpoint", (db) =>
      db.exec("DROP TRIGGER test_primary_failure"),
    );
    expect(await role(first, "primary_artifact")).toBe(true);
    expect(rows()[0].id).toBe(identity);
    expect(
      (await f.resources.archiveResource({ ...scope, resourceId: first })).ok,
    ).toBe(true);
    expect(await role(second, "primary_artifact")).toBe(true);
    expect(rows().find((r) => r.resource_id === first)).toMatchObject({
      id: identity,
      project_role: "additional_artifact",
    });
    expect(
      rows().filter((r) => r.project_role === "primary_artifact"),
    ).toHaveLength(1);
    expect(
      (await f.resources.restoreResource({ ...scope, resourceId: first })).ok,
    ).toBe(true);
    expect(() =>
      f.store.command(f.context, "resource.raw", (db) =>
        db
          .prepare(
            "UPDATE resource_relations SET project_role='primary_artifact' WHERE user_id=? AND id=?",
          )
          .run(owner, identity),
      ),
    ).toThrow(/UNIQUE/);
    expect(await role(randomUUID(), "primary_artifact")).toBe(false);
    expect(rows().find((r) => r.resource_id === second)?.project_role).toBe(
      "primary_artifact",
    );
    expect(
      f.artifacts
        .readProjectResourceUses(f.project)
        .map((use) => ({ id: use.resource.id, role: use.role }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    ).toEqual(
      [
        { id: first, role: "additional_artifact" },
        { id: second, role: "primary_artifact" },
      ].sort((a, b) => a.id.localeCompare(b.id)),
    );
    expect(() => f.artifacts.readProjectResourceUses(randomUUID())).toThrow(
      "ARTIFACT_PROJECT_UNAVAILABLE",
    );
    projectDepthCommand(f.store, f.context, {
      projectId: f.project,
      commandId: randomUUID(),
      operation: "project.archive",
      expectedRevision: "0",
      expectedCycle: "0",
      payload: {},
    });
    expect(await role(first, "reference")).toBe(false);
    expect(await role(first, "remove")).toBe(true);
    expect(rows()).toHaveLength(1);
  } finally {
    f.store.close();
  }
});
