import type {
  PortfolioArea,
  PortfolioEntityType,
  PortfolioFocusLevel,
  PortfolioPriority,
  PortfolioStatus,
} from "./types";

export const portfolioTypeLabels: Record<PortfolioEntityType, string> = {
  task: "Task",
  project: "Project",
  goal: "Goal",
  skill: "Skill",
};

export const portfolioAreaMeta: Record<
  PortfolioArea,
  { label: string; accent: string }
> = {
  education: { label: "Education", accent: "var(--accent-blue)" },
  work: { label: "Work", accent: "var(--accent-green)" },
  coding: { label: "Coding", accent: "var(--accent-orange)" },
  health: { label: "Health", accent: "var(--accent-red)" },
  nutrition: { label: "Nutrition", accent: "var(--accent-yellow)" },
  personal: { label: "Personal", accent: "var(--accent-purple)" },
  review: { label: "Review", accent: "var(--accent-cyan)" },
  system: { label: "System", accent: "var(--text-muted)" },
};

export const portfolioTypeAccent: Record<PortfolioEntityType, string> = {
  task: "var(--accent-blue)",
  project: "var(--accent-orange)",
  goal: "var(--accent-purple)",
  skill: "var(--accent-cyan)",
};

export const portfolioStatusMeta: Record<
  PortfolioStatus,
  { label: string; accent: string }
> = {
  planned: { label: "planned", accent: "var(--text-muted)" },
  active: { label: "active", accent: "var(--accent-green)" },
  in_progress: { label: "in progress", accent: "var(--accent-blue)" },
  practicing: { label: "practicing", accent: "var(--accent-cyan)" },
  blocked: { label: "blocked", accent: "var(--accent-red)" },
  needs_decision: {
    label: "needs decision",
    accent: "var(--accent-orange)",
  },
  review_open: { label: "review open", accent: "var(--accent-cyan)" },
  done: { label: "done", accent: "var(--accent-green)" },
};

export const portfolioFocusLabels: Record<PortfolioFocusLevel, string> = {
  high: "high focus",
  medium: "medium focus",
  low: "low focus",
};

export const portfolioPriorityRank: Record<PortfolioPriority, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  none: 4,
};
