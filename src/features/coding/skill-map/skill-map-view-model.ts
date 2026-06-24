import type {
  CodingSkill,
  FutureCodingProject,
  LearningRecommendation,
  ProjectSkillRequirement,
  SkillCluster,
  SkillConnection,
  SkillEvidence,
  SkillMapViewModel,
} from "./types";

const skills: CodingSkill[] = [
  {
    id: "skill-react",
    title: "React",
    category: "frontend",
    status: "strong",
    level: "solid",
    confidence: 86,
    summary:
      "Komponenten, State und UI-Flows sind in Life OS bereits praktisch eingesetzt.",
    evidenceCount: 8,
    lastUsedAt: "Today",
    nextPractice: "Server/Client-Grenzen in komplexeren Forms bewusster dokumentieren.",
    x: 22,
    y: 20,
  },
  {
    id: "skill-next-app-router",
    title: "Next.js App Router",
    category: "frontend",
    status: "usable",
    level: "working",
    confidence: 72,
    summary:
      "Routes, Loading States und Server Components funktionieren, Build-Suspense-Themen brauchen Routine.",
    evidenceCount: 6,
    lastUsedAt: "Today",
    nextPractice: "Eine kleine Route mit Search Params sauber hinter Suspense kapseln.",
    x: 38,
    y: 18,
  },
  {
    id: "skill-typescript",
    title: "TypeScript Strictness",
    category: "language",
    status: "strong",
    level: "solid",
    confidence: 84,
    summary:
      "Typisierte ViewModels, Union-Status und lokale UI-Drafts sind stabil nutzbar.",
    evidenceCount: 9,
    lastUsedAt: "Today",
    nextPractice: "Wiederverwendbare Helper enger typisieren ohne Overengineering.",
    x: 52,
    y: 28,
  },
  {
    id: "skill-tailwind",
    title: "Tailwind CSS",
    category: "frontend",
    status: "usable",
    level: "working",
    confidence: 74,
    summary:
      "V5-nahe Layouts und States sind umsetzbar; Farb-/Dichteentscheidungen bleiben reviewpflichtig.",
    evidenceCount: 7,
    lastUsedAt: "Today",
    nextPractice: "Mobile-Listen gegen Desktop-Map sauber priorisieren.",
    x: 26,
    y: 42,
  },
  {
    id: "skill-design-system",
    title: "Design System Implementation",
    category: "design_system",
    status: "learning",
    level: "working",
    confidence: 63,
    summary:
      "Lokale Primitives werden wiederverwendet, ein konsistentes Komponentenmodell entsteht noch.",
    evidenceCount: 4,
    lastUsedAt: "Today",
    nextPractice: "Coding-Primitives auf Wiederverwendung und Grenzen prüfen.",
    x: 14,
    y: 58,
  },
  {
    id: "skill-supabase",
    title: "Supabase",
    category: "backend",
    status: "learning",
    level: "basic",
    confidence: 44,
    summary:
      "Konzeptuell bekannt, aber noch keine produktive Life-OS-Datenbindung im MVP.",
    evidenceCount: 2,
    lastUsedAt: "Jun 20",
    nextPractice: "Lokale Sandbox-Tabelle mit user_id und RLS-Notiz planen.",
    x: 66,
    y: 18,
  },
  {
    id: "skill-postgres",
    title: "PostgreSQL",
    category: "database",
    status: "weak",
    level: "basic",
    confidence: 38,
    summary:
      "Datenmodellierung ist dokumentiert, Query- und Constraint-Routine fehlt noch.",
    evidenceCount: 1,
    lastUsedAt: "Jun 19",
    nextPractice: "Skill- und Resource-Entity als kleine Schema-Skizze ausarbeiten.",
    x: 78,
    y: 34,
  },
  {
    id: "skill-rls",
    title: "Row Level Security",
    category: "database",
    status: "missing",
    level: "none",
    confidence: 18,
    summary:
      "Blockiert Supabase-Projekte, bis Ownership, Policies und Tests praktisch geübt sind.",
    evidenceCount: 0,
    nextPractice: "Eine minimale user-owned Policy in der Sandbox nachvollziehen.",
    x: 86,
    y: 18,
  },
  {
    id: "skill-zod",
    title: "Zod Validation",
    category: "backend",
    status: "learning",
    level: "basic",
    confidence: 42,
    summary:
      "Als Architekturregel vorhanden, aber noch wenig in echten Mutations genutzt.",
    evidenceCount: 1,
    lastUsedAt: "Jun 18",
    nextPractice: "Ein kleines Form-Draft-Schema schreiben und Fehlermeldungen mappen.",
    x: 70,
    y: 54,
  },
  {
    id: "skill-playwright",
    title: "Playwright",
    category: "testing",
    status: "usable",
    level: "working",
    confidence: 61,
    summary:
      "E2E-Routenchecks sind vorhanden; visuelle und Accessibility-QA sind noch selektiv.",
    evidenceCount: 3,
    lastUsedAt: "Jun 20",
    nextPractice: "Eine mobile Smoke-Prüfung für eine neue Area-Seite ergänzen.",
    x: 46,
    y: 72,
  },
  {
    id: "skill-code-review",
    title: "Code Review",
    category: "testing",
    status: "strong",
    level: "solid",
    confidence: 82,
    summary:
      "Review-Grenzen, Risiken und Validierung werden in Codex-Aufgaben konsequent sichtbar gemacht.",
    evidenceCount: 7,
    lastUsedAt: "Today",
    nextPractice: "Findings mit Datei-/Zeilenbezug bei echten PRs stärker standardisieren.",
    x: 58,
    y: 76,
  },
  {
    id: "skill-codex-prompting",
    title: "Codex Prompting",
    category: "ai_agents",
    status: "strong",
    level: "solid",
    confidence: 80,
    summary:
      "Mehrdateiige UI-Aufgaben werden mit klaren Grenzen, Docs und Validierung geführt.",
    evidenceCount: 6,
    lastUsedAt: "Today",
    nextPractice: "Prompt-Vorlagen nach Page Type konsolidieren.",
    x: 18,
    y: 80,
  },
  {
    id: "skill-agent-review",
    title: "Agent Review Workflow",
    category: "ai_agents",
    status: "usable",
    level: "working",
    confidence: 69,
    summary:
      "Agent Outputs sind als Vorschläge mit Review-Status modelliert, keine Autonomie-Illusion.",
    evidenceCount: 4,
    lastUsedAt: "Today",
    nextPractice: "Review Queue mit echten Task-Entities später verbinden.",
    x: 32,
    y: 82,
  },
  {
    id: "skill-feature-structure",
    title: "Feature Folder Structure",
    category: "architecture",
    status: "usable",
    level: "working",
    confidence: 75,
    summary:
      "Feature-nahe Types, ViewModels und Client-Views sind etabliert.",
    evidenceCount: 5,
    lastUsedAt: "Today",
    nextPractice: "Gemeinsame Primitives nicht zu früh globalisieren.",
    x: 48,
    y: 52,
  },
  {
    id: "skill-server-actions",
    title: "Server Actions",
    category: "backend",
    status: "weak",
    level: "basic",
    confidence: 30,
    summary:
      "Noch nicht produktiv genutzt; wichtig für spätere sichere Mutations.",
    evidenceCount: 0,
    nextPractice: "Eine nicht-persistierende Server-Action-Skizze mit Zod-Grenze planen.",
    x: 82,
    y: 68,
  },
];

