import { describe, expect, it } from "vitest";
import { createSupabaseProjectRepository } from "./supabase-project-repository";
import { createSupabaseSkillRepository } from "./supabase-skill-repository";

type Filter = readonly [column: string, value: unknown];

function scopedLookupClient(results: Readonly<Record<string, unknown | null>>) {
  const filters: Filter[] = [];
  const tables: string[] = [];
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
        maybeSingle: async () => ({ data: results[table] ?? null, error: null }),
        neq() {
          return chain;
        },
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
const taskId = "22222222-2222-4222-8222-222222222222";
const skillId = "33333333-3333-4333-8333-333333333333";
const goalId = "44444444-4444-4444-8444-444444444444";

describe("C1 core work graph ownership boundaries", () => {
  it.each([
    {
      label: "Task",
      results: { skills: { id: skillId }, tasks: null },
    },
    {
      label: "Skill",
      results: { skills: null, tasks: { id: taskId } },
    },
  ])("rejects a non-owned active $label before Task↔Skill persistence", async ({ results }) => {
    const { client, filters, tables } = scopedLookupClient(results);
    const repository = createSupabaseSkillRepository(client as never);

    const result = await repository.linkTaskSkill({ skillId, taskId, userId });

    expect(result).toMatchObject({ error: { code: "not_found" }, ok: false });
    expect(tables).toHaveLength(2);
    expect(tables).toEqual(expect.arrayContaining(["tasks", "skills"]));
    expect(tables).not.toContain("task_skill_links");
    expect(filters).toContainEqual(["user_id", userId]);
  });

  it("rejects a non-owned Goal before Project↔Goal persistence", async () => {
    const { client, filters, tables } = scopedLookupClient({ goals: null });
    const repository = createSupabaseProjectRepository(client as never);

    const result = await repository.createProject({
      goalId,
      profileId: userId,
      title: "Technical project",
      userId,
    });

    expect(result).toMatchObject({ error: { code: "not_found" }, ok: false });
    expect(tables).toEqual(["goals"]);
    expect(filters).toContainEqual(["user_id", userId]);
    expect(filters).toContainEqual(["id", goalId]);
  });
});
