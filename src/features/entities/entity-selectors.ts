import type {
  EntityCollection,
  EntityArea,
  EntityKind,
  EntityMilestone,
  EntityPriority,
  GoalHorizon,
  LifeGoal,
  LifeProject,
  LifeSkill,
  LifeTask,
  MilestoneStatus,
  ProjectStatus,
  SkillStatus,
  TaskStatus,
  WorkbenchSearchParams,
} from "./types";

export const entityAreaMeta: Record<EntityArea, { label: string; accent: string }> =
  {
    coding: { label: "Coding", accent: "var(--accent-orange)" },
    education: { label: "Education", accent: "var(--accent-blue)" },
    work: { label: "Work", accent: "var(--accent-green)" },
    health: { label: "Health", accent: "var(--accent-red)" },
    nutrition: { label: "Nutrition", accent: "var(--accent-yellow)" },
    review: { label: "Review", accent: "var(--accent-cyan)" },
    system: { label: "System", accent: "var(--text-muted)" },
    personal: { label: "Personal", accent: "var(--accent-purple)" },
  };

export const entityKindMeta: Record<
  EntityKind,
  { label: string; plural: string; accent: string; route: `/${string}` }
> = {
  task: {
    label: "Task",
    plural: "Tasks",
    accent: "var(--accent-blue)",
    route: "/tasks",
  },
  project: {
    label: "Project",
    plural: "Projects",
    accent: "var(--accent-orange)",
    route: "/projects",
  },
  goal: {
    label: "Goal",
    plural: "Goals",
    accent: "var(--accent-purple)",
    route: "/goals",
  },
  skill: {
    label: "Skill",
    plural: "Skills",
    accent: "var(--accent-cyan)",
    route: "/skills",
  },
};

export const priorityRank: Record<EntityPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
  none: 4,
};

export const taskStatusMeta: Record<TaskStatus, { label: string; accent: string }> =
  {
    inbox: { label: "Inbox", accent: "var(--text-muted)" },
    planned: { label: "Planned", accent: "var(--accent-blue)" },
    active: { label: "Active", accent: "var(--accent-green)" },
    waiting: { label: "Waiting", accent: "var(--accent-orange)" },
    done: { label: "Done", accent: "var(--accent-green)" },
    canceled: { label: "Canceled", accent: "var(--text-muted)" },
    someday: { label: "Someday", accent: "var(--text-muted)" },
  };

export const projectStatusMeta: Record<
  ProjectStatus,
  { label: string; accent: string }
> = {
  idea: { label: "Idea", accent: "var(--text-muted)" },
  active: { label: "Active", accent: "var(--accent-green)" },
  paused: { label: "Paused", accent: "var(--accent-orange)" },
  blocked: { label: "Blocked", accent: "var(--accent-red)" },
  completed: { label: "Completed", accent: "var(--accent-green)" },
  archived: { label: "Archived", accent: "var(--text-muted)" },
};

export const goalStatusMeta: Record<
  LifeGoal["status"],
  { label: string; accent: string }
> = {
  draft: { label: "Draft", accent: "var(--text-muted)" },
  active: { label: "Active", accent: "var(--accent-green)" },
  paused: { label: "Paused", accent: "var(--accent-orange)" },
  achieved: { label: "Achieved", accent: "var(--accent-green)" },
  archived: { label: "Archived", accent: "var(--text-muted)" },
};

export const skillStatusMeta: Record<SkillStatus, { label: string; accent: string }> =
  {
    interested: { label: "Interested", accent: "var(--text-muted)" },
    learning: { label: "Learning", accent: "var(--accent-blue)" },
    practicing: { label: "Practicing", accent: "var(--accent-cyan)" },
    applied: { label: "Applied", accent: "var(--accent-green)" },
    demonstrated: { label: "Demonstrated", accent: "var(--accent-green)" },
    maintaining: { label: "Maintaining", accent: "var(--accent-purple)" },
    paused: { label: "Paused", accent: "var(--accent-orange)" },
  };

export const milestoneStatusMeta: Record<
  MilestoneStatus,
  { label: string; accent: string }
> = {
  planned: { label: "Planned", accent: "var(--accent-blue)" },
  active: { label: "Active", accent: "var(--accent-green)" },
  done: { label: "Done", accent: "var(--accent-green)" },
  blocked: { label: "Blocked", accent: "var(--accent-red)" },
};

const projectAliasMap: Record<string, string> = {
  "project-life-os-app": "portfolio-life-os-app",
  "project-masterarbeit": "portfolio-masterarbeit",
  "project-fi-work-notes": "portfolio-finanzinformatik",
};

