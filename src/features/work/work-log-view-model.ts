import {
  mockWorkActivities,
  mockWorkArchitectureItems,
  mockWorkFollowUps,
  mockWorkLogEntries,
  mockWorkTasks,
  mockWorkWikiEntries,
} from "./mock-work-data";
import type { WorkLogViewModel } from "./types";

export function getWorkLogViewModel(): WorkLogViewModel {
  return {
    tasks: mockWorkTasks,
    activities: mockWorkActivities,
    logs: mockWorkLogEntries,
    wikiEntries: mockWorkWikiEntries,
    architectureItems: mockWorkArchitectureItems,
    followUps: mockWorkFollowUps,
  };
}
