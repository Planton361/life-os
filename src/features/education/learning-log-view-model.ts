import {
  mockLearningInsights,
  mockLearningMethodNotes,
  mockLearningSessions,
  mockLearningTracks,
  mockPracticeQueue,
  mockWeeklyLearningDays,
} from "./mock-education-data";
import type { LearningLogViewModel } from "./types";

export function getLearningLogViewModel(): LearningLogViewModel {
  return {
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
