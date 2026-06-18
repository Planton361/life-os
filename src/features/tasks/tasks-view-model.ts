export type TaskPriority = "P1" | "P2" | "P3" | "none";

export type TaskSummary = {
  title: string;
  status: string;
  priority: TaskPriority;
  area: string;
  estimatedDuration: string;
  project: string;
  energyLevel?: string;
  accent: string;
};

export type TaskGroup = {
  title: string;
  description: string;
  items: TaskSummary[];
  emptyState: {
    title: string;
    description: string;
  };
};

export type TasksViewModel = {
  title: "Tasks";
  eyebrow: string;
  summary: string;
  groups: TaskGroup[];
};

export function getTasksViewModel(): TasksViewModel {
  return {
    title: "Tasks",
    eyebrow: "Daily and weekly control",
    summary:
      "A compact overview of work that needs attention now, this week, later, or from someone else.",
    groups: [
      {
        title: "Today Tasks",
        description: "Limited tasks that can realistically fit inside the current day.",
        items: [
          {
            title: "Create daily flow page skeletons",
            status: "active",
            priority: "P1",
            area: "Life OS App",
            estimatedDuration: "45 min",
            project: "Daily Flow",
            energyLevel: "Deep work",
            accent: "var(--accent-blue)",
          },
          {
            title: "Run lint and TypeScript checks",
            status: "planned",
            priority: "P1",
            area: "QA",
            estimatedDuration: "15 min",
            project: "Daily Flow",
            energyLevel: "Medium",
            accent: "var(--accent-cyan)",
          },
        ],
        emptyState: {
          title: "No tasks planned for today",
          description:
            "Choose one next step from Inbox or keep the day intentionally open.",
        },
      },
      {
        title: "This Week",
        description: "Useful but not urgent work that should stay visible this week.",
        items: [
          {
            title: "Prepare static review route copy",
            status: "planned",
            priority: "P2",
            area: "Review / System",
            estimatedDuration: "30 min",
            project: "Daily Flow",
            energyLevel: "Low",
            accent: "var(--text-muted)",
          },
          {
            title: "Document follow-up data binding tasks",
            status: "planned",
            priority: "P2",
            area: "Roadmap",
            estimatedDuration: "20 min",
            project: "Data Binding Prep",
            accent: "var(--accent-purple)",
          },
        ],
        emptyState: {
          title: "This week has no planned tasks",
          description:
            "Review active projects before pulling new work into the week.",
        },
      },
      {
        title: "Waiting / Follow-up",
        description: "Items blocked by review, a reply, or a later decision.",
        items: [
          {
            title: "Confirm data model timing",
            status: "waiting",
            priority: "P3",
            area: "System",
            estimatedDuration: "10 min",
            project: "Data Planning",
            accent: "var(--accent-green)",
          },
        ],
        emptyState: {
          title: "No waiting items",
          description:
            "There is nothing to chase. Continue with planned work instead.",
        },
      },
      {
        title: "Someday / Backlog",
        description: "Quiet parking lot for ideas that should not pressure today.",
        items: [],
        emptyState: {
          title: "Backlog is intentionally quiet",
          description:
            "New someday items should come from a review decision, not from avoiding today's work.",
        },
      },
    ],
  };
}
