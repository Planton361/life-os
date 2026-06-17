export type NavigationItem = {
  label: string;
  href: string;
  group: "Primary";
  status: "active" | "disabled";
  accent: string;
};

export const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    group: "Primary",
    status: "active",
    accent: "var(--accent-blue)",
  },
  {
    label: "Today",
    href: "/today",
    group: "Primary",
    status: "disabled",
    accent: "var(--accent-blue)",
  },
  {
    label: "Calendar",
    href: "/calendar",
    group: "Primary",
    status: "disabled",
    accent: "var(--accent-blue)",
  },
  {
    label: "Tasks",
    href: "/tasks",
    group: "Primary",
    status: "disabled",
    accent: "var(--accent-blue)",
  },
];

export type NavigationSection = {
  title: string;
  summary: string;
  accent: string;
  items: Array<{
    label: string;
    count?: number;
    meta?: string;
  }>;
};

export const sidebarSections: NavigationSection[] = [
  {
    title: "Inbox / Brain Dump",
    summary: "5 open",
    accent: "var(--accent-green)",
    items: [
      {
        label: "Agent context: dashboard spacing",
        meta: "agent_context · review needed",
      },
      {
        label: "Literature idea: chapter structure",
        meta: "note · education",
      },
      {
        label: "Meal prep grocery reminder",
        meta: "task · nutrition",
      },
      {
        label: "Question: Supabase RLS setup",
        meta: "question · coding",
      },
    ],
  },
  {
    title: "Education",
    summary: "18 tasks · 1 project · 2 goals",
    accent: "var(--accent-blue)",
    items: [
      { label: "Masterarbeit", count: 7 },
      { label: "Literature", count: 4 },
      { label: "Learning Log", count: 3 },
      { label: "Exams", count: 1 },
    ],
  },
  {
    title: "Work & Coding",
    summary: "15 tasks · 3 projects · 1 goal",
    accent: "var(--accent-green)",
    items: [
      { label: "Work Tasks", count: 3 },
      { label: "Life OS App", count: 4 },
      { label: "Agent Sessions", count: 2 },
      { label: "Prompt Library", count: 1 },
    ],
  },
  {
    title: "Health & Fitness",
    summary: "12 tasks · 2 projects · 2 goals",
    accent: "var(--accent-red)",
    items: [
      { label: "Fitness Planner", count: 2 },
      { label: "Running Tracker", count: 1 },
      { label: "Muscle Map", count: 1 },
      { label: "Sleep Log" },
    ],
  },
  {
    title: "Nutrition",
    summary: "9 tasks · 1 project · 1 goal",
    accent: "var(--accent-yellow)",
    items: [
      { label: "Meal Planner", count: 2 },
      { label: "Recipes", count: 1 },
      { label: "Grocery List", count: 3 },
      { label: "Hydration", count: 1 },
    ],
  },
  {
    title: "Review / System",
    summary: "6 tasks · 1 project · 0 goals",
    accent: "var(--text-muted)",
    items: [
      { label: "Daily Review", count: 1 },
      { label: "Weekly Review", count: 1 },
      { label: "Settings" },
    ],
  },
];
