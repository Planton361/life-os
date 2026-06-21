import {
  mockLiteratureItems,
  mockResearchFields,
  mockResearchIdeas,
  mockResearchNotes,
  mockResearchQuestions,
} from "./mock-education-data";
import type {
  CurrentResearchFocus,
  EducationOverviewStats,
  EducationOverviewViewModel,
  LiteratureItem,
  ResearchIdea,
  ResearchNote,
  ResearchQuestion,
} from "./types";

const focusIdeaId = "idea-ai-agents";

function buildCurrentResearchFocus(
  ideas: ResearchIdea[],
  literature: LiteratureItem[],
  notes: ResearchNote[],
  questions: ResearchQuestion[],
): CurrentResearchFocus {
  const idea = ideas.find((item) => item.id === focusIdeaId) ?? ideas[0];
  const field =
    mockResearchFields.find((item) => item.id === idea.fieldId) ?? null;
  const literatureItems = literature.filter((item) => item.ideaId === idea.id);
  const focusNotes = notes.filter((item) => item.ideaId === idea.id);
  const openQuestions = questions.filter(
    (item) =>
      item.ideaId === idea.id &&
      ["open", "investigating"].includes(item.status),
  );
  const reviewedSourceCount = literatureItems.filter((item) =>
    ["reviewed", "used"].includes(item.status),
  ).length;
  const toReadSourceCount = literatureItems.filter(
    (item) => item.status === "to_read",
  ).length;

  return {
    idea,
    field,
    literatureItems,
    notes: focusNotes,
    openQuestions,
    reviewedSourceCount,
    toReadSourceCount,
    literatureProgressLabel: `${literatureItems.length} sources · ${reviewedSourceCount} reviewed · ${toReadSourceCount} to read`,
  };
}

function buildStats(
  ideas: ResearchIdea[],
  literature: LiteratureItem[],
  notes: ResearchNote[],
  questions: ResearchQuestion[],
): EducationOverviewStats {
  return {
    activeIdeaCount: ideas.filter((item) =>
      ["exploring", "promising", "active"].includes(item.status),
    ).length,
    queuedLiteratureCount: literature.filter((item) =>
      ["to_read", "reading", "extracting"].includes(item.status),
    ).length,
    openQuestionCount: questions.filter((item) =>
      ["open", "investigating"].includes(item.status),
    ).length,
    reviewNeededNoteCount: notes.filter((item) => item.reviewNeeded).length,
  };
}

export function getEducationOverviewViewModel(): EducationOverviewViewModel {
  const ideas = mockResearchIdeas;
  const fields = mockResearchFields;
  const literature = mockLiteratureItems;
  const notes = mockResearchNotes;
  const questions = mockResearchQuestions;

  return {
    header: {
      eyebrow: "Education · Area dashboard",
      title: "Education Overview",
      summary: "Research ideas, literature and academic fields",
    },
    pageContract: {
      pageType: "Area Dashboard / Education Research Overview",
      primaryPurpose:
        "Ideen sammeln, Forschung strukturieren, Literatur steuern und die naechste akademische Entscheidung ableiten.",
      writes:
        "Nur lokale Mock-Zustaende fuer Ideen, Literatur, Notizen und Fragen.",
      reads:
        "Statische Research Ideas, Literature Items, Research Fields, Research Notes und Research Questions.",
      canonicalSource:
        "Spaeter Scientific Work, Resources, Notes, Projects und Literature Items; aktuell keine Persistenz.",
      sensitiveData:
        "Akademische Arbeitsnotizen koennen persoenlich sein; Mockdaten enthalten keine echten sensiblen Inhalte.",
      primaryDecision:
        "Welche Forschungsarbeit ist jetzt Fokus und welcher akademische Schritt folgt?",
      mainZone: "Current Research Focus",
      emptyState:
        "Lokale Empty States erklaeren, wie Research Ideas, Literature und Questions spaeter gepflegt werden.",
      mobileOrder:
        "Header, Current Focus, Quick Actions, Ideas, Literature, Questions, Fields, Notes, Method Notes.",
    },
    focus: buildCurrentResearchFocus(ideas, literature, notes, questions),
    stats: buildStats(ideas, literature, notes, questions),
    ideas,
    fields,
    literature,
    notes,
    questions,
    rhythm: [
      {
        id: "notes-this-week",
        label: "Notes captured this week",
        value: "2",
        tone: "blue",
      },
      {
        id: "sources-waiting",
        label: "Sources waiting",
        value: "3",
        tone: "cyan",
      },
      {
        id: "question-decision",
        label: "Question needs decision",
        value: "1",
        tone: "orange",
      },
    ],
    methodNotes: [
      "Ideas can stay exploratory",
      "Literature needs status before use",
      "Research questions should have next actions",
      "Notes are evidence, not final text",
      "No automatic academic quality judgement in MVP",
    ],
  };
}
