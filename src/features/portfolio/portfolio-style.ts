import type {
  PortfolioArea,
  PortfolioEntity,
  PortfolioEntityType,
  PortfolioFocusLevel,
  PortfolioGroup,
  PortfolioPriority,
  PortfolioStatus,
  PortfolioVisibilityReason,
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

export const portfolioVisibilityReasonMeta: Record<
  PortfolioVisibilityReason,
  { label: string; accent: string }
> = {
  blocked: { label: "blocked", accent: "var(--accent-red)" },
  needs_decision: {
    label: "needs decision",
    accent: "var(--accent-orange)",
  },
  needs_review: { label: "needs review", accent: "var(--accent-cyan)" },
  high_focus: { label: "high focus", accent: "var(--accent-orange)" },
  due_this_week: { label: "due this week", accent: "var(--accent-yellow)" },
  recently_touched: {
    label: "recently touched",
    accent: "var(--accent-green)",
  },
  stale: { label: "stale", accent: "var(--text-muted)" },
  in_motion: { label: "in motion", accent: "var(--accent-blue)" },
};

export const portfolioGroupOrder: PortfolioGroup[] = [
  "attention",
  "in_motion",
  "later_this_week",
];

export const portfolioGroupMeta: Record<
  PortfolioGroup,
  { label: string; description: string; accent: string }
> = {
  attention: {
    label: "Attention",
    description: "Blocked, decision, review or stale signals.",
    accent: "var(--accent-orange)",
  },
  in_motion: {
    label: "In Motion",
    description: "Active, high-focus or recently touched work.",
    accent: "var(--accent-green)",
  },
  later_this_week: {
    label: "Later This Week",
    description: "Due or planned items that are not blocking the flow.",
    accent: "var(--accent-yellow)",
  },
};

const sourceRouteByType: Record<PortfolioEntityType, `/${string}`> = {
  task: "/tasks",
  project: "/projects",
  goal: "/goals",
  skill: "/skills",
};

function staleDays(lastTouched: string) {
  const match = lastTouched.match(/^(\d+)d ago$/);

  return match ? Number(match[1]) : 0;
}

export function getPortfolioVisibilityReasons(
  entity: PortfolioEntity,
): PortfolioVisibilityReason[] {
  const reasons: PortfolioVisibilityReason[] = [];
  const hasDecisionOpen =
    entity.status === "needs_decision" ||
    entity.decisions.some((decision) =>
      ["blocked", "decide"].includes(decision.state),
    );

  if (entity.blocked || entity.status === "blocked") {
    reasons.push("blocked");
  }

  if (hasDecisionOpen) {
    reasons.push("needs_decision");
  }

  if (entity.reviewNeeded || entity.status === "review_open") {
    reasons.push("needs_review");
  }

  if (entity.focusLevel === "high" || entity.priority === "P1") {
    reasons.push("high_focus");
  }

  if (entity.dueRank === 1) {
    reasons.push("due_this_week");
  }

  if (
    entity.recentRank <= 5 ||
    ["today", "yesterday"].includes(entity.lastTouched)
  ) {
    reasons.push("recently_touched");
  }

  if (staleDays(entity.lastTouched) >= 6) {
    reasons.push("stale");
  }

  if (["active", "in_progress", "practicing"].includes(entity.status)) {
    reasons.push("in_motion");
  }

  return reasons.length > 0 ? reasons : ["in_motion"];
}

export function getPortfolioPrimaryReason(
  entity: PortfolioEntity,
): PortfolioVisibilityReason {
  return getPortfolioVisibilityReasons(entity)[0];
}

export function getPortfolioGroup(entity: PortfolioEntity): PortfolioGroup {
  const reasons = getPortfolioVisibilityReasons(entity);

  if (
    reasons.some((reason) =>
      ["blocked", "needs_decision", "needs_review", "stale"].includes(reason),
    )
  ) {
    return "attention";
  }

  if (
    reasons.some((reason) =>
      ["in_motion", "high_focus", "recently_touched"].includes(reason),
    )
  ) {
    return "in_motion";
  }

  return "later_this_week";
}

export function getPortfolioEntitySourceRoute(
  entity: PortfolioEntity,
): `/${string}` {
  return `${sourceRouteByType[entity.type]}/${entity.id}` as `/${string}`;
}
