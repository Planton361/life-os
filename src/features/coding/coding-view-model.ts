import type {
  AgentSession,
  AgentSessionViewModel,
  CodingOverviewViewModel,
  CodingProject,
  CodingRhythmDayViewModel,
  CodingSession,
  KnowledgeUpdateViewModel,
  Repository,
  RepositoryAttentionViewModel,
  RepositorySignal,
} from "./types";

const codingProjects: CodingProject[] = [
  {
    id: "project-life-os-coding",
    title: "Life OS Coding Area",
    status: "active",
    nextAction:
      "Repository-Detail-Inspector pruefen und Agent-Review als Note speichern",
    area: "Coding",
  },
  {
    id: "project-agent-workflow",
    title: "AI Agent Workflow",
    status: "review",
    nextAction:
      "Prompt-Review-Status mit klarer Human-Decision festlegen",
    area: "Coding",
  },
  {
    id: "project-java-hyperskill",
    title: "Java / Hyperskill",
    status: "learning",
    nextAction:
      "Naechste Collections-Modul-Aufgabe abschliessen",
    area: "Education",
  },
];

const repositories: Repository[] = [
  {
    id: "repo-life-os",
    name: "anton/life-os-app",
    provider: "GitHub",
    defaultBranch: "feature/coding-overview",
    status: "needs_action",
    lastActivityAt: "2026-06-21T09:20:00+02:00",
    nextAction:
      "Inspector-State und Review-Sheet mit sichtbarer Validierung pruefen",
  },
  {
    id: "repo-supabase-sandbox",
    name: "supabase-sandbox",
    provider: "GitHub",
    defaultBranch: "main",
    status: "failed_check",
    lastActivityAt: "2026-06-19T18:10:00+02:00",
    nextAction:
      "Typecheck-Fehler aus RLS-Notizen isolieren und nicht in Life OS kopieren",
  },
  {
    id: "repo-agent-prompts",
    name: "agent-prompts",
    provider: "Local",
    defaultBranch: "main",
    status: "open_review",
    lastActivityAt: "2026-06-20T21:45:00+02:00",
    nextAction:
      "Vier unreviewte Prompt-Snippets lesen und Review-Status setzen",
  },
  {
    id: "repo-java-training",
    name: "java-training",
    provider: "GitHub",
    defaultBranch: "main",
    status: "stale_branch",
    lastActivityAt: "2026-06-09T16:00:00+02:00",
    nextAction:
      "Naechste kleine Uebung definieren oder Repository bewusst parken",
  },
];

const codingSessions: CodingSession[] = [
  {
    id: "session-repo-inspector",
    projectId: "project-life-os-coding",
    repositoryId: "repo-life-os",
    goal: "Repository inspector sketch",
    startedAt: "2026-06-21T08:00:00+02:00",
    endedAt: "2026-06-21T09:12:00+02:00",
    outcome:
      "Inspector-State, Review Sheet und lokale Save-Feedbacks sind als UI-Zustaende gemappt.",
  },
  {
    id: "session-prompt-refinement",
    projectId: "project-agent-workflow",
    repositoryId: "repo-agent-prompts",
    goal: "Codex prompt refinement",
    startedAt: "2026-06-20T19:15:00+02:00",
    endedAt: "2026-06-20T20:00:00+02:00",
    outcome:
      "Review-Kriterien fuer Agentenoutputs geschaerft; Entscheidung bleibt menschlich.",
  },
  {
    id: "session-rls-research",
    projectId: "project-life-os-coding",
    repositoryId: "repo-supabase-sandbox",
    goal: "Supabase RLS research",
    startedAt: "2026-06-20T10:00:00+02:00",
    endedAt: "2026-06-20T10:55:00+02:00",
    outcome:
      "RLS-Muster fuer user-owned rows notiert; Service Role bleibt aus Client-Code raus.",
  },
];

