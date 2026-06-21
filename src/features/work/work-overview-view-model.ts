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
import type { WorkOverviewViewModel } from "./types";

export function getWorkOverviewViewModel(): WorkOverviewViewModel {
  return {
    tasks: mockWorkTasks,
    activities: mockWorkActivities,
    logs: mockWorkLogEntries,
    wikiEntries: mockWorkWikiEntries,
    architectureItems: mockWorkArchitectureItems,
    followUps: mockWorkFollowUps,
    meetings: mockWorkMeetings,
    sections: mockWorkSections,
    privacyNotes: mockWorkPrivacyNotes,
  };
}