const goalAliasMap: Record<string, string> = {
  "goal-life-os-mvp": "portfolio-life-os-mvp",
  "goal-masterarbeit": "portfolio-masterarbeit-goal",
};

const skillAliasMap: Record<string, string> = {
  "skill-figma-design": "portfolio-figma-design",
  "skill-java-hyperskill": "portfolio-java-hyperskill",
};

export function normalizeSearchValue(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeId(kind: EntityKind, id: string) {
  if (kind === "project") {
    return projectAliasMap[id] ?? id;
  }

  if (kind === "goal") {
    return goalAliasMap[id] ?? id;
  }

  if (kind === "skill") {
    return skillAliasMap[id] ?? id;
  }

  return id;
}

export function getTask(
  taskId: string,
  collection: EntityCollection,
) {
  return collection.tasks.find((task) => task.id === taskId) ?? null;
}

export function getProject(
  projectId: string,
  collection: EntityCollection,
) {
  const normalizedId = normalizeId("project", projectId);
  return (
    collection.projects.find((project) => project.id === normalizedId) ??
    null
  );
}

export function getGoal(
  goalId: string,
  collection: EntityCollection,
) {
  const normalizedId = normalizeId("goal", goalId);
  return collection.goals.find((goal) => goal.id === normalizedId) ?? null;
}

export function getSkill(
  skillId: string,
  collection: EntityCollection,
) {
  const normalizedId = normalizeId("skill", skillId);
  return collection.skills.find((skill) => skill.id === normalizedId) ?? null;
}

export function getMilestone(
  milestoneId: string,
  collection: EntityCollection,
) {
  return (
    collection.milestones.find(
      (milestone) => milestone.id === milestoneId,
    ) ?? null
  );
}

export function getProjectTasks(
  project: LifeProject,
  collection: EntityCollection,
) {
  return project.taskIds
    .map((taskId) => getTask(taskId, collection))
    .filter((task): task is LifeTask => Boolean(task));
}

export function getGoalTasks(
  goal: LifeGoal,
  collection: EntityCollection,
) {
  return goal.linkedTaskIds
    .map((taskId) => getTask(taskId, collection))
    .filter((task): task is LifeTask => Boolean(task));
}

export function getGoalProjects(
  goal: LifeGoal,
  collection: EntityCollection,
) {
  return goal.linkedProjectIds
    .map((projectId) => getProject(projectId, collection))
    .filter((project): project is LifeProject => Boolean(project));
}

export function getSkillTasks(
  skill: LifeSkill,
  collection: EntityCollection,
) {
  return skill.linkedTaskIds
    .map((taskId) => getTask(taskId, collection))
    .filter((task): task is LifeTask => Boolean(task));
}

export function getSkillProjects(
  skill: LifeSkill,
  collection: EntityCollection,
) {
  return skill.linkedProjectIds
    .map((projectId) => getProject(projectId, collection))
    .filter((project): project is LifeProject => Boolean(project));
}

export function getProjectMilestones(
  project: LifeProject,
  collection: EntityCollection,
) {
  return project.milestoneIds
    .map((milestoneId) => getMilestone(milestoneId, collection))
    .filter((milestone): milestone is EntityMilestone => Boolean(milestone));
}

export function getGoalMilestones(
  goal: LifeGoal,
  collection: EntityCollection,
) {
  return goal.milestoneIds
    .map((milestoneId) => getMilestone(milestoneId, collection))
    .filter((milestone): milestone is EntityMilestone => Boolean(milestone));
}

export function getSkillMilestones(
  skill: LifeSkill,
  collection: EntityCollection,
) {
  return skill.milestoneIds
    .map((milestoneId) => getMilestone(milestoneId, collection))
    .filter((milestone): milestone is EntityMilestone => Boolean(milestone));
}

export function getProjectGoal(
  project: LifeProject,
  collection: EntityCollection,
) {
  return project.goalId ? getGoal(project.goalId, collection) : null;
}

export function getTaskProject(
  task: LifeTask,
  collection: EntityCollection,
) {
  return task.projectId ? getProject(task.projectId, collection) : null;
}

export function getTaskGoal(
  task: LifeTask,
  collection: EntityCollection,
) {
  return task.goalId ? getGoal(task.goalId, collection) : null;
}

export function getTaskSkill(
  task: LifeTask,
  collection: EntityCollection,
) {
  return task.skillId ? getSkill(task.skillId, collection) : null;
}

export function getEntityHref(kind: EntityKind, id: string): `/${string}` {
  return `${entityKindMeta[kind].route}/${id}` as `/${string}`;
}

export function getWorkbenchItems(
  kind: EntityKind,
  collection: EntityCollection,
) {
  if (kind === "task") {
    return [...collection.tasks];
  }

  if (kind === "project") {
    return [...collection.projects];
  }

  if (kind === "goal") {
    return [...collection.goals];
  }

  return [...collection.skills];
}

function matchesTaskFilter(task: LifeTask, filter: string | null) {
  if (!filter || filter === "all") return true;
  if (filter === "today") return task.date === "2026-06-22";
  if (filter === "review") return task.reviewNeeded;
  return task.status === filter;
}

function matchesProjectFilter(project: LifeProject, filter: string | null) {
  if (!filter || filter === "active") return project.status === "active";
  if (filter === "all") return true;
  if (filter === "focus") return project.focusThisWeek;
  if (filter === "blocked") return Boolean(project.blocker);
  return project.status === filter;
}

function matchesGoalFilter(goal: LifeGoal, filter: string | null) {
  if (!filter || filter === "active") return goal.status === "active";
  if (filter === "all") return true;
  if (["week", "month", "quarter"].includes(filter)) {
    return goal.horizon === (filter as GoalHorizon);
  }
  if (filter === "completed") return goal.status === "achieved";
  return goal.status === filter;
}

function matchesSkillFilter(skill: LifeSkill, filter: string | null) {
  if (!filter || filter === "active") {
    return ["learning", "practicing", "applied", "maintaining"].includes(
      skill.status,
    );
  }

  if (filter === "all") return true;
  if (filter === "maintained") return skill.status === "maintaining";
  return skill.status === filter;
}

function sortTasks(tasks: LifeTask[], sort: string | null) {
  return tasks.sort((left, right) => {
    if (sort === "due") return (left.date ?? "").localeCompare(right.date ?? "");
    if (sort === "start") {
      return (left.startTime ?? "99:99").localeCompare(right.startTime ?? "99:99");
    }
    if (sort === "duration") {
      return (left.durationMinutes ?? 999) - (right.durationMinutes ?? 999);
    }
    if (sort === "project") {
      return (left.projectId ?? "").localeCompare(right.projectId ?? "");
    }

    return priorityRank[left.priority] - priorityRank[right.priority];
  });
}

function sortProjects(projects: LifeProject[], sort: string | null) {
  return projects.sort((left, right) => {
    if (sort === "deadline") {
      return (left.deadline ?? "9999").localeCompare(right.deadline ?? "9999");
    }
    if (sort === "progress") return right.progress - left.progress;
    if (sort === "updated") return left.title.localeCompare(right.title);
    if (sort === "area") return left.areaId.localeCompare(right.areaId);

    return priorityRank[left.priority] - priorityRank[right.priority];
  });
}

function sortGoals(goals: LifeGoal[], sort: string | null) {
  return goals.sort((left, right) => {
    if (sort === "progress") return right.progress - left.progress;
    if (sort === "area") return left.areaId.localeCompare(right.areaId);
    if (sort === "updated") return left.title.localeCompare(right.title);

    const horizonRank: Record<GoalHorizon, number> = {
      week: 0,
      month: 1,
      quarter: 2,
      year: 3,
      someday: 4,
    };

    return horizonRank[left.horizon] - horizonRank[right.horizon];
  });
}

function sortSkills(skills: LifeSkill[], sort: string | null) {
  return skills.sort((left, right) => {
    if (sort === "recent") {
      return right.lastPracticedAt.localeCompare(left.lastPracticedAt);
    }
    if (sort === "area") return left.areaId.localeCompare(right.areaId);
    if (sort === "focus") return right.progress - left.progress;

    return right.progress - left.progress;
  });
}

export function getFilteredWorkbenchItems(
  kind: EntityKind,
  searchParams: WorkbenchSearchParams,
  collection: EntityCollection,
) {
  const filter = normalizeSearchValue(searchParams.filter);
  const sort = normalizeSearchValue(searchParams.sort);

  if (kind === "task") {
    return sortTasks(
      collection.tasks.filter((task) => matchesTaskFilter(task, filter)),
      sort,
    );
  }

  if (kind === "project") {
    return sortProjects(
      collection.projects.filter((project) =>
        matchesProjectFilter(project, filter),
      ),
      sort,
    );
  }

  if (kind === "goal") {
    return sortGoals(
      collection.goals.filter((goal) => matchesGoalFilter(goal, filter)),
      sort,
    );
  }

  return sortSkills(
    collection.skills.filter((skill) => matchesSkillFilter(skill, filter)),
    sort,
  );
}
