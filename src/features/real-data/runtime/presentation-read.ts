/** Presentation snapshots carry entity identity, never authentication ownership. */
export type PresentationRead<T> = T extends readonly (infer Item)[]
  ? PresentationRead<Item>[]
  : T extends object
    ? {
        [Key in keyof T as Key extends "user_id" | "profile_id" | "userId" | "profileId"
          ? never
          : Key]: PresentationRead<T[Key]>;
      }
    : T;

export function presentationRead<T>(value: T): PresentationRead<T> {
  if (Array.isArray(value))
    return value.map(presentationRead) as PresentationRead<T>;
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !["user_id", "profile_id", "userId", "profileId"].includes(key))
        .map(([key, item]) => [key, presentationRead(item)]),
    ) as PresentationRead<T>;
  return value as PresentationRead<T>;
}
