import {
  mockWorkArchitectureItems,
  mockWorkLogEntries,
  mockWorkTasks,
  mockWorkWikiEntries,
} from "./mock-work-data";
import type { WorkWikiViewModel } from "./types";

export function getWorkWikiViewModel(): WorkWikiViewModel {
  return {
    tasks: mockWorkTasks,
    logs: mockWorkLogEntries,
    wikiEntries: mockWorkWikiEntries,
    architectureItems: mockWorkArchitectureItems,
  };
}
