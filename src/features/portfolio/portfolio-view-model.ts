import { portfolioEntities } from "./portfolio-mock-data";
import type {
  PortfolioEntity,
  PortfolioOption,
  PortfolioScopeFilter,
  PortfolioSortMode,
  PortfolioStat,
  PortfolioView,
  PortfolioViewModel,
} from "./types";

const views: PortfolioOption<PortfolioView>[] = [
  { value: "all", label: "All", description: "Unified active portfolio" },
  {
    value: "tasks",
    label: "Tasks",
    description: "Task filter inside Portfolio",
  },
  {
    value: "projects",
    label: "Projects",
    description: "Project filter inside Portfolio",
  },
  {
    value: "goals",
    label: "Goals",
    description: "Goal filter inside Portfolio",
  },
  {
    value: "skills",
    label: "Skills",
    description: "Skill filter inside Portfolio",
  },
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

function countBy(
  entities: readonly PortfolioEntity[],
  predicate: (entity: PortfolioEntity) => boolean,
) {
  return entities.filter(predicate).length;
}

function getStats(entities: readonly PortfolioEntity[]): PortfolioStat[] {
  return [
    {
      label: "Active Tasks",
      value: String(countBy(entities, (entity) => entity.type === "task")),
      detail: `${countBy(
        entities,
        (entity) => entity.type === "task" && entity.dueRank === 1,
      )} due this week`,
      accent: "var(--accent-blue)",
    },
    {
      label: "Active Projects",
      value: String(countBy(entities, (entity) => entity.type === "project")),
      detail: `${countBy(
        entities,
        (entity) => entity.type === "project" && entity.focusLevel === "high",
      )} high focus`,
      accent: "var(--accent-orange)",
    },
    {
      label: "Goals in Motion",
      value: String(countBy(entities, (entity) => entity.type === "goal")),
      detail: `${countBy(
        entities,
        (entity) => entity.type === "goal" && entity.blocked,
      )} constrained`,
      accent: "var(--accent-purple)",
    },
    {
      label: "Skills Practicing",
      value: String(countBy(entities, (entity) => entity.type === "skill")),
      detail: `${countBy(
        entities,
        (entity) => entity.type === "skill" && entity.dueRank <= 2,
      )} sessions planned`,
      accent: "var(--accent-cyan)",
    },
    {
      label: "Blocked",
      value: String(countBy(entities, (entity) => entity.blocked)),
      detail: "needs text-backed decision",
      accent: "var(--accent-red)",
    },
    {
      label: "Needs Review",
      value: String(countBy(entities, (entity) => entity.reviewNeeded)),
      detail: "weekly note open",
      accent: "var(--text-muted)",
    },
  ];
}

export function getPortfolioViewModel(
  entities: readonly PortfolioEntity[] = portfolioEntities,
  copy: Partial<
    PortfolioViewModel["header"] & PortfolioViewModel["pageContract"]
  > = {},
): PortfolioViewModel {
  return {
    header: {
      eyebrow: "Workbench",
      title: "Portfolio",
      summary:
        copy.summary ??
        "Aktive Tasks, Projekte, Ziele und Skills nach Aufmerksamkeit, Bewegung und Wochenfokus steuern.",
      dateRange: copy.dateRange ?? "Week 25 / 15-21 June 2026",
    },
    pageContract: {
      pageType: copy.pageType ?? "Portfolio / Entity Workbench",
      canonicalSource:
        copy.canonicalSource ??
        "Portfolio reads canonical tasks, projects, goals and skills. It does not duplicate them.",
    },
    views,
    filters,
    sorts,
    stats: getStats(entities),
    entities: [...entities],
  };
}
