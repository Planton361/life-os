import "server-only";

import { cookies } from "next/headers";
import type { LifeOsProfileId, LifeOsProfileSummary } from "./types";
import { lifeOsProfileIds } from "./types";
import { isSqliteProofRuntime } from "../../../experiments/issue-37/proof-gate";

export const LIFE_OS_PROFILE_COOKIE = "life_os_profile";

export const lifeOsProfiles = [
  {
    id: "demo",
    label: "Demo Profile",
    description: "Design fixture profile with the accepted V5 mock state.",
    mutable: false,
  },
  {
    id: "empty",
    label: "Empty Profile",
    description: "Same V5 surfaces with neutral values and no entries.",
    mutable: false,
  },
  {
    id: "manual",
    label: "Manual Local Profile",
    description: "Local JSON-backed profile for Anton's manual entries.",
    mutable: true,
  },
] satisfies LifeOsProfileSummary[];

export function isLifeOsProfileId(
  value: string | null,
): value is LifeOsProfileId {
  return Boolean(value && lifeOsProfileIds.includes(value as LifeOsProfileId));
}

export function parseLifeOsProfileId(value: string | null): LifeOsProfileId {
  return isLifeOsProfileId(value) ? value : "demo";
}

export function getLifeOsProfileSummary(id: LifeOsProfileId) {
  return (
    lifeOsProfiles.find((profile) => profile.id === id) ?? lifeOsProfiles[0]
  );
}

export async function getCurrentLifeOsProfileId(): Promise<LifeOsProfileId> {
  if (isSqliteProofRuntime()) return "manual";
  const cookieStore = await cookies();

  return parseLifeOsProfileId(
    cookieStore.get(LIFE_OS_PROFILE_COOKIE)?.value ?? null,
  );
}
