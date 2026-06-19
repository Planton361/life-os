import { portfolioEntities } from "./portfolio-mock-data";
import type {
  PortfolioOption,
  PortfolioScopeFilter,
  PortfolioSortMode,
  PortfolioStat,
  PortfolioView,
  PortfolioViewModel,
} from "./types";

const views: PortfolioOption<PortfolioView>[] = [
  { value: "all", label: "All" },
  { value: "tasks", label: "Tasks" },
  { value: "projects", label: "Projects" },
  { value: "goals", label: "Goals" },
  { value: "skills", label: "Skills" },
];

const filters: PortfolioOption<PortfolioScopeFilter>[] = [
  { value: "all", label: "All" },
  { value: "due_this_week", label: "Due this week" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "needs_decision", label: "Needs decision" },
  { value: "review_open", label: "Review open" },
  { value: "high_focus", label: "High focus" },
  { value: "area_education", label: "Area: Education" },
  { value: "area_work", label: "Area: Work" },
  { value: "area_coding", label: "Area: Coding" },
  { value: "area_health", label: "Area: Health" },
];

const sorts: PortfolioOption<PortfolioSortMode>[] = [
  {
    value: "priority",
    label: "Priority",
    description: "P1 and blocked work first",
  },
  {
    value: "deadline",
    label: "Deadline",
    description: "Soonest due label first",
  },
  {
    value: "recent",
    label: "Recently touched",
    description: "Most recently touched first",
  },
];

function countBy(predicate: (entity: (typeof portfolioEntities)[number]) => boolean) {
  return portfolioEntities.filter(predicate).length;
}

function getStats(): PortfolioStat[] {
  return [
    {
      label: "Active Tasks",
      value: String(countBy((entity) => entity.type === "task")),
      detail: `${countBy(
        (entity) => entity.type === "task" && entity.dueRank === 1,
      )} due this week`,
      accent: "var(--accent-blue)",
    },
    {
      label: "Active Projects",
      value: String(countBy((entity) => entity.type === "project")),
      detail: `${countBy(
        (entity) => entity.type === "project" && entity.focusLevel === "high",
      )} high focus`,
      accent: "var(--accent-orange)",
    },
    {
      label: "Goals in Motion",
      value: String(countBy((entity) => entity.type === "goal")),
      detail: `${countBy(
        (entity) => entity.type === "goal" && entity.blocked,
      )} constrained`,
      accent: "var(--accent-purple)",
    },
    {
      label: "Skills Practicing",
      value: String(countBy((entity) => entity.type === "skill")),
      detail: `${countBy(
        (entity) => entity.type === "skill" && entity.dueRank <= 2,
      )} sessions planned`,
      accent: "var(--accent-cyan)",
    },
    {
      label: "Blocked",
      value: String(countBy((entity) => entity.blocked)),
      detail: "needs text-backed decision",
      accent: "var(--accent-red)",
    },
    {
      label: "Needs Review",
      value: String(countBy((entity) => entity.reviewNeeded)),
      detail: "weekly note open",
      accent: "var(--text-muted)",
    },
  ];
}

export function getPortfolioViewModel(): PortfolioViewModel {
  return {
    header: {
      eyebrow: "Workbench",
      title: "Portfolio",
      summary:
        "Aktive Tasks, Projekte, Ziele und Skills im Kontext steuern.",
      dateRange: "Week 24 / 09-15 June 2026",
    },
    pageContract: {
      pageType: "Portfolio / Entity Workbench",
      canonicalSource:
        "Portfolio reads canonical tasks, projects, goals and skills. It does not duplicate them.",
    },
    views,
    filters,
    sorts,
    stats: getStats(),
    entities: portfolioEntities,
  };
}