const connections: SkillConnection[] = [
  { id: "edge-react-next", sourceSkillId: "skill-react", targetSkillId: "skill-next-app-router", type: "used_with", strength: "strong" },
  { id: "edge-react-tailwind", sourceSkillId: "skill-react", targetSkillId: "skill-tailwind", type: "used_with", strength: "strong" },
  { id: "edge-tailwind-design", sourceSkillId: "skill-tailwind", targetSkillId: "skill-design-system", type: "supports", strength: "medium" },
  { id: "edge-next-typescript", sourceSkillId: "skill-next-app-router", targetSkillId: "skill-typescript", type: "used_with", strength: "strong" },
  { id: "edge-types-feature", sourceSkillId: "skill-typescript", targetSkillId: "skill-feature-structure", type: "supports", strength: "strong" },
  { id: "edge-supabase-postgres", sourceSkillId: "skill-supabase", targetSkillId: "skill-postgres", type: "prerequisite", strength: "strong" },
  { id: "edge-postgres-rls", sourceSkillId: "skill-postgres", targetSkillId: "skill-rls", type: "prerequisite", strength: "strong" },
  { id: "edge-zod-actions", sourceSkillId: "skill-zod", targetSkillId: "skill-server-actions", type: "supports", strength: "medium" },
  { id: "edge-supabase-actions", sourceSkillId: "skill-supabase", targetSkillId: "skill-server-actions", type: "used_with", strength: "medium" },
  { id: "edge-playwright-review", sourceSkillId: "skill-playwright", targetSkillId: "skill-code-review", type: "supports", strength: "medium" },
  { id: "edge-codex-agent-review", sourceSkillId: "skill-codex-prompting", targetSkillId: "skill-agent-review", type: "extends", strength: "strong" },
  { id: "edge-review-code-review", sourceSkillId: "skill-agent-review", targetSkillId: "skill-code-review", type: "supports", strength: "medium" },
  { id: "edge-feature-next", sourceSkillId: "skill-feature-structure", targetSkillId: "skill-next-app-router", type: "related", strength: "medium" },
  { id: "edge-feature-actions", sourceSkillId: "skill-feature-structure", targetSkillId: "skill-server-actions", type: "supports", strength: "weak" },
];

