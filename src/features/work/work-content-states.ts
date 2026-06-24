import { resolveContentStateMeta } from "@/features/content-state";
import type {
  WorkLogViewModel,
  WorkOverviewViewModel,
  WorkWikiViewModel,
} from "./types";

export function buildWorkOverviewContentStates(
  viewModel: Pick<
    WorkOverviewViewModel,
    "architectureItems" | "followUps" | "logs" | "tasks" | "wikiEntries"
  >,
): WorkOverviewViewModel["contentStates"] {
  const pageItemCount =
    viewModel.logs.length +
    viewModel.followUps.length +
    viewModel.wikiEntries.length +
    viewModel.architectureItems.length +
    viewModel.tasks.length;

  return {
    architectureSnapshot: resolveContentStateMeta({
      capacity: 4,
      itemCount: viewModel.architectureItems.length,
    }),
    currentWorkJournal: resolveContentStateMeta({
      capacity: 1,
      itemCount: viewModel.logs.length > 0 ? 1 : 0,
    }),
    openFollowUps: resolveContentStateMeta({
      capacity: 4,
      itemCount: viewModel.followUps.filter((item) => item.status !== "done").length,
    }),
    page: resolveContentStateMeta({ capacity: 8, itemCount: pageItemCount }),
    quickActions: resolveContentStateMeta({ capacity: 3, itemCount: 0 }),
    recentWorkLog: resolveContentStateMeta({
      capacity: 7,
      itemCount: viewModel.logs.length,
    }),
    searchFilters: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    workSignals: resolveContentStateMeta({
      capacity: 4,
      itemCount: pageItemCount,
    }),
  };
}

export function buildWorkLogContentStates(
  viewModel: Pick<
    WorkLogViewModel,
    "activities" | "followUps" | "logs" | "tasks" | "wikiEntries"
  >,
): WorkLogViewModel["contentStates"] {
  const linkedWikiCount = viewModel.wikiEntries.filter(
    (entry) => entry.relatedLogEntryIds.length > 0,
  ).length;
  const pageItemCount =
    viewModel.logs.length +
    viewModel.activities.length +
    viewModel.followUps.length +
    viewModel.tasks.length +
    linkedWikiCount;

  return {
    activityTimeline: resolveContentStateMeta({
      capacity: 8,
      itemCount: viewModel.activities.length,
    }),
    currentWorkEntry: resolveContentStateMeta({
      capacity: 1,
      itemCount: viewModel.logs.length > 0 ? 1 : 0,
    }),
    linkedWikiNotes: resolveContentStateMeta({
      capacity: 5,
      itemCount: linkedWikiCount,
    }),
    openFollowUps: resolveContentStateMeta({
      capacity: 4,
      itemCount: viewModel.followUps.filter((item) => item.status !== "done").length,
    }),
    page: resolveContentStateMeta({ capacity: 8, itemCount: pageItemCount }),
    quickActions: resolveContentStateMeta({ capacity: 3, itemCount: 0 }),
    recentWorkLogs: resolveContentStateMeta({
      capacity: 5,
      itemCount: viewModel.logs.length,
    }),
    searchFilters: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    taskContext: resolveContentStateMeta({
      capacity: 6,
      itemCount: viewModel.tasks.length,
    }),
    workLogSignals: resolveContentStateMeta({
      capacity: 4,
      itemCount: pageItemCount,
    }),
  };
}

export function buildWorkWikiContentStates(
  viewModel: Pick<
    WorkWikiViewModel,
    "architectureItems" | "logs" | "wikiEntries"
  >,
): WorkWikiViewModel["contentStates"] {
  const pinnedIds = new Set([
    "wiki-testdata-check",
    "wiki-review-checklist",
    "wiki-domain-key",
  ]);
  const pinnedCount = viewModel.wikiEntries.filter((entry) =>
    pinnedIds.has(entry.id),
  ).length;
  const reviewCount = viewModel.wikiEntries.filter(
    (entry) => entry.status === "needs_review",
  ).length;
  const pageItemCount =
    viewModel.wikiEntries.length + viewModel.architectureItems.length;

  return {
    architectureNotes: resolveContentStateMeta({
      capacity: 5,
      itemCount: viewModel.architectureItems.length,
    }),
    needsReview: resolveContentStateMeta({ capacity: 4, itemCount: reviewCount }),
    page: resolveContentStateMeta({ capacity: 8, itemCount: pageItemCount }),
    pinnedReferences: resolveContentStateMeta({
      capacity: 3,
      itemCount: pinnedCount,
    }),
    searchFilters: resolveContentStateMeta({ capacity: 1, itemCount: 0 }),
    wikiCategories: resolveContentStateMeta({
      capacity: 8,
      itemCount: viewModel.wikiEntries.length,
    }),
    wikiLookup: resolveContentStateMeta({
      capacity: 6,
      itemCount: viewModel.wikiEntries.length,
    }),
  };
}
