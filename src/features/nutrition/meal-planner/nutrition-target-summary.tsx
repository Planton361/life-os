import { accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import type {
  MacroKey,
  NutritionAccent,
  NutritionMacroTarget,
  NutritionProfile,
} from "./meal-planner-types";
import {
  chipButtonClass,
  PlannerPanel,
  ProgressBar,
} from "./meal-planner-primitives";
import { formatMacro, macroLabels, macroUnits } from "./meal-planner-utils";

const targetOrder: readonly MacroKey[] = [
  "calories",
  "protein",
  "carbs",
  "fat",
];

const targetAccents: Record<MacroKey, NutritionAccent> = {
  calories: "var(--accent-yellow)",
  protein: "var(--accent-orange)",
  carbs: "var(--accent-cyan)",
  fat: "var(--accent-purple)",
};

export function NutritionTargetSummary({
  profiles,
  activeProfileId,
  targets,
  onProfileChange,
}: Readonly<{
  profiles: readonly NutritionProfile[];
  activeProfileId: string;
  targets: NutritionMacroTarget;
  onProfileChange: (profileId: string) => void;
}>) {
  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];

  return (
    <PlannerPanel
      bodyClassName="p-3"
      subtitle="Targets from Nutrition Settings - local stub"
      title="Target Profile"
    >
      <div className="flex flex-wrap gap-2">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;

          return (
            <button
              aria-pressed={isActive}
              className={cn(
                chipButtonClass,
                isActive
                  ? "border-[rgba(217,146,79,.42)] bg-[rgba(217,146,79,.14)] text-[var(--text-primary)]"
                  : "border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] text-[var(--text-secondary)] hover:border-[var(--border-default)]",
              )}
              key={profile.id}
              onClick={() => onProfileChange(profile.id)}
              type="button"
            >
              {profile.name}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
        {activeProfile.description}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
        {targetOrder.map((macro) => (
          <article
            className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(18,28,43,.58))] p-2.5"
            key={macro}
            style={accentStyle(targetAccents[macro])}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                {macroLabels[macro]}
              </p>
              <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                {formatMacro(targets[macro], macroUnits[macro])}
              </p>
            </div>
            <div className="mt-2">
              <ProgressBar
                accent={targetAccents[macro]}
                label={`${macroLabels[macro]} target ${targets[macro]} ${macroUnits[macro]}`}
                value={100}
              />
            </div>
          </article>
        ))}
      </div>
    </PlannerPanel>
  );
}
