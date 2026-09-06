export const workbenchKinds = [
  "task",
  "project",
  "goal",
  "skill",
  "resource",
] as const;
export type WorkbenchKind = (typeof workbenchKinds)[number];
export const entityRoutes = {
  task: "/tasks",
  project: "/projects",
  goal: "/goals",
  skill: "/skills",
  resource: "/resources",
} as const;
export const entityLabels = {
  task: "Task",
  project: "Project",
  goal: "Goal",
  skill: "Skill",
  resource: "Resource",
} as const;
export type Option = { id: string; title: string };
export type FieldValues = Record<string, string | number | null | undefined>;
export type FormResult = {
  status: "success" | "error" | "blocked";
  message: string;
  id?: string;
};
