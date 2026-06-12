import type { AppRoute, NavItem, PlaceholderPageConfig } from "@/types/life-os";

export const APP_NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    area: "system",
    description: "Cockpit für Tagesfokus, Inbox, Woche und Review.",
  },
  {
    title: "Today",
    href: "/today",
    area: "system",
    description: "Tagesplanung, Fokusblock und offene Loops.",
  },
  {
    title: "Inbox",
    href: "/inbox",
    area: "system",
    description: "Schnelles Erfassen und späteres Klären.",
  },
  {
    title: "Week",
    href: "/week",
    area: "review",
    description: "Wochenplanung, Kapazität und Rhythmus.",
  },
  {
    title: "Projects",
    href: "/projects",
    area: "system",
    description: "Aktive Projekte, Fortschritt und nächste Schritte.",
  },
  {
    title: "Goals",
    href: "/goals",
    area: "system",
    description: "Quartalsrichtung und messbare Zielarbeit.",
  },
  {
    title: "Review",
    href: "/review",
    area: "review",
    description: "Daily Log, Weekly Review und offene Loops.",
  },
  {
    title: "Education",
    href: "/education",
    area: "education",
    description: "Masterarbeit, Literatur, Skills und Lernlog.",
  },
  {
    title: "Work",
    href: "/work",
    area: "work",
    description: "Arbeitslog, Follow-ups und Work-Aufgaben.",
  },
  {
    title: "Coding",
    href: "/coding",
    area: "coding",
    description: "Coding-Projekte, Repos und Agent Sessions.",
  },
  {
    title: "Health",
    href: "/health",
    area: "health",
    description: "Training, Habits und Tageszustand.",
  },
  {
    title: "Nutrition",
    href: "/nutrition",
    area: "nutrition",
    description: "Meal Prep, Rezepte und Einkauf.",
  },
  {
    title: "Personal",
    href: "/personal",
    area: "personal",
    description: "Private Projekte, Alltag und persönliche Notizen.",
  },
];

export const PLACEHOLDER_PAGES: Record<
  Exclude<AppRoute, "/dashboard">,
  PlaceholderPageConfig
> = {
  "/today": {
    title: "Today",
    description: "Die spätere operative Tagesansicht für Fokus, Tasks und Review-Hinweise.",
    future:
      "Hier entsteht der manuelle Today Flow mit Tagesplanung, Fokusblock, Aufgabenliste und Tagesabschluss.",
  },
  "/inbox": {
    title: "Inbox",
    description: "Der Ort für Gedanken, Aufgaben, Fragen und rohe Ideen.",
    future:
      "Hier entsteht Inbox Processing: erfassen, klären, umwandeln oder archivieren.",
  },
  "/week": {
    title: "Week",
    description: "Eine ruhige Wochenansicht für Prioritäten, Kapazität und Rhythmus.",
    future:
      "Hier entsteht Wochenplanung mit Fokus, offenen Aufgaben, Review-Hinweisen und Health-Kontext.",
  },
  "/projects": {
    title: "Projects",
    description: "Aktive Projekte mit Fortschritt, Risiko und nächstem Schritt.",
    future:
      "Hier entsteht die Projektübersicht mit Roadmap, Projektstatus und Detailseiten.",
  },
  "/goals": {
    title: "Goals",
    description: "Quartalsrichtung und Ziele, die Projekte und Wochenfokus verbinden.",
    future:
      "Hier entsteht die Zielansicht mit Horizon, Fortschritt, Warum und verknüpften Projekten.",
  },
  "/review": {
    title: "Review",
    description: "Daily Log, Weekly Review und offene Loops an einem Ort.",
    future:
      "Hier entsteht der Review Flow mit Wins, Lessons, Open Loops und nächstem Fokus.",
  },
  "/education": {
    title: "Education",
    description: "Masterarbeit, Literatur, Skill-Aufbau und Lernlog.",
    future:
      "Hier entsteht das Education Dashboard für Forschung, Literaturpipeline und Java-Lernen.",
  },
  "/work": {
    title: "Work",
    description: "Arbeitsaufgaben, Arbeitslog, Follow-ups und Learnings.",
    future:
      "Hier entsteht der Work Bereich für Aufgaben, Tickets, Blocker und Arbeitsnotizen.",
  },
  "/coding": {
    title: "Coding",
    description: "Coding-Projekte, Repos, Prompts und Agent Sessions.",
    future:
      "Hier entsteht der Coding- und Agentenbereich mit Projektkontext und Review-Pflicht.",
  },
  "/health": {
    title: "Health",
    description: "Training, Habits, Energie und Tageszustand.",
    future:
      "Hier entsteht der Health Bereich für Training, Routinen und einfache Zustandslogs.",
  },
  "/nutrition": {
    title: "Nutrition",
    description: "Meal Prep, Rezepte, Einkauf und Protein-Fokus.",
    future:
      "Hier entsteht der Nutrition Bereich für einfache Gerichte, Planungen und Einkaufslisten.",
  },
  "/personal": {
    title: "Personal",
    description: "Private Projekte, Alltag, Journal und persönliche Steuerung.",
    future:
      "Hier entsteht der Personal Bereich für private Projekte, Admin und persönliche Notizen.",
  },
};
