import { describe, expect, it } from "vitest";

import { createSupabaseEducationRepository } from "./supabase-education-repository";

const userId = "11111111-1111-4111-8111-111111111111";
const areaId = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";

const resourceRow = {
  archived_at: null,
  area_id: areaId,
  created_at: "2026-09-04T00:00:00.000Z",
  id: "44444444-4444-4444-8444-444444444444",
  review_needed: false,
  source: null,
  summary: "Canonical literature Resource.",
  title: "Atomic literature source",
  type: "research" as const,
  updated_at: "2026-09-04T00:00:00.000Z",
  url: "https://example.test/literature",
  user_id: userId,
};

describe("SupabaseEducationRepository createLiteratureResource", () => {
  it("uses the one canonical create-and-link RPC and maps its Resource result", async () => {
    const calls: Array<{ args: unknown; name: string }> = [];
    const client = {
      rpc: async (name: string, args: unknown) => {
        calls.push({ args, name });
        return { data: resourceRow, error: null };
      },
    };
    const result = await createSupabaseEducationRepository(client as never)
      .createLiteratureResource(userId, {
        areaId,
        body: resourceRow.summary ?? undefined,
        projectId,
        title: resourceRow.title,
        type: resourceRow.type,
        url: resourceRow.url ?? undefined,
      });

    expect(result).toMatchObject({ data: { id: resourceRow.id }, ok: true });
    expect(calls).toEqual([
      {
        args: {
          p_area_id: areaId,
          p_project_id: projectId,
          p_summary: resourceRow.summary,
          p_title: resourceRow.title,
          p_type: resourceRow.type,
          p_url: resourceRow.url,
        },
        name: "create_education_literature_resource",
      },
    ]);
  });

  it("does not surface success when the transactional boundary fails", async () => {
    const client = {
      rpc: async () => ({
        data: null,
        error: { message: "Education project not found" },
      }),
    };
    const result = await createSupabaseEducationRepository(client as never)
      .createLiteratureResource(userId, {
        areaId,
        projectId,
        title: resourceRow.title,
        type: resourceRow.type,
      });

    expect(result).toEqual({ error: "Literature create failed.", ok: false });
  });
});
