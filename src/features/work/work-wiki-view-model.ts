import {
  mockWorkArchitectureItems,
  mockWorkLogEntries,
  mockWorkTasks,
  mockWorkWikiEntries,
} from "./mock-work-data";
import { buildWorkWikiContentStates } from "./work-content-states";
import type { WorkWikiViewModel } from "./types";

export function getWorkWikiViewModel(): WorkWikiViewModel {
  const viewModel = {
    profileId: "demo",
    tasks: mockWorkTasks,
    logs: mockWorkLogEntries,
    wikiEntries: mockWorkWikiEntries,
    architectureItems: mockWorkArchitectureItems,
  } satisfies Omit<WorkWikiViewModel, "contentStates">;

  return {
    ...viewModel,
    contentStates: buildWorkWikiContentStates(viewModel),
  };
}
