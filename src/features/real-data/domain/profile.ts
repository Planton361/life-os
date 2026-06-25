import type { ProfileId, TimezoneId, UserId, UserScopedEntity } from "./ids";

export const profileKinds = [
  "demo",
  "empty",
  "manual",
  "personal",
  "work",
  "test",
] as const;

export type ProfileKind = (typeof profileKinds)[number];

export type Profile = UserScopedEntity & {
  id: ProfileId;
  userId: UserId;
  label: string;
  kind: ProfileKind;
  timezone: TimezoneId;
  locale?: string | null;
};
