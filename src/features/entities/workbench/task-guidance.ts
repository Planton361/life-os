type TaskGuidanceInput = {
  taskId: string;
  status: string;
  archived: boolean;
  availability: "READY" | "BLOCKED";
  blockerCount: number;
  scheduledDate?: string | null;
  plannedDate?: string | null;
  today: string;
  returnHref: string;
  returnLabel: string;
};

export type TaskGuidance = {
  action: "anchor" | "link";
  body: string;
  href: string;
  label: string;
};

export function taskGuidance(input: TaskGuidanceInput): TaskGuidance {
  const { taskId, status } = input;

  if (input.archived || status === "done" || status === "canceled") {
    return {
      action: "link",
      body: "Der Task bleibt mit seinem Project- oder Goal-Kontext erreichbar.",
      href: input.returnHref,
      label: input.returnLabel,
    };
  }

  if (input.blockerCount > 0) {
    return {
      action: "anchor",
      body: "Die offenen und erfüllten Vorgänger findest du bei der Voraussetzung.",
      href: "#task-dependencies",
      label: "Blocker prüfen",
    };
  }

  if (status === "inbox") {
    return {
      action: "link",
      body: "Ergänze den Kontext oder ordne den Task einem Project oder Goal zu.",
      href: `/tasks/${taskId}?edit=1`,
      label: "Einordnen",
    };
  }

  if (status === "active") {
    return {
      action: "anchor",
      body: "Arbeitsnotiz und Arbeitsschritte zeigen, wo du weitermachen kannst.",
      href: "#task-work-content",
      label: "Arbeit fortsetzen",
    };
  }

  if (status === "waiting") {
    return {
      action: "link",
      body: "Der Task wartet, auch wenn seine Voraussetzungen erfüllt sein können.",
      href: `/tasks/${taskId}?edit=1`,
      label: "Warte-Status einordnen",
    };
  }

  if (input.scheduledDate) {
    const params = new URLSearchParams({
      task: taskId,
      date: input.scheduledDate,
      view: "week",
    });
    return {
      action: "link",
      body: "Der bestätigte Zeitblock bleibt im Calendar veränderbar.",
      href: `/calendar?${params.toString()}`,
      label: "Geplanten Termin öffnen",
    };
  }

  if (input.availability === "READY") {
    const params = new URLSearchParams({
      task: taskId,
      date: input.plannedDate || input.today,
      view: "week",
    });
    return {
      action: "link",
      body: "Der Calendar öffnet mit diesem Task und seinem Tag zur Planung.",
      href: `/calendar?${params.toString()}`,
      label: "Im Calendar planen",
    };
  }

  return {
    action: "link",
    body: "Ergänze den Task-Kontext, wenn die Arbeit weiter vorbereitet werden soll.",
    href: `/tasks/${taskId}?edit=1`,
    label: "Task einordnen",
  };
}
