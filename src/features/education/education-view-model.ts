import {
  mockLiteratureItems,
  mockMasterThesis,
  mockMasterThesisMilestones,
  mockResearchFields,
  mockResearchIdeas,
  mockResearchNotes,
  mockResearchQuestions,
} from "./mock-education-data";
import { resolveContentStateMeta } from "@/features/content-state";
import type { EducationWorkspaceViewModel } from "./types";

export function getEducationWorkspaceViewModel(): EducationWorkspaceViewModel {
  return {
    profileId: "demo",
    actionsEnabled: true,
    contentStates: {
      extractionFocus: resolveContentStateMeta({
        capacity: 3,
        itemCount: mockLiteratureItems.filter((item) => item.status === "extracting")
          .length,
      }),
      filters: resolveContentStateMeta({ capacity: 1, itemCount: 1 }),
      highRelevanceSources: resolveContentStateMeta({
        capacity: 5,
        itemCount: mockLiteratureItems.filter((item) => item.relevance === "high")
          .length,
      }),
      literatureQueue: resolveContentStateMeta({
        capacity: 5,
        itemCount: mockLiteratureItems.length,
      }),
      masterThesisFocus: resolveContentStateMeta({ capacity: 1, itemCount: 1 }),
      page: resolveContentStateMeta({ capacity: 8, itemCount: 8 }),
      recentResearchNotes: resolveContentStateMeta({
        capacity: 5,
        itemCount: mockResearchNotes.length,
      }),
      researchFields: resolveContentStateMeta({
        capacity: 4,
        itemCount: mockResearchFields.length,
      }),
      researchIdeas: resolveContentStateMeta({
        capacity: 4,
        itemCount: mockResearchIdeas.length,
      }),
      researchQuestions: resolveContentStateMeta({
        capacity: 5,
        itemCount: mockResearchQuestions.length,
      }),
      scientificWorkPapers: resolveContentStateMeta({
        capacity: 6,
        itemCount: mockResearchIdeas.filter((idea) => idea.workType !== "other")
          .length,
      }),
      statusSummary: resolveContentStateMeta({
        capacity: 6,
        itemCount: mockLiteratureItems.length,
      }),
    },
    ideas: mockResearchIdeas,
    fields: mockResearchFields,
    literature: mockLiteratureItems,
    notes: mockResearchNotes,
    questions: mockResearchQuestions,
    masterThesis: mockMasterThesis,
    masterThesisMilestones: mockMasterThesisMilestones,
  };
}
