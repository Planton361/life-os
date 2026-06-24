import {
  mockWorkActivities,
  mockWorkArchitectureItems,
  mockWorkFollowUps,
  mockWorkLogEntries,
  mockWorkMeetings,
  mockWorkPrivacyNotes,
  mockWorkSections,
  mockWorkTasks,
  mockWorkWikiEntries,
} from "./mock-work-data";
import { buildWorkOverviewContentStates } from "./work-content-states";
import type { WorkOverviewViewModel } from "./types";

export function getWorkOverviewViewModel(): WorkOverviewViewModel {
  const viewModel = {
    profileId: "demo",
    tasks: mockWorkTasks,
    activities: mockWorkActivities,
    logs: mockWorkLogEntries,
    wikiEntries: mockWorkWikiEntries,
    architectureItems: mockWorkArchitectureItems,
    followUps: mockWorkFollowUps,
    meetings: mockWorkMeetings,
    sections: mockWorkSections,
    privacyNotes: mockWorkPrivacyNotes,
  } satisfies Omit<WorkOverviewViewModel, "contentStates">;

  return {
    ...viewModel,
    contentStates: buildWorkOverviewContentStates(viewModel),
  };
}