const agentSessions: AgentSession[] = [
  {
    id: "agent-codex-route-draft",
    status: "review_needed",
    promptRef: "Codex output: Coding route draft",
    outputSummary:
      "Codex schlug /coding Sections, Repository Inspector und Review Flow vor. Component-Namen und State-Grenzen muessen geprueft werden.",
    reviewNeeded: true,
  },
  {
    id: "agent-portfolio-flow",
    status: "active",
    promptRef: "Prompt cleanup: portfolio flow",
    outputSummary:
      "Segmentiert aktive Scope-Fragen fuer Portfolio-Filter und vermeidet automatische Uebernahmen.",
    reviewNeeded: false,
  },
  {
    id: "agent-notes-extraction",
    status: "completed",
    promptRef: "Design notes extraction",
    outputSummary:
      "Komponenten- und State-Hinweise extrahiert; keine produktiven Daten wurden geaendert.",
    reviewNeeded: false,
  },
];

const repositorySignals: Record<
  string,
  {
    signals: RepositorySignal[];
    summary: string;
    checksSummary: string;
    reviewSummary: string;
  }
> = {
  "repo-life-os": {
    signals: ["missing_next_action", "open_review"],
    summary:
      "Next Action fehlt im echten Repo-Kontext, waehrend ein Agent Review offen ist.",
    checksSummary: "Checks mocked: no live GitHub call",
    reviewSummary: "1 generated suggestion needs review",
  },
  "repo-supabase-sandbox": {
    signals: ["failed_check"],
    summary:
      "Sandbox enthaelt absichtlich einen fehlgeschlagenen Check aus RLS-Experimenten.",
    checksSummary: "1 failed check: type model draft",
    reviewSummary: "No open review",
  },
  "repo-agent-prompts": {
    signals: ["open_review"],
    summary:
      "Prompt Library hat unreviewte Snippets; nichts automatisch uebernehmen.",
    checksSummary: "Manual prompt library",
    reviewSummary: "4 snippets require human review",
  },
  "repo-java-training": {
    signals: ["stale_branch"],
    summary:
      "Lern-Repository ist seit mehreren Tagen ruhig und braucht eine kleine naechste Aufgabe.",
    checksSummary: "No checks configured",
    reviewSummary: "No agent output pending",
  },
};

const signalMeta: Record<
  RepositorySignal,
  {
    label: string;
    accent: string;
    rank: number;
  }
> = {
  open_review: {
    label: "Open review",
    accent: "var(--accent-orange)",
    rank: 1,
  },
  failed_check: {
    label: "Failed check",
    accent: "var(--accent-red)",
    rank: 2,
  },
  missing_next_action: {
    label: "Missing next action",
    accent: "var(--accent-blue)",
    rank: 3,
  },
  stale_branch: {
    label: "Stale branch",
    accent: "var(--accent-cyan)",
    rank: 4,
  },
};

const knowledgeUpdates: KnowledgeUpdateViewModel[] = [
  {
    id: "knowledge-rls-pattern",
    type: "Decision",
    title: "RLS policy pattern for user-owned rows",
    summary: "user_id required, service role never in client",
    updatedAt: "Today",
    accent: "var(--accent-cyan)",
  },
  {
    id: "knowledge-agent-review",
    type: "Note",
    title: "Agent output review checklist",
    summary: "Accept, edit, reject or save as note before use",
    updatedAt: "Yesterday",
    accent: "var(--accent-orange)",
  },
  {
    id: "knowledge-form-validation",
    type: "Snippet",
    title: "shadcn form validation baseline",
    summary: "React Hook Form + Zod spaeter, aktuell sichtbare inline errors",
    updatedAt: "Jun 19",
    accent: "var(--accent-blue)",
  },
];

const rhythmDays: CodingRhythmDayViewModel[] = [
  { day: "Mon", sessions: 1, minutes: 42, label: "1 session · 42m" },
  { day: "Tue", sessions: 0, minutes: 15, label: "Review notes · 15m" },
  { day: "Wed", sessions: 1, minutes: 72, label: "1 session · 1h 12m" },
  { day: "Thu", sessions: 1, minutes: 54, label: "1 session · 54m" },
  { day: "Fri", sessions: 0, minutes: 18, label: "Small cleanup · 18m" },
  { day: "Sat", sessions: 1, minutes: 84, label: "1 session · 1h 24m" },
  { day: "Sun", sessions: 0, minutes: 38, label: "Planning · 38m" },
];

