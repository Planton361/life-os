import type { HabitAccent, HabitDayIntensity } from "./habits-types";

export type HabitHeatmapGroupMock = {
  id: string;
  label: "Morning" | "Health" | "Learning" | "Evening";
  completionRate: number;
  accent: HabitAccent;
  intensities: readonly HabitDayIntensity[];
};

export type HabitsAnalyticsMockData = {
  heatmapGroups: readonly HabitHeatmapGroupMock[];
};

export const habitsAnalyticsMockData = {
  heatmapGroups: [
    {
      id: "morning",
      label: "Morning",
      completionRate: 86,
      accent: "var(--accent-green)",
      intensities: [
        4, 4, 3, 4, 4, 2, 3, 4, 4, 4, 3, 4, 4, 3, 3, 4, 4, 4, 3, 4, 4, 3, 4, 4,
        2, 3, 4, 4, 4, 4,
      ],
    },
    {
      id: "health",
      label: "Health",
      completionRate: 74,
      accent: "var(--accent-orange)",
      intensities: [
        3, 3, 2, 3, 4, 1, 2, 3, 4, 3, 2, 3, 3, 1, 2, 3, 4, 3, 2, 2, 3, 2, 3, 4,
        1, 2, 3, 3, 2, 3,
      ],
    },
    {
      id: "learning",
      label: "Learning",
      completionRate: 79,
      accent: "var(--accent-blue)",
      intensities: [
        3, 4, 3, 2, 4, 2, 1, 3, 4, 3, 3, 4, 4, 1, 2, 4, 3, 4, 3, 3, 4, 2, 3, 4,
        2, 2, 4, 4, 3, 4,
      ],
    },
    {
      id: "evening",
      label: "Evening",
      completionRate: 58,
      accent: "var(--accent-red)",
      intensities: [
        3, 2, 2, 1, 3, 2, 0, 1, 2, 3, 2, 2, 1, 0, 1, 3, 2, 2, 1, 3, 2, 0, 1, 2,
        3, 1, 1, 2, 0, 2,
      ],
    },
  ],
} satisfies HabitsAnalyticsMockData;
