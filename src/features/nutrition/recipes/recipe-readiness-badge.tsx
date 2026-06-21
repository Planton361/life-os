import { accentStyle } from "@/components/layout/route-page-primitives";
import type { RecipeReadiness } from "../meal-planner/meal-planner-types";
import { readinessMeta } from "./recipe-utils";

export function RecipeReadinessBadge({
  readiness,
  compact = false,
  dense = false,
}: Readonly<{
  readiness: RecipeReadiness;
  compact?: boolean;
  dense?: boolean;
}>) {
  const meta = readinessMeta[readiness];

  return (
    <span
      className={
        dense
          ? "inline-flex min-h-6 items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2 text-[9px] font-semibold text-[var(--text-secondary)]"
          : "inline-flex min-h-7 items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2.5 text-[10px] font-semibold text-[var(--text-secondary)]"
      }
      style={accentStyle(meta.accent)}
      title={meta.helper}
    >
      {compact ? meta.label : `${meta.label} - ${meta.helper}`}
    </span>
  );
}
