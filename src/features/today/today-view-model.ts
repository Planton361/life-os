export type TodayAgendaBlock = {
  time: string;
  title: string;
  area: string;
  type: string;
  status: string;
  note: string;
  accent: string;
};

export type TodayInboxSignal = {
  title: string;
  type: string;
  area: string;
  source: string;
  nextStep: string;
  reviewHint: string;
  accent: string;
};

export type TodayNextStep = {
  title: string;
  area: string;
  priority: "P1" | "P2" | "P3";
  estimate: string;
  note: string;
};

export type TodayViewModel = {
  title: "Today";
  eyebrow: string;
  summary: string;
  focus: {
    label: string;
    title: string;
    area: string;
    priority: "P1" | "P2";
    energy: string;
    nextAction: string;
  };
  agenda: {
    title: string;
    blocks: TodayAgendaBlock[];
    emptyState: {
      title: string;
      description: string;
    };
  };
  focusBlock: {
    title: string;
    window: string;
    constraint: string;
    doneDefinition: string;
  };
  inboxSignals: {
    title: string;
    items: TodayInboxSignal[];
    emptyState: {
      title: string;
      description: string;
    };
  };
  nextSteps: {
    title: string;
    items: TodayNextStep[];
  };
};

export function getTodayViewModel(): TodayViewModel {
  return {
    title: "Today",
    eyebrow: "Daily flow",
    summary:
      "A focused area page for the workday: planned blocks, active focus, open signals, and the next operational moves.",
    focus: {
      label: "Day focus",
      title: "Build daily flow page skeletons",
      area: "Coding & Agents",
      priority: "P1",
      energy: "Deep work",
      nextAction: "Finish the daily flow pages, then validate the app.",
    },
    agenda: {
      title: "Today Agenda",
      blocks: [
        {
          time: "09:00",
          title: "Plan the daily flow route scope",
          area: "Life OS",
          type: "Build",
          status: "Done",
          note: "Read root docs, route docs, and existing shell patterns.",
          accent: "var(--accent-blue)",
        },
        {
          time: "10:30",
          title: "Implement page skeletons",
          area: "Coding & Agents",
          type: "Focus",
          status: "Active",
          note: "Keep page data in typed ViewModels and pages calm.",
          accent: "var(--accent-orange)",
        },
        {
          time: "14:00",
          title: "Review static daily flow",
          area: "Review / System",
          type: "Check",
          status: "Next",
          note: "Confirm one H1 per route and no dashboard regressions.",
          accent: "var(--accent-cyan)",
        },
      ],
      emptyState: {
        title: "No further planned tasks",
        description:
          "Use the open focus block or clear the next inbox signal before adding more to today.",
      },
    },
    focusBlock: {
      title: "Route skeleton implementation",
      window: "10:30 - 12:00",
      constraint: "Keep this block scoped to planning and validation; defer saving or editing records.",
      doneDefinition:
        "Four routes render with typed static ViewModels and helpful empty states.",
    },
    inboxSignals: {
      title: "Open inbox signals for today",
      items: [
        {
          title: "Route navigation should expose daily flow pages",
          type: "Task",
          area: "System",
          source: "Daily flow brief",
          nextStep: "Use the existing navigation data structure only.",
          reviewHint: "Check that dashboard remains reachable.",
          accent: "var(--accent-cyan)",
        },
        {
          title: "Daily review needs a preview state",
          type: "Note",
          area: "Review",
          source: "Feature spec",
          nextStep: "Render static status instead of form submission.",
          reviewHint: "Mark saving as later processing.",
          accent: "var(--text-muted)",
        },
      ],
      emptyState: {
        title: "No urgent inbox signals for today",
        description:
          "Keep the day focused. Process lower-priority captures from Inbox later.",
      },
    },
    nextSteps: {
      title: "Next operational steps",
      items: [
        {
          title: "Complete static pages",
          area: "Life OS App",
          priority: "P1",
          estimate: "35 min",
          note: "Create route pages for Today, Inbox, Tasks, and Daily Review.",
        },
        {
          title: "Validate daily flow pages",
          area: "QA",
          priority: "P2",
          estimate: "15 min",
          note: "Run lint, TypeScript, diff check, and dashboard QA if nav changed.",
        },
        {
          title: "Capture follow-up data binding work",
          area: "Roadmap",
          priority: "P3",
          estimate: "10 min",
          note: "Keep stored data work out of this pass.",
        },
      ],
    },
  };
}
