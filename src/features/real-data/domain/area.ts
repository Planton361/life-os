import type { AreaId, ProfileId, UserScopedEntity } from "./ids";

export const areaStatuses = ["active", "archived"] as const;

export type AreaStatus = (typeof areaStatuses)[number];

export type Area = UserScopedEntity & {
  id: AreaId;
  profileId: ProfileId;
  slug: string;
  label: string;
  status: AreaStatus;
  sortOrder: number;
};
