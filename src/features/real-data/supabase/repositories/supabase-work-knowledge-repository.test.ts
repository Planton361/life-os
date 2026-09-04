import { describe, expect, it } from "vitest";

import { createSupabaseWorkKnowledgeRepository } from "./supabase-work-knowledge-repository";

const userId = "11111111-1111-4111-8111-111111111111";
const areaId = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
const resourceId = "44444444-4444-4444-8444-444444444444";

function workAreaClient(rpcResult: { data: unknown; error: unknown }) {
  const calls: Array<{ args: unknown; name: string }> = [];
  const client = {
    from() {
      const chain = {
        eq() { return chain; },
        is() { return chain; },
        maybeSingle: async () => ({ data: { id: areaId }, error: null }),
        select() { return chain; },
      };
      return chain;
    },
    rpc: async (name: string, args: unknown) => {
      calls.push({ args, name });
      return rpcResult;
    },
  };
  return { calls, client };
}

describe("SupabaseWorkKnowledgeRepository createWiki", () => {
  it("uses the one Work-specific create-and-link RPC", async () => {
    const { calls, client } = workAreaClient({
      data: {
        archived_at: null,
        area_id: areaId,
        created_at: "2026-09-04T00:00:00.000Z",
        id: resourceId,
        review_needed: false,
        source: null,
        summary: "Canonical work context.",
        title: "Atomic work wiki",
        type: "note",
        updated_at: "2026-09-04T00:00:00.000Z",
        url: null,
        user_id: userId,
      },
      error: null,
    });
    const result = await createSupabaseWorkKnowledgeRepository(client as never)
      .createWiki(userId, {
        body: "Canonical work context.",
        projectId,
        title: "Atomic work wiki",
      });

    expect(result).toEqual({ data: { id: resourceId }, ok: true });
    expect(calls).toEqual([
      {
        args: {
          p_area_id: areaId,
          p_body: "Canonical work context.",
          p_project_id: projectId,
          p_title: "Atomic work wiki",
        },
        name: "create_work_wiki_resource",
      },
    ]);
  });

  it("does not surface success when the transactional boundary rejects its Project", async () => {
    const { client } = workAreaClient({
      data: null,
      error: { message: "Work project not found" },
    });
    const result = await createSupabaseWorkKnowledgeRepository(client as never)
      .createWiki(userId, {
        body: "Canonical work context.",
        projectId,
        title: "Atomic work wiki",
      });

    expect(result).toEqual({ error: "Work wiki create failed.", ok: false });
  });
});
