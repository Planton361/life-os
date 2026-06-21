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
  "/calendar",
  "/portfolio",
  "/resources",
  "/tasks",
  "/projects",
  "/goals",
  "/skills",
  "/health",
  "/health/mental",
  "/health/habits",
  "/health/running",
  "/health/strength",
  "/nutrition",
  "/nutrition/meal-planner",
  "/nutrition/recipes",
  "/nutrition/grocery",
  "/coding",
  "/coding/repositories",
  "/coding/agents",
  "/coding/skill-map",
  "/coding/knowledge",
  "/life",
  "/life/journal",
  "/life/notes",
  "/life/entertainment",
  "/life/entertainment/games",
  "/life/entertainment/books",
  "/life/entertainment/series",
  "/life/entertainment/movies",
  "/life/inventory",
  "/education",
  "/education/scientific-work",
  "/education/literature",
  "/education/learning-log",
  "/work",
  "/work/log",
  "/work/wiki",
  "/work/meetings",
  "/shop",
  "/challenges",
  "/settings",
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
      status: "ready",
      description: "Temporal planning",
    },
    {
      label: "Portfolio",
      href: "/portfolio",
      status: "ready",
      description: "Tasks, projects, goals, skills",
      children: [
        {
          label: "Tasks",
          href: "/portfolio?view=tasks",
          status: "ready",
          description: "Task workbench",
        },
        {
          label: "Projects",
          href: "/portfolio?view=projects",
          status: "ready",
          description: "Project workbench",
        },
        {
          label: "Goals",
          href: "/portfolio?view=goals",
          status: "ready",
          description: "Goal workbench",
        },
        {
          label: "Skills",
          href: "/portfolio?view=skills",
          status: "ready",
          description: "Skill workbench",
        },
      ],
    },
    {
      label: "Resources",
      href: "/resources",
      status: "ready",
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
          status: "ready",
        },
        {
          label: "Habits",
          href: "/health/habits",
          status: "ready",
        },
        {
          label: "Running Tracker",
          href: "/health/running",
          status: "ready",
        },
        {
          label: "Strength Tracker",
          href: "/health/strength",
          status: "ready",
        },
      ],
    },
    {
      label: "Nutrition",
      accent: "var(--accent-yellow)",
      items: [
        {
          label: "Overview",
          href: "/nutrition",
          status: "ready",
        },
        {
          label: "Meal Planner",
          href: "/nutrition/meal-planner",
          status: "ready",
        },
        {
          label: "Recipes",
          href: "/nutrition/recipes",
          status: "ready",
        },
        {
          label: "Grocery",
          href: "/nutrition/grocery",
          status: "ready",
        },
      ],
    },
    {
      label: "Coding",
      accent: "var(--accent-blue)",
      items: [
        {
          label: "Overview",
          href: "/coding",
          status: "ready",
        },
        {
          label: "Repositories",
          href: "/coding/repositories",
          status: "ready",
        },
        {
          label: "Agents",
          href: "/coding/agents",
          status: "ready",
        },
        {
          label: "Skill Map",
          href: "/coding/skill-map",
          status: "ready",
          description: "Coding skills, dependencies, evidence, roadmap",
        },
        {
          label: "Knowledge",
          href: "/coding/knowledge",
          status: "ready",
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
          status: "ready",
        },
        {
          label: "Notes",
          href: "/life/notes",
          status: "ready",
        },
        {
          label: "Entertainment",
          href: "/life/entertainment",
          status: "ready",
          children: [
            {
              label: "Games",
              href: "/life/entertainment/games",
              status: "ready",
            },
            {
              label: "Books",
              href: "/life/entertainment/books",
              status: "ready",
            },
            {
              label: "Series",
              href: "/life/entertainment/series",
              status: "ready",
            },
            {
              label: "Movies",
              href: "/life/entertainment/movies",
              status: "ready",
            },
          ],
        },
        {
          label: "Inventory",
          href: "/life/inventory",
          status: "ready",
        },
      ],
    },
    {
      label: "Education",
      accent: "var(--accent-blue)",
      items: [
        {
          label: "Overview",
          href: "/education",
          status: "ready",
        },
        {
          label: "Scientific Work",
          href: "/education/scientific-work",
          status: "ready",
        },
        {
          label: "Literature",
          href: "/education/literature",
          status: "ready",
        },
        {
          label: "Learning Log",
          href: "/education/learning-log",
          status: "ready",
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
          status: "ready",
        },
        {
          label: "Wiki",
          href: "/work/wiki",
          status: "ready",
        },
        {
          label: "Meetings",
          href: "/work/meetings",
          status: "ready",
        },
      ],
    },
  ],
  utility: [
    {
      label: "Shop",
      href: "/shop",
      status: "ready",
    },
    {
      label: "Challenges",
      href: "/challenges",
      status: "ready",
    },
    {
      label: "Settings",
      href: "/settings",
      status: "ready",
    },
  ],
};
