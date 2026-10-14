import { expect, it } from "vitest";
import { supabaseApplicationReads } from "./supabase-adapter";
import type { SupabaseClientLike } from "../supabase/database.types";

it.each([
  { data: null, error: null },
  { data: { timezone: null }, error: null },
  { data: { timezone: "" }, error: null },
  { data: { timezone: " " }, error: null },
  { data: null, error: { message: "Unavailable" } },
])(
  "does not invent a profile timezone for missing data (%j)",
  async (response) => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => response,
    };
    const reads = supabaseApplicationReads(
      { from: () => query } as unknown as SupabaseClientLike,
      "fixture-owner",
    );
    await expect(reads.profileTimezone()).rejects.toThrow(
      "Profile timezone unavailable",
    );
  },
);
it("reads the authenticated owner profile without replacing its actual zone", async () => {
  const calls: unknown[] = [];
  const query = {
    select: () => query,
    eq: (key: string, value: string) => {
      calls.push([key, value]);
      return query;
    },
    maybeSingle: async () => ({
      data: { timezone: "America/Los_Angeles" },
      error: null,
    }),
  };
  const reads = supabaseApplicationReads(
    { from: () => query } as unknown as SupabaseClientLike,
    "fixture-owner",
  );
  await expect(reads.profileTimezone()).resolves.toBe("America/Los_Angeles");
  expect(calls).toEqual([["id", "fixture-owner"]]);
});