const clusters: SkillCluster[] = [
  {
    id: "cluster-frontend",
    title: "Frontend",
    category: "frontend",
    description: "React, Next.js, Tailwind and responsive UI execution.",
    colorToken: "blue",
    skillIds: ["skill-react", "skill-next-app-router", "skill-tailwind", "skill-design-system"],
  },
  {
    id: "cluster-backend-data",
    title: "Backend / Data",
    category: "backend",
    description: "Supabase, Postgres, RLS, Zod and secure mutations.",
    colorToken: "orange",
    skillIds: ["skill-supabase", "skill-postgres", "skill-rls", "skill-zod", "skill-server-actions"],
  },
  {
    id: "cluster-quality",
    title: "Testing / Quality",
    category: "testing",
    description: "Type checks, Playwright, accessibility QA and review discipline.",
    colorToken: "green",
    skillIds: ["skill-typescript", "skill-playwright", "skill-code-review"],
  },
  {
    id: "cluster-agents",
    title: "Agents",
    category: "ai_agents",
    description: "Codex prompting, agent review workflow and prompt library habits.",
    colorToken: "purple",
    skillIds: ["skill-codex-prompting", "skill-agent-review"],
  },
  {
    id: "cluster-architecture",
    title: "Architecture",
    category: "architecture",
    description: "Feature folders, ViewModel mapping and component extraction.",
    colorToken: "cyan",
    skillIds: ["skill-feature-structure", "skill-typescript", "skill-next-app-router"],
  },
];