function findProject(projectId: string) {
  return codingProjects.find((project) => project.id === projectId);
}

function findRepository(repositoryId: string) {
  return repositories.find((repository) => repository.id === repositoryId);
}

function dateLabel(value: string) {
  const date = value.slice(0, 10);

  if (date === "2026-06-21") {
    return "Today";
  }

  if (date === "2026-06-20") {
    return "Yesterday";
  }

  if (date === "2026-06-19") {
    return "Jun 19";
  }

  return "12 days ago";
}

function durationLabel(startedAt: string, endedAt?: string) {
  if (!endedAt) {
    return "running";
  }

  const minutes = Math.max(
    1,
    Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000,
    ),
  );
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function primarySignal(signals: RepositorySignal[]) {
  return [...signals].sort(
    (left, right) => signalMeta[left].rank - signalMeta[right].rank,
  )[0];
}

function buildAgentQueue(): AgentSessionViewModel[] {
  const statusMeta: Record<
    AgentSession["status"],
    {
      statusLabel: string;
      statusAccent: string;
      helperText: string;
      rank: number;
    }
  > = {
    review_needed: {
      statusLabel: "Review needed",
      statusAccent: "var(--accent-orange)",
      helperText: "Generated suggestion · open before applying",
      rank: 1,
    },
    active: {
      statusLabel: "Active",
      statusAccent: "var(--accent-blue)",
      helperText: "Running context is visible, not autonomous",
      rank: 2,
    },
    completed: {
      statusLabel: "Completed",
      statusAccent: "var(--accent-green)",
      helperText: "Completed output remains inspectable",
      rank: 3,
    },
  };

  return [...agentSessions]
    .sort(
      (left, right) =>
        statusMeta[left.status].rank - statusMeta[right.status].rank,
    )
    .map((session) => ({
      ...session,
      statusLabel: statusMeta[session.status].statusLabel,
      statusAccent: statusMeta[session.status].statusAccent,
      helperText: statusMeta[session.status].helperText,
    }));
}

function buildRepositoryAttention(): RepositoryAttentionViewModel[] {
  return repositories
    .map((repository) => {
      const signals = repositorySignals[repository.id]?.signals ?? [];
      const primary = primarySignal(signals);
      const meta = primary ? signalMeta[primary] : signalMeta.missing_next_action;
      const details = repositorySignals[repository.id];

      return {
        repositoryId: repository.id,
        name: repository.name,
        provider: repository.provider,
        defaultBranch: repository.defaultBranch,
        status: repository.status,
        lastActivityAt: repository.lastActivityAt,
        lastActivityLabel: dateLabel(repository.lastActivityAt),
        nextAction: repository.nextAction,
        summary: details?.summary ?? repository.nextAction,
        signals,
        primarySignalLabel: meta.label,
        primarySignalAccent: meta.accent,
        checksSummary: details?.checksSummary ?? "Manual signal only",
        reviewSummary: details?.reviewSummary ?? "No review signal",
      };
    })
    .sort((left, right) => {
      const leftSignal = primarySignal(left.signals);
      const rightSignal = primarySignal(right.signals);

      return (
        (leftSignal ? signalMeta[leftSignal].rank : 99) -
        (rightSignal ? signalMeta[rightSignal].rank : 99)
      );
    });
}

function buildRecentSessions(): CodingOverviewViewModel["recentSessions"] {
  return codingSessions.map((session) => {
    const project = findProject(session.projectId);
    const repository = findRepository(session.repositoryId);

    return {
      ...session,
      projectTitle: project?.title ?? "Unknown project",
      repositoryName: repository?.name ?? "Unknown repository",
      durationLabel: durationLabel(session.startedAt, session.endedAt),
      timeLabel: dateLabel(session.startedAt),
      outcomeLabel:
        session.outcome.length > 74
          ? `${session.outcome.slice(0, 71)}...`
          : session.outcome,
    };
  });
}

