export type InboxItemType = "Task" | "Note" | "Question" | "Agent Context";

export type InboxItem = {
  title: string;
  type: InboxItemType;
  area: string;
  source: string;
  nextStep: string;
  reviewHint: string;
  accent: string;
};

export type InboxGroup = {
  title: string;
  description: string;
  items: InboxItem[];
  emptyState: {
    title: string;
    description: string;
  };
};

export type InboxViewModel = {
  title: "Inbox";
  eyebrow: string;
  summary: string;
  groups: InboxGroup[];
  processingNote: {
    title: string;
    description: string;
  };
  emptyState: {
    title: string;
    description: string;
  };
};

export function getInboxViewModel(): InboxViewModel {
  return {
    title: "Inbox",
    eyebrow: "Capture and clarify",
    summary:
      "Open thoughts, tasks, questions, and agent context waiting for a calm next decision.",
    groups: [
      {
        title: "Needs clarification",
        description: "Raw inputs that still need a target, owner, or concrete next step.",
        items: [
          {
            title: "Data access setup question",
            type: "Question",
            area: "Coding & Agents",
            source: "Quick Thought",
            nextStep: "Decide whether this belongs in later system planning.",
            reviewHint: "Needs security review before any stored workflow.",
            accent: "var(--accent-orange)",
          },
          {
            title: "Literature structure idea",
            type: "Note",
            area: "Education",
            source: "Mobile capture",
            nextStep: "Move to master thesis outline if still relevant.",
            reviewHint: "Check against current chapter plan.",
            accent: "var(--accent-blue)",
          },
        ],
        emptyState: {
          title: "No raw items need clarification",
          description:
            "Use the cleared space to process converted items or return to today's focus.",
        },
      },
      {
        title: "Ready to convert",
        description: "Clarified items that can become a task, note, or project later.",
        items: [
          {
            title: "Meal prep grocery reminder",
            type: "Task",
            area: "Nutrition",
            source: "Evening review",
            nextStep: "Convert to a weekly shopping task when processing exists.",
            reviewHint: "Keep as preview only in this static phase.",
            accent: "var(--accent-yellow)",
          },
        ],
        emptyState: {
          title: "Nothing is ready to convert",
          description:
            "Clarify one raw item first instead of creating new tasks from vague input.",
        },
      },
      {
        title: "Agent context",
        description: "Implementation notes that need human review before becoming durable.",
        items: [
          {
            title: "Dashboard spacing guardrails",
            type: "Agent Context",
            area: "Life OS App",
            source: "Codex session",
            nextStep: "Keep as context for dashboard-safe changes.",
            reviewHint: "Do not turn this into product behavior automatically.",
            accent: "var(--accent-cyan)",
          },
        ],
        emptyState: {
          title: "No agent context waiting",
          description:
            "New agent notes should include source, scope, and review need before use.",
        },
      },
    ],
    processingNote: {
      title: "Processing comes later",
      description:
        "This page previews grouped inbox work. Quick-add, conversion, and archiving come later; for now it shows what needs a decision.",
    },
    emptyState: {
      title: "Inbox is clear",
      description:
        "When no items are waiting, protect the current plan instead of adding more capture work.",
    },
  };
}