const projects: FutureCodingProject[] = [
  {
    id: "project-supabase-foundation",
    title: "Life OS Supabase Foundation",
    description: "Auth, user-owned tables, RLS and first protected mutations.",
    status: "planned",
    priority: "high",
    requiredSkillIds: ["skill-supabase", "skill-postgres", "skill-rls", "skill-zod", "skill-server-actions"],
    optionalSkillIds: ["skill-playwright", "skill-code-review"],
    nextAction: "Practice RLS with one minimal user-owned table before migration work.",
  },
  {
    id: "project-agent-context-pipeline",
    title: "Agent Context Pipeline",
    description: "Reviewed prompt/context bundles for future agent work.",
    status: "planned",
    priority: "high",
    requiredSkillIds: ["skill-codex-prompting", "skill-agent-review", "skill-feature-structure", "skill-typescript"],
    optionalSkillIds: ["skill-playwright", "skill-design-system"],
    nextAction: "Define prompt bundle review states before any automation.",
  },
  {
    id: "project-health-import",
    title: "Health Data Import",
    description: "Later importer for personal health files with strict privacy boundaries.",
    status: "idea",
    priority: "medium",
    requiredSkillIds: ["skill-typescript", "skill-zod", "skill-server-actions", "skill-code-review"],
    optionalSkillIds: ["skill-supabase", "skill-playwright"],
    nextAction: "Document allowed import file shape and privacy class.",
  },
  {
    id: "project-nutrition-planner",
    title: "Nutrition Planner",
    description: "Planner workflows for meals, recipes and grocery decisions.",
    status: "active",
    priority: "medium",
    requiredSkillIds: ["skill-react", "skill-next-app-router", "skill-tailwind", "skill-design-system"],
    optionalSkillIds: ["skill-playwright", "skill-zod"],
    nextAction: "Turn one planner interaction into a small mobile-first QA case.",
  },
  {
    id: "project-repository-inspector",
    title: "Coding Repository Inspector",
    description: "Manual repository view with linked tasks, resources and sessions.",
    status: "active",
    priority: "medium",
    requiredSkillIds: ["skill-react", "skill-typescript", "skill-feature-structure", "skill-code-review"],
    optionalSkillIds: ["skill-agent-review", "skill-playwright"],
    nextAction: "Review inspector states and keep GitHub boundary server-side.",
  },
  {
    id: "project-literature-workflow",
    title: "Education Literature Workflow",
    description: "Scientific work and literature resource workflow.",
    status: "later",
    priority: "low",
    requiredSkillIds: ["skill-react", "skill-next-app-router", "skill-feature-structure"],
    optionalSkillIds: ["skill-supabase", "skill-design-system"],
    nextAction: "Sketch resource links before adding data persistence.",
  },
];

function fitForSkill(skillId: string): ProjectSkillRequirement["currentFit"] {
  const skill = skills.find((item) => item.id === skillId);

  if (!skill || skill.status === "missing" || skill.status === "weak") {
    return "gap";
  }

  if (skill.status === "learning" || skill.level === "basic") {
    return "partial";
  }

  return "ready";
}

const requirements: ProjectSkillRequirement[] = projects.flatMap((project) => [
  ...project.requiredSkillIds.map((skillId) => ({
    projectId: project.id,
    skillId,
    importance: "required" as const,
    currentFit: fitForSkill(skillId),
    note:
      fitForSkill(skillId) === "gap"
        ? "Blocks or increases risk until practiced."
        : fitForSkill(skillId) === "partial"
          ? "Usable with focused practice."
          : "Ready for current project scope.",
  })),
  ...project.optionalSkillIds.map((skillId) => ({
    projectId: project.id,
    skillId,
    importance: "optional" as const,
    currentFit: fitForSkill(skillId),
    note: "Helpful but not required for first project pass.",
  })),
]);

const evidence: SkillEvidence[] = [
  { id: "evidence-coding-overview", skillId: "skill-react", title: "Coding Overview UI", type: "project", sourceTitle: "Life OS App", createdAt: "Today" },
  { id: "evidence-agent-hub", skillId: "skill-agent-review", title: "Agent Hub review queue", type: "session", sourceTitle: "Agent Hub", createdAt: "Today" },
  { id: "evidence-repo-workbench", skillId: "skill-feature-structure", title: "Repository feature folder", type: "repo", sourceTitle: "anton/life-os-app", createdAt: "Today" },
  { id: "evidence-ts-viewmodels", skillId: "skill-typescript", title: "Typed ViewModel mapping", type: "task", sourceTitle: "Coding pages", createdAt: "Today" },
  { id: "evidence-v5-ui", skillId: "skill-design-system", title: "V5 page implementation notes", type: "note", sourceTitle: "Design docs", createdAt: "Jun 20" },
  { id: "evidence-playwright-route", skillId: "skill-playwright", title: "Route smoke checks", type: "task", sourceTitle: "Local validation", createdAt: "Jun 20" },
  { id: "evidence-supabase-notes", skillId: "skill-supabase", title: "Supabase boundary notes", type: "note", sourceTitle: "Supabase Foundation", createdAt: "Jun 19" },
  { id: "evidence-codex-prompts", skillId: "skill-codex-prompting", title: "Scoped Codex task prompts", type: "note", sourceTitle: "AI Workflow", createdAt: "Today" },
];

