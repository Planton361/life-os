import type {
  InboxAISuggestion,
  InboxAISuggestionRequest,
} from "./inbox-ai-suggestion.types";

const routeKeywords = {
  createGoal: ["goal", "target", "improve"],
  createProject: ["project", "build", "feature"],
  resource: ["article", "link", "read"],
  solvedArchive: ["done", "fixed", "solved"],
  task: ["buy", "call", "email", "write"],
} as const;

function normalizeText(value: string) {
  return value.toLowerCase();
}

function includesAny(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function firstSentence(value: string) {
  return value
    .split(/[.!?]\s+/)
    .find(Boolean)
    ?.trim();
}

function cleanTitle(title: string, body: string) {
  const candidate = title.trim() || firstSentence(body) || "Inbox Vorschlag";

  return candidate.split(/\s+/).slice(0, 12).join(" ");
}

function nextActionFromTitle(title: string) {
  const words = title.trim().split(/\s+/);

  if (words.length <= 4) return title.trim();

  return words.slice(0, 6).join(" ");
}

export function createMockInboxAISuggestion(
  request: InboxAISuggestionRequest,
): InboxAISuggestion {
  const title = cleanTitle(request.title, request.body ?? "");
  const body = request.body?.trim() ?? "";
  const combined = normalizeText(`${request.title} ${body} ${request.type ?? ""}`);

  if (includesAny(combined, routeKeywords.solvedArchive)) {
    return {
      confidence: "medium",
      reason:
        "Der Capture klingt bereits erledigt. Archivieren bleibt trotzdem eine bewusste User-Confirmation.",
      route: "solved_archive",
      warnings: ["Archivieren wird nicht automatisch ausgefuehrt."],
    };
  }

  if (includesAny(combined, routeKeywords.resource)) {
    return {
      confidence: "high",
      reason:
        "Der Text wirkt wie Material, Link oder Lesestoff und passt besser als Resource als als Task.",
      resourceDraft: {
        source: combined.includes("http") ? body || request.title : undefined,
        summary: body || request.title,
        title,
        type: combined.includes("article") || combined.includes("link")
          ? "link"
          : "note",
      },
      route: "resource",
      warnings: ["Resource wird erst nach deiner Bestaetigung gespeichert."],
    };
  }

  if (includesAny(combined, routeKeywords.createProject)) {
    return {
      confidence: "medium",
      createNewDraft: {
        summary: body || request.title,
        title,
        type: "project",
      },
      reason:
        "Der Capture beschreibt Aufbau- oder Feature-Arbeit und kann als Project Draft starten.",
      route: "create_new",
      warnings: ["Project wird erst ueber den Project-Confirm geschrieben."],
    };
  }

  if (includesAny(combined, routeKeywords.createGoal)) {
    return {
      confidence: "medium",
      createNewDraft: {
        summary: body || request.title,
        title,
        type: "goal",
      },
      reason:
        "Der Capture klingt nach Zielrichtung oder Verbesserung und passt als Goal Draft.",
      route: "create_new",
      warnings: ["Goal wird erst ueber den Goal-Confirm geschrieben."],
    };
  }

  if (includesAny(combined, routeKeywords.task) || request.type === "task") {
    return {
      confidence: "high",
      reason:
        "Der Capture enthaelt ein klares Verb fuer eine naechste Handlung und passt als Standalone Task.",
      route: "standalone_task",
      taskDraft: {
        description: body || request.title,
        durationMinutes: combined.includes("quick") ? 15 : 30,
        energy: combined.includes("call") || combined.includes("email")
          ? "low"
          : "medium",
        nextAction: nextActionFromTitle(title),
        planToday: combined.includes("today"),
        priority: "P2",
        title,
      },
      warnings: ["Bitte Titel, Prioritaet und Tagesplanung vor dem Speichern pruefen."],
    };
  }

  return {
    confidence: "low",
    reason:
      "Der Capture ist mehrdeutig. Der Vorschlag startet als Standalone Task, damit du den Draft pruefen kannst.",
    route: "standalone_task",
    taskDraft: {
      description: body || request.title,
      durationMinutes: 30,
      energy: "medium",
      nextAction: nextActionFromTitle(title),
      planToday: false,
      priority: "P2",
      title,
    },
    warnings: ["Niedrige Confidence: Route und Draft-Felder bewusst pruefen."],
  };
}
