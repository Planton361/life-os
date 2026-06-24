import {
  mockWorkActivities,
  mockWorkArchitectureItems,
  mockWorkFollowUps,
  mockWorkLogEntries,
  mockWorkTasks,
  mockWorkWikiEntries,
} from "./mock-work-data";
import { buildWorkLogContentStates } from "./work-content-states";
import type { WorkLogViewModel } from "./types";

export function getWorkLogViewModel(): WorkLogViewModel {
  const viewModel = {
    profileId: "demo",
    tasks: mockWorkTasks,
    activities: mockWorkActivities,
    logs: mockWorkLogEntries,
    wikiEntries: mockWorkWikiEntries,
    architectureItems: mockWorkArchitectureItems,
    followUps: mockWorkFollowUps,
  } satisfies Omit<WorkLogViewModel, "contentStates">;

  return {
    ...viewModel,
    contentStates: buildWorkLogContentStates(viewModel),
  };
}