const recommendations: LearningRecommendation[] = [
  {
    id: "rec-rls-practice",
    skillId: "skill-rls",
    title: "Practice one RLS policy end to end",
    reason: "RLS is the largest blocker for Supabase Foundation.",
    linkedProjectId: "project-supabase-foundation",
    estimatedEffort: "medium",
    nextAction: "Write a tiny user-owned table plan with allow-own-row policy and test notes.",
  },
  {
    id: "rec-server-actions",
    skillId: "skill-server-actions",
    title: "Sketch a protected mutation boundary",
    reason: "Server Actions are required before real persistence is safe.",
    linkedProjectId: "project-health-import",
    estimatedEffort: "small",
    nextAction: "Create a non-persistent action contract with Zod validation notes.",
  },
  {
    id: "rec-postgres-model",
    skillId: "skill-postgres",
    title: "Model skills/resources relationship",
    reason: "Project gaps need a canonical relationship model later.",
    linkedProjectId: "project-supabase-foundation",
    estimatedEffort: "medium",
    nextAction: "Draft tables and relationship_edges without writing a migration.",
  },
  {
    id: "rec-mobile-qa",
    skillId: "skill-playwright",
    title: "Add one mobile smoke scenario",
    reason: "New Area pages should stay usable without desktop-only graphs.",
    linkedProjectId: "project-nutrition-planner",
    estimatedEffort: "small",
    nextAction: "Capture one mobile route check after UI stabilizes.",
  },
];

export function getSkillMapViewModel(): SkillMapViewModel {
  return {
    profileId: "demo",
    generatedAt: "2026-06-21T18:30:00+02:00",
    pageContract: {
      pageType: "Area Subpage / Skill Intelligence Map",
      primaryPurpose:
        "Understand coding skill strength, dependencies and project gaps.",
      writes:
        "Local UI state only: added skills, evidence drafts and practice recommendations.",
      reads:
        "Mock coding skills, mock evidence, mock project requirements and mock learning recommendations.",
      canonicalSource:
        "Future skills, resources, projects, repositories, learning_logs and relationship_edges.",
      sensitiveData:
        "Personal learning data; private mock content only, no external analysis.",
      primaryDecision:
        "Which skill gap should be practiced before the next coding project?",
      mainZone: "Skill Network Map",
      emptyState:
        "Explain manual skill tracking and offer Add skill as local draft flow.",
      mobileOrder:
        "Header, gap summary, filters, project compare, cluster cards, skill list, inspector sheet, project gaps, recommendations, evidence.",
    },
    skills,
    connections,
    clusters,
    evidence,
    projects,
    requirements,
    recommendations,
    insight:
      "Strong frontend base, backend security gaps block Supabase projects.",
    rules: [
      "Skill level is manually maintained",
      "Evidence improves confidence",
      "Project gaps are planning signals",
      "Missing does not mean failure",
      "No automatic code analysis in MVP",
    ],
    emptyStates: {
      noSkills: {
        title: "No coding skills mapped",
        description:
          "Add a local skill draft to start a manual map. No repository scan runs.",
      },
      noRequirements: {
        title: "No project requirements",
        description:
          "Project gap cards appear when future projects define required skills.",
      },
      noEvidence: {
        title: "No evidence attached",
        description:
          "Evidence can be added locally from projects, repos, tasks, notes, sessions or courses.",
      },
      noSearchResults: {
        title: "No matching skills",
        description:
          "Adjust search or filters. The underlying mock skill map is unchanged.",
      },
    },
    futureErrorState: {
      title: "Future save or sync failed",
      description:
        "Prepared error state only. No database, GitHub analysis or AI skill detection is connected.",
    },
  };
}
