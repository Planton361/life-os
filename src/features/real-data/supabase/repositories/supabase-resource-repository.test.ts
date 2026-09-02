import { describe, expect, it } from "vitest";
import { createSupabaseResourceRepository } from "./supabase-resource-repository";

type Filter = readonly [operator: "eq" | "is", column: string, value: unknown];

function ownedLookupClient(results: Readonly<Record<string, unknown | null>>) {
  const tables: string[] = [];
  const filters: Filter[] = [];

  const client = {
    from(table: string) {
      tables.push(table);
      const chain = {
        eq(column: string, value: unknown) {
          filters.push(["eq", column, value]);
          return chain;
        },
        is(column: string, value: unknown) {
          filters.push(["is", column, value]);
          return chain;
        },
        maybeSingle: async () => ({
          data: results[table] ?? null,
          error: null,
        }),
        select() {
          return chain;
        },
      };

      return chain;
    },
  };

  return { client, filters, tables };
}

const userId = "11111111-1111-4111-8111-111111111111";
const resourceId = "22222222-2222-4222-8222-222222222222";
const skillId = "33333333-3333-4333-8333-333333333333";

describe("SupabaseResourceRepository Resource↔Skill context", () => {
  it("rejects an inaccessible Skill target before it can write a Context link", async () => {
    const { client, filters, tables } = ownedLookupClient({
      resources: { id: resourceId },
      skills: null,
    });
    const repository = createSupabaseResourceRepository(client as never);

    const result = await repository.linkResource({
      profileId: userId,
      relationType: "context",
      resourceId,
      targetId: skillId,
      targetType: "skill",
      userId,
    });

    expect(result).toMatchObject({
      error: { code: "not_found" },
      ok: false,
    });
    expect(tables).toEqual(["resources", "skills"]);
    expect(tables).not.toContain("resource_relations");
    expect(filters).toContainEqual(["eq", "user_id", userId]);
    expect(filters).toContainEqual(["eq", "status", "active"]);
    expect(filters).toContainEqual(["is", "archived_at", null]);
  });

  it("rejects an inaccessible Resource source before it can inspect the Skill", async () => {
    const { client, tables } = ownedLookupClient({ resources: null });
    const repository = createSupabaseResourceRepository(client as never);

    const result = await repository.linkResource({
      profileId: userId,
      relationType: "context",
      resourceId,
      targetId: skillId,
      targetType: "skill",
      userId,
    });

    expect(result).toMatchObject({
      error: { code: "not_found" },
      ok: false,
    });
    expect(tables).toEqual(["resources"]);
  });
});
