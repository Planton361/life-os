export type ContentState = "empty" | "partial" | "filled";

export type AsyncState = "idle" | "loading" | "success" | "error";

export type ContentStateMeta = {
  state: ContentState;
  itemCount: number;
  capacity?: number;
  hasPrimaryValue?: boolean;
  hasHistory?: boolean;
};

export function resolveContentStateMeta({
  capacity,
  hasHistory = false,
  hasPrimaryValue,
  itemCount,
}: Readonly<{
  itemCount: number;
  capacity?: number;
  hasPrimaryValue?: boolean;
  hasHistory?: boolean;
}>): ContentStateMeta {
  const normalizedCount = Math.max(0, itemCount);
  const hasContent = hasPrimaryValue ?? normalizedCount > 0;

  if (!hasContent) {
    return {
      capacity,
      hasHistory,
      hasPrimaryValue: false,
      itemCount: normalizedCount,
      state: "empty",
    };
  }

  if (capacity !== undefined) {
    return {
      capacity,
      hasHistory,
      hasPrimaryValue: true,
      itemCount: normalizedCount,
      state: normalizedCount >= capacity ? "filled" : "partial",
    };
  }

  return {
    hasHistory,
    hasPrimaryValue: true,
    itemCount: normalizedCount,
    state: hasHistory ? "filled" : "partial",
  };
}

export function contentStateDataAttributes(
  meta: ContentStateMeta,
  profileId: string,
) {
  return {
    "data-content-state": meta.state,
    "data-item-count": String(meta.itemCount),
    ...(meta.capacity === undefined
      ? {}
      : { "data-capacity": String(meta.capacity) }),
    "data-profile-id": profileId,
  };
}
