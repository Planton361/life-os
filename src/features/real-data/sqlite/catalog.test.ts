import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { canonicalTableNames } from "./canonical-catalog";

it("includes every current canonical table, including hidden retained domains", () => {
  const created = new Set<string>(), dropped = new Set<string>();
  for (const name of readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql")).sort()) {
    const sql = readFileSync(join("supabase/migrations", name), "utf8");
    for (const match of sql.matchAll(/create table public\.(\w+)/gi)) created.add(match[1]);
    for (const match of sql.matchAll(/drop table public\.(\w+)/gi)) dropped.add(match[1]);
  }
  expect([...created].filter((name) => !dropped.has(name)).sort()).toEqual([...canonicalTableNames]);
});
