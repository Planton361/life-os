export type NavigationItemStatus = "ready" | "planned";

export type NavigationItem = {
  label: string;
  href: `/${string}`;
  status: NavigationItemStatus;
  description?: string;
  children?: NavigationItem[];
};

export type NavigationSection = {
  label: string;
  accent: string;
  items: NavigationItem[];
};

export type SidebarNavigation = {
  primary: NavigationItem[];
  sections: NavigationSection[];
  utility: NavigationItem[];
};

export const readyRoutes = [
  "/dashboard",
  "/inbox",
  "/today",
  "/tasks",
] as const;

export const sidebarNavigation: SidebarNavigation = {
  primary: [
    {
      label: "Dashboard",
      href: "/dashboard",
      status: "ready",
      description: "V5 Command Center",
    },
    {
      label: "Inbox",
      href: "/inbox",
      status: "ready",
      description: "Capture triage",
    },
    {
      label: "Today",
      href: "/today",
      status: "ready",
      description: "Daily Record",
    },
    {
      label: "Calendar",
      href: "/calendar",
      status: "planned",
      description: "Temporal planning",
    },
    {
      label: "Portfolio",
      href: "/portfolio",
      status: "planned",
      description: "Tasks, projects, goals, skills",
      children: [
        {
          label: "Tasks",
          href: "/tasks",
          status: "ready",
          description: "Task workbench",
        },
        {
          label: "Projects",
          href: "/projects",
          status: "planned",
          description: "Project workbench",
        },
        {
          label: "Goals",
          href: "/goals",
          status: "planned",
          description: "Goal workbench",
        },
        {
          label: "Skills",
          href: "/skills",
          status: "planned",
          description: "Skill workbench",
        },
      ],
    },
    {
      label: "Resources",
      href: "/resources",
      status: "planned",
      description: "Knowledge base",
    },
  ],
  sections: [
    {
      label: "Health & Fitness",
      accent: "var(--accent-red)",
      items: [
        {
          label: "Mental Health",
          href: "/health/mental",
          status: "planned",
        },
        {
          label: "Habits",
          href: "/health/habits",
          status: "planned",
        },
        {
          label: "Running Tracker",
          href: "/health/running",
          status: "planned",
        },
        {
          label: "Strength Tracker",
          href: "/health/strength",
          status: "planned",
        },
      ],
    },
    {
      label: "Nutrition",
      accent: "var(--accent-yellow)",
      items: [
        {
          label: "Meal Planner",
          href: "/nutrition/meal-planner",
          status: "planned",
        },
        {
          label: "Recipes",
          href: "/nutrition/recipes",
          status: "planned",
        },
        {
          label: "Grocery",
          href: "/nutrition/grocery",
          status: "planned",
        },
      ],
    },
    {
      label: "Coding",
      accent: "var(--accent-blue)",
      items: [
        {
          label: "Repositories",
          href: "/coding/repositories",
          status: "planned",
        },
        {
          label: "Agents",
          href: "/coding/agents",
          status: "planned",
        },
        {
          label: "Skill Map",
          href: "/coding/skill-map",
          status: "planned",
          description: "Coding skills, dependencies, evidence, roadmap",
        },
        {
          label: "Knowledge",
          href: "/coding/knowledge",
          status: "planned",
          description: "Coding notes, resources, snippets, documentation",
        },
      ],
    },
    {
      label: "Life",
      accent: "var(--accent-purple)",
      items: [
        {
          label: "Journal",
          href: "/life/journal",
          status: "planned",
        },
        {
          label: "Notes",
          href: "/life/notes",
          status: "planned",
        },
        {
          label: "Entertainment",
          href: "/life/entertainment",
          status: "planned",
          children: [
            {
              label: "Games",
              href: "/life/entertainment/games",
              status: "planned",
            },
            {
              label: "Books",
              href: "/life/entertainment/books",
              status: "planned",
            },
            {
              label: "Series",
              href: "/life/entertainment/series",
              status: "planned",
            },
            {
              label: "Movies",
              href: "/life/entertainment/movies",
              status: "planned",
            },
          ],
        },
        {
          label: "Inventory",
          href: "/life/inventory",
          status: "planned",
        },
      ],
    },
    {
      label: "Education",
      accent: "var(--accent-blue)",
      items: [
        {
          label: "Scientific Work",
          href: "/education/scientific-work",
          status: "planned",
        },
        {
          label: "Literature",
          href: "/education/literature",
          status: "planned",
        },
        {
          label: "Learning Log",
          href: "/education/learning-log",
          status: "planned",
        },
      ],
    },
    {
      label: "Work",
      accent: "var(--accent-green)",
      items: [
        {
          label: "Work Log",
          href: "/work/log",
          status: "planned",
        },
        {
          label: "Wiki",
          href: "/work/wiki",
          status: "planned",
        },
        {
          label: "Meetings",
          href: "/work/meetings",
          status: "planned",
        },
      ],
    },
  ],
  utility: [
    {
      label: "Shop",
      href: "/shop",
      status: "planned",
    },
    {
      label: "Challenges",
      href: "/challenges",
      status: "planned",
    },
    {
      label: "Settings",
      href: "/settings",
      status: "planned",
    },
  ],
};
