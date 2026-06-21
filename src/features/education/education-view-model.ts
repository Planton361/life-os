import {
  mockLiteratureItems,
  mockMasterThesis,
  mockMasterThesisMilestones,
  mockResearchFields,
  mockResearchIdeas,
  mockResearchNotes,
  mockResearchQuestions,
} from "./mock-education-data";
import type { EducationWorkspaceViewModel } from "./types";

export function getEducationWorkspaceViewModel(): EducationWorkspaceViewModel {
  return {
    ideas: mockResearchIdeas,
    fields: mockResearchFields,
    literature: mockLiteratureItems,
    notes: mockResearchNotes,
    questions: mockResearchQuestions,
    masterThesis: mockMasterThesis,
    masterThesisMilestones: mockMasterThesisMilestones,
  };
}
