import {
  mockLearningInsights,
  mockLearningMethodNotes,
  mockLearningSessions,
  mockLearningTracks,
  mockPracticeQueue,
  mockWeeklyLearningDays,
} from "./mock-education-data";
import { resolveContentStateMeta } from "@/features/content-state";
import type { LearningLogViewModel } from "./types";

export function getLearningLogViewModel(): LearningLogViewModel {
  return {
    profileId: "demo",
    actionsEnabled: true,
    contentStates: {
      activeTracks: resolveContentStateMeta({
        capacity: 4,
        itemCount: mockLearningTracks.length,
      }),
      currentLearningFocus: resolveContentStateMeta({
        capacity: 1,
        itemCount: 1,
      }),
      filters: resolveContentStateMeta({ capacity: 1, itemCount: 1 }),
      page: resolveContentStateMeta({ capacity: 8, itemCount: 8 }),
      practiceQueue: resolveContentStateMeta({
        capacity: 5,
        itemCount: mockPracticeQueue.length,
      }),
      trackSummary: resolveContentStateMeta({
        capacity: 4,
        itemCount: 4,
      }),
      weeklyRhythm: resolveContentStateMeta({
        capacity: 7,
        itemCount: mockWeeklyLearningDays.filter((day) => day.minutes > 0)
          .length,
      }),
    },
    tracks: mockLearningTracks,
    sessions: mockLearningSessions,
    practiceQueue: mockPracticeQueue,
    insights: mockLearningInsights,
    week: mockWeeklyLearningDays,
    methodNotes: mockLearningMethodNotes,
    weeklyGoal:
      "3 fokussierte Sessions abschließen und jede Session mit Outcome und Evidence beenden.",
  };
}