export function getCodingOverviewViewModel(): CodingOverviewViewModel {
  const currentProject = codingProjects[0];
  const currentRepository = repositories[0];
  const reviewNeededCount = agentSessions.filter(
    (session) => session.reviewNeeded,
  ).length;

  return {
    profileId: "demo",
    header: {
      eyebrow: "Life OS / Coding",
      title: "Coding Overview",
      summary:
        "Steuert aktuelle Coding-Projekte, Repositories, Agent Reviews und technisches Wissen.",
      contextLine: "Today context · Static mock data · no GitHub or Supabase sync",
      primaryAction: "Start coding session",
      secondaryActions: ["Add repository", "Capture code note"],
      stats: [
        { label: "1 focus", accent: "var(--accent-blue)" },
        { label: "3 active repos", accent: "var(--accent-blue)" },
        {
          label: `${reviewNeededCount} review needed`,
          accent: "var(--accent-orange)",
        },
      ],
    },
    pageContract: {
      pageType: "Area Dashboard",
      primaryPurpose:
        "Steuern und Handeln fuer aktuelle Coding-Arbeit, technische Reviews und Wissen.",
      writes:
        "Phase 2 local UI state only: session draft, capture note draft, review decision feedback.",
      reads:
        "Mock views for repositories, coding projects, coding sessions, agent sessions, resources and skills.",
      canonicalSource:
        "Future canonical repositories, projects, resources, skills and agent_sessions; this page only projects mock data.",
      sensitiveData: "standard_private / work_restricted depending on repository context",
      primaryDecision:
        "Which repository or generated output needs the next human action?",
      mainZone:
        "Current Focus with one checkable next step plus adjacent Active Work.",
      emptyState:
        "No repositories or no focus states explain the next manual setup step.",
      mobileOrder:
        "Current Focus, Start session, Agent Review needed, Active Work, Repositories attention, Recent Sessions, Skill Focus, Knowledge Updates.",
    },
    projects: codingProjects,
    repositories,
    currentFocus: currentProject
      ? {
          projectId: currentProject.id,
          repositoryId: currentRepository.id,
          projectTitle: currentProject.title,
          repositoryName: currentRepository.name,
          branchContext: `${currentRepository.defaultBranch} · /coding`,
          nextAction: currentProject.nextAction,
          plannedDuration: "90 min",
          expectedOutput: "1 output",
          contextLabel: "Next.js · TypeScript · local UI state",
        }
      : null,
    activeWork: codingProjects.slice(0, 3).map((project, index) => {
      const repository = repositories[index] ?? repositories[0];

      return {
        id: `active-${project.id}`,
        projectId: project.id,
        repositoryId: repository.id,
        title: project.title,
        repositoryName: repository.name,
        status: project.status,
        nextAction: project.nextAction,
        area: project.area,
        accent:
          project.status === "review"
            ? "var(--accent-orange)"
            : project.status === "learning"
              ? "var(--accent-cyan)"
              : "var(--accent-blue)",
      };
    }),
    agentQueue: buildAgentQueue(),
    repositoriesAttention: buildRepositoryAttention(),
    recentSessions: buildRecentSessions(),
    skillFocus: {
      title: "Type-safe server actions",
      summary:
        "Aktuelles Lernziel: Mutations mit Zod validieren, Server Action trennen und RLS nicht umgehen.",
      evidenceStatus: "Evidence set",
      progress: 62,
      evidenceDetail: "62% evidence · 2 commits · 1 note · 1 reviewed failure",
      primaryAction: "Plan practice",
      secondaryAction: "Open skill note",
    },
    knowledgeUpdates,
    codingRhythm: {
      title: "Coding Rhythm",
      period: "Last 7 days",
      statement: "4 sessions · 6h 20m · Rhythm stable, no streak pressure.",
      days: rhythmDays,
      insight:
        "Kernaussage: Die produktivsten Sessions entstehen nach klarer Next Action, nicht nach Repo-Aktivitaet allein.",
    },
    emptyStates: {
      noRepositories: {
        title: "No repositories yet",
        description:
          "Add a repository to connect coding work, sessions and notes. No GitHub sync is assumed.",
      },
      noFocus: {
        title: "No active coding focus",
        description:
          "Pick one project and define a checkable next step before starting a session.",
      },
    },
  };
}
