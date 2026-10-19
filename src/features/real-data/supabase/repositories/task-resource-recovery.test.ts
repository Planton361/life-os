import { expect, it } from "vitest";
import { createSupabaseResourceRepository } from "./supabase-resource-repository";

// Existing adapter contract, no server/database/service credentials.
function fixture() {
  let resource: Record<string, unknown> | null = null;
  let relation: Record<string, unknown> | null = null;
  let insertCount = 0;
  let failLink = true;
  let parentArchived = false;
  let sourceOwned = false;
  const client = {
    from(table: string) {
      let insert: Record<string, unknown> | null = null;
      const chain = {
        eq: () => chain,
        is: () => chain,
        neq: () => chain,
        select: () => chain,
        insert(value: Record<string, unknown>) {
          insert = value;
          return chain;
        },
        async maybeSingle() {
          return {
            error: null,
            data:
              table === "resources"
                ? resource
                : table === "tasks"
                  ? { id: taskId, project_id: projectId }
                  : table === "projects"
                    ? parentArchived
                      ? null
                      : { id: projectId }
                    : table === "schedule_source_links"
                      ? sourceOwned
                        ? { id: taskId }
                        : null
                      : relation,
          };
        },
        async single() {
          if (table === "resources") {
            insertCount++;
            resource = {
              summary: null,
              url: null,
              ...insert,
              archived_at: null,
            };
            return { data: resource, error: null };
          }
          if (failLink)
            return {
              data: null,
              error: { message: "Injected relation failure" },
            };
          relation = { ...insert, id: resourceId };
          return { data: relation, error: null };
        },
      };
      return chain;
    },
  };
  return {
    repo: createSupabaseResourceRepository(client as never),
    count: () => insertCount,
    allowLink: () => {
      failLink = false;
    },
    archiveParent: () => {
      parentArchived = true;
    },
    source: () => {
      sourceOwned = true;
    },
  };
}
const owner = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
const resourceId = "44444444-4444-4444-8444-444444444444";
const input = {
  userId: owner,
  profileId: owner,
  taskId,
  resourceId,
  draft: { type: "note" as const, body: "Retained draft" },
};

it("reports an unlinked Resource truthfully and retries the same Resource without duplication", async () => {
  const f = fixture();
  expect(await f.repo.createTaskResource(input)).toEqual({
    ok: true,
    data: { resourceId, linked: false },
  });
  expect(f.count()).toBe(1);
  f.allowLink();
  expect(await f.repo.createTaskResource(input)).toEqual({
    ok: true,
    data: { resourceId, linked: true },
  });
  expect(await f.repo.createTaskResource(input)).toEqual({
    ok: true,
    data: { resourceId, linked: true },
  });
  expect(f.count()).toBe(1);
  expect(
    (
      await f.repo.createTaskResource({
        ...input,
        draft: { type: "note", body: "Changed draft" },
      })
    ).ok,
  ).toBe(false);
});

it("denies source-owned/archived-parent Tasks before Resource creation and preserves a pending Resource after archive", async () => {
  for (const lock of ["archiveParent", "source"] as const) {
    const f = fixture();
    f[lock]();
    expect((await f.repo.createTaskResource(input)).ok).toBe(false);
    expect(f.count()).toBe(0);
  }
  const f = fixture();
  await f.repo.createTaskResource(input);
  f.archiveParent();
  f.allowLink();
  expect(await f.repo.createTaskResource(input)).toEqual({
    ok: true,
    data: { resourceId, linked: false },
  });
  expect(f.count()).toBe(1);
});
