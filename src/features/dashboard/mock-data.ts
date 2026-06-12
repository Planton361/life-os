import type { DashboardData } from "./types";

export const dashboardData: DashboardData = {
  hero: {
    title: "Heute klar handeln.",
    text: "Inbox klären. Fokus setzen. Abends kurz abschließen.",
    dayFocus: "Masterarbeit Schreibblock",
    review: "Tageslog offen",
    week: "Java + Life OS stabilisieren",
  },
  quickActions: [
    {
      label: "Gedanke",
      description: "Inbox",
      area: "system",
    },
    {
      label: "Aufgabe",
      description: "Task",
      area: "system",
    },
    {
      label: "Tageslog",
      description: "Review",
      area: "review",
    },
    {
      label: "Training",
      description: "Health",
      area: "health",
    },
    {
      label: "Lernlog",
      description: "Lernen",
      area: "education",
    },
    {
      label: "Agent Session",
      description: "Agent",
      area: "agent",
    },
  ],
  today: [
    {
      title: "Masterarbeit nächsten Schritt klären",
      priority: "P1",
      meta: ["60 min", "Studium"],
      area: "education",
    },
    {
      title: "Codex Projektkontext testen",
      priority: "P2",
      meta: ["45 min", "Coding"],
      area: "coding",
    },
    {
      title: "Nächstes Training planen",
      priority: "P3",
      meta: ["10 min", "Health"],
      area: "health",
    },
  ],
  inbox: [
    {
      title: "Praxistest Life OS: Dashboard eine Woche nutzen",
      label: "Review",
      meta: ["offen"],
      area: "review",
    },
    {
      title: "Idee: Agent fragt morgens nach Fokus",
      label: "Idee",
      meta: ["später prüfen"],
      area: "agent",
    },
  ],
  week: [
    {
      title: "Erste Literaturquelle eintragen",
      meta: ["Fr"],
      area: "education",
    },
    {
      title: "Java Hyperskill Session",
      meta: ["45 min"],
      area: "education",
    },
    {
      title: "Calisthenics Training",
      meta: ["50 min"],
      area: "health",
    },
  ],
  focus: [
    {
      title: "Masterarbeit Schreibblock",
      mode: "Deep Work",
      duration: "90 min",
      area: "education",
    },
    {
      title: "Jira Ticket analysieren",
      mode: "Arbeit",
      duration: "120 min",
      area: "work",
    },
  ],
  projects: [
    {
      title: "Masterarbeit",
      progress: 10,
      area: "education",
    },
    {
      title: "LLM-Agent für Videospiele",
      progress: 5,
      area: "agent",
    },
    {
      title: "Pokémon Randomizer Custom ROM",
      progress: 20,
      area: "coding",
    },
    {
      title: "Life OS App",
      status: "Idee",
      area: "system",
    },
  ],
  goals: [
    {
      title: "Masterarbeit abschließen",
      label: "Quartal",
      area: "education",
    },
    {
      title: "Java-Kompetenz aufbauen",
      label: "Quartal",
      area: "education",
    },
    {
      title: "Fitness stabilisieren",
      label: "Quartal",
      area: "health",
    },
    {
      title: "Codex/Agenten-Workflow aufbauen",
      label: "Quartal",
      area: "agent",
    },
  ],
  review: [
    {
      title: "Tageslog heute",
      label: "offen",
      area: "review",
    },
    {
      title: "Offene Loops",
      label: "prüfen",
      area: "review",
    },
    {
      title: "Weekly Review",
      label: "Fr",
      area: "review",
    },
  ],
  snapshots: {
    health: {
      title: "Health Snapshot",
      description: "Training, Habits und Tageszustand ohne Druck.",
      area: "health",
      items: [
        {
          title: "Training diese Woche",
          label: "2 geplant",
          area: "health",
        },
        {
          title: "Habits diese Woche",
          label: "prüfen",
          area: "health",
        },
        {
          title: "Tageszustand",
          label: "offen",
          area: "health",
        },
      ],
    },
    education: {
      title: "Education Snapshot",
      description: "Masterarbeit, Literatur und Skill-Fokus.",
      area: "education",
      items: [
        {
          title: "Literatur zu lesen",
          area: "education",
        },
        {
          title: "Skill Fokus: Java",
          area: "education",
        },
        {
          title: "Masterarbeit aktueller Schritt",
          area: "education",
        },
        {
          title: "Lernlog diese Woche",
          area: "education",
        },
      ],
    },
    workCoding: {
      title: "Work / Coding Snapshot",
      description: "Arbeitslog, Coding-Projekte und Agent Review.",
      area: "coding",
      items: [
        {
          title: "Arbeitslog",
          area: "work",
        },
        {
          title: "offene Work-Aufgaben",
          area: "work",
        },
        {
          title: "aktive Coding-Projekte",
          area: "coding",
        },
        {
          title: "Agent Session offen",
          area: "agent",
        },
      ],
    },
    nutrition: {
      title: "Ernährung Snapshot",
      description: "Einfache Mahlzeiten und Einkaufsklarheit.",
      area: "nutrition",
      items: [
        {
          title: "Schnelle Protein-Bowl",
          label: "Meal Prep",
          area: "nutrition",
        },
        {
          title: "Einfaches Meal Prep Gericht",
          label: "Protein",
          area: "nutrition",
        },
        {
          title: "Einkauf offen",
          area: "nutrition",
        },
      ],
    },
  },
  areaNavigation: [
    {
      title: "Education",
      href: "/education",
      area: "education",
      summary: "Masterarbeit, Literatur, Java",
    },
    {
      title: "Work",
      href: "/work",
      area: "work",
      summary: "Tickets, Log, Follow-ups",
    },
    {
      title: "Coding",
      href: "/coding",
      area: "coding",
      summary: "Repos, Agent Sessions",
    },
    {
      title: "Health",
      href: "/health",
      area: "health",
      summary: "Training, Habits",
    },
    {
      title: "Nutrition",
      href: "/nutrition",
      area: "nutrition",
      summary: "Meal Prep, Einkauf",
    },
    {
      title: "Personal",
      href: "/personal",
      area: "personal",
      summary: "Alltag, Journal",
    },
  ],
  healthWeek: [
    { label: "Mo", status: "planned" },
    { label: "Di", status: "open" },
    { label: "Mi", status: "planned" },
    { label: "Do", status: "open" },
    { label: "Fr", status: "open" },
    { label: "Sa", status: "open" },
    { label: "So", status: "open" },
  ],
};
