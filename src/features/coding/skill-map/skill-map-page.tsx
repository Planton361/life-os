"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import {
  contentStateDataAttributes,
  resolveContentStateMeta,
} from "@/features/content-state";
import {
  CodingPanel,
  CodingPill,
  EmptyStateCard,
  FieldLabel,
  StatusDot,
  accentStyle,
  inputClass,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "../components/coding-overview-primitives";
import type {
  CodingSkill,
  CodingSkillCategory,
  CodingSkillLevel,
  CodingSkillStatus,
  FutureCodingProject,
  LearningRecommendation,
  ProjectSkillRequirement,
  SkillCluster,
  SkillEvidence,
  SkillMapFilter,
  SkillMapViewModel,
} from "./types";

type ToastState = {
  title: string;
  body: string;
  tone: "success" | "info" | "error";
};

type AddSkillDraft = {
  title: string;
  category: CodingSkillCategory;
  status: CodingSkillStatus;
  level: CodingSkillLevel;
  summary: string;
  nextPractice: string;
};

type AddEvidenceDraft = {
  skillId: string;
  title: string;
  type: SkillEvidence["type"];
  sourceTitle: string;
  note: string;
};

type PracticeDraft = {
  skillId: string;
  linkedProjectId: string;
  title: string;
  estimatedEffort: LearningRecommendation["estimatedEffort"];
  nextAction: string;
};

const defaultFilter: SkillMapFilter = {
  search: "",
  segment: "map",
  category: "all",
  status: "all",
  level: "all",
  projectId: "all",
  hasGap: false,
  hasEvidence: false,
};

const categories: CodingSkillCategory[] = [
  "frontend",
  "backend",
  "database",
  "devops",
  "testing",
  "architecture",
  "ai_agents",
  "language",
  "tooling",
  "design_system",
];

const statuses: CodingSkillStatus[] = [
  "strong",
  "usable",
  "learning",
  "weak",
  "missing",
];

const levels: CodingSkillLevel[] = [
  "none",
  "basic",
  "working",
  "solid",
  "advanced",
];

const evidenceTypes: SkillEvidence["type"][] = [
  "project",
  "repo",
  "task",
  "note",
  "session",
  "course",
];

function dialogBackdropClose(
  event: MouseEvent<HTMLDialogElement>,
  onClose: () => void,
) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function labelFromValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusAccent(status: CodingSkillStatus) {
  if (status === "strong" || status === "usable") {
    return "var(--accent-green)";
  }

  if (status === "learning") {
    return "var(--accent-orange)";
  }

  if (status === "weak" || status === "missing") {
    return "var(--accent-red)";
  }

  return "var(--text-muted)";
}

function fitAccent(fit: ProjectSkillRequirement["currentFit"]) {
  if (fit === "ready") {
    return "var(--accent-green)";
  }

  if (fit === "partial") {
    return "var(--accent-orange)";
  }

  return "var(--accent-red)";
}

function clusterAccent(colorToken: SkillCluster["colorToken"]) {
  const accents: Record<SkillCluster["colorToken"], string> = {
    blue: "var(--accent-blue)",
    cyan: "var(--accent-cyan)",
    orange: "var(--accent-orange)",
    green: "var(--accent-green)",
    purple: "var(--accent-purple)",
    gray: "var(--text-muted)",
  };

  return accents[colorToken];
}

function skillIsGap(skill: CodingSkill) {
  return skill.status === "weak" || skill.status === "missing";
}

function relatedSkillIds(viewModel: SkillMapViewModel, skillId: string) {
  return viewModel.connections
    .filter(
      (connection) =>
        connection.sourceSkillId === skillId || connection.targetSkillId === skillId,
    )
    .flatMap((connection) => [
      connection.sourceSkillId,
      connection.targetSkillId,
    ])
    .filter((id) => id !== skillId);
}

function projectRequirementFor(
  requirements: ProjectSkillRequirement[],
  projectId: string,
  skillId: string,
) {
  return requirements.find(
    (requirement) =>
      requirement.projectId === projectId && requirement.skillId === skillId,
  );
}

function summarizeProject(
  project: FutureCodingProject,
  requirements: ProjectSkillRequirement[],
) {
  const projectRequirements = requirements.filter(
    (requirement) => requirement.projectId === project.id,
  );

  return {
    total: project.requiredSkillIds.length,
    ready: projectRequirements.filter(
      (requirement) =>
        requirement.importance === "required" && requirement.currentFit === "ready",
    ).length,
    partial: projectRequirements.filter(
      (requirement) =>
        requirement.importance === "required" &&
        requirement.currentFit === "partial",
    ).length,
    gaps: projectRequirements.filter(
      (requirement) =>
        requirement.importance === "required" && requirement.currentFit === "gap",
    ).length,
  };
}

function Toast({
  toast,
  onDismiss,
}: Readonly<{
  toast: ToastState | null;
  onDismiss: () => void;
}>) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(onDismiss, 4200);

    return () => clearTimeout(timeout);
  }, [onDismiss, toast]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 w-[min(420px,calc(100vw-32px))] rounded-[14px] border bg-[rgba(18,28,43,.96)] p-4 shadow-[0_18px_48px_rgba(0,0,0,.38)]",
        toast.tone === "success" && "border-[rgba(66,184,131,.34)]",
        toast.tone === "info" && "border-[rgba(95,200,215,.34)]",
        toast.tone === "error" && "border-[rgba(221,107,95,.34)]",
      )}
      role="status"
    >
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1 size-2.5 shrink-0 rounded-full",
            toast.tone === "success" && "bg-[var(--accent-green)]",
            toast.tone === "info" && "bg-[var(--accent-cyan)]",
            toast.tone === "error" && "bg-[var(--accent-red)]",
          )}
        />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">
            {toast.title}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
            {toast.body}
          </p>
        </div>
      </div>
    </div>
  );
}

function DialogFrame({
  open,
  onClose,
  title,
  eyebrow,
  headingId,
  children,
  sheet = false,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow: string;
  headingId: string;
  children: ReactNode;
  sheet?: boolean;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-labelledby={headingId}
      className={cn(
        "m-auto w-[min(720px,calc(100vw-24px))] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop:bg-[rgba(7,11,18,.76)]",
        sheet &&
          "mr-0 h-[100dvh] max-h-[100dvh] w-[min(560px,100vw)] rounded-none sm:rounded-l-[18px]",
      )}
      onCancel={onClose}
      onClick={(event) => dialogBackdropClose(event, onClose)}
      ref={dialogRef}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-blue)]">
              {eyebrow}
            </p>
            <h2
              className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
              id={headingId}
            >
              {title}
            </h2>
          </div>
          <button
            aria-label={`Close ${title}`}
            className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>
      </div>
      {children}
    </dialog>
  );
}

function Header({
  onAddSkill,
  onAddEvidence,
  onCompareProject,
  onPlanPractice,
}: Readonly<{
  onAddSkill: () => void;
  onAddEvidence: () => void;
  onCompareProject: () => void;
  onPlanPractice: () => void;
}>) {
  return (
    <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-3 bg-[linear-gradient(90deg,rgba(91,124,250,.07),rgba(95,200,215,.045)_50%,transparent_74%)] px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
            Coding
          </p>
          <h1 className="mt-2 text-[30px] font-semibold leading-9 text-[var(--text-primary)]">
            Skill Map
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[var(--text-secondary)]">
            Coding skills, dependencies and project gaps
          </p>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button className={primaryButtonClass} onClick={onAddSkill} type="button">
            Add skill
          </button>
          <button className={secondaryButtonClass} onClick={onAddEvidence} type="button">
            Add evidence
          </button>
          <button className={secondaryButtonClass} onClick={onCompareProject} type="button">
            Compare project
          </button>
          <button className={quietButtonClass} onClick={onPlanPractice} type="button">
            Plan practice
          </button>
        </div>
      </div>
    </header>
  );
}

function FilterBar({
  filter,
  setFilter,
  viewModel,
}: Readonly<{
  filter: SkillMapFilter;
  setFilter: (filter: SkillMapFilter) => void;
  viewModel: SkillMapViewModel;
}>) {
  function update<K extends keyof SkillMapFilter>(key: K, value: SkillMapFilter[K]) {
    setFilter({ ...filter, [key]: value });
  }

  return (
    <section
      aria-label="Skill map filters"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] p-4"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.2fr)_repeat(4,minmax(140px,.75fr))_minmax(160px,.75fr)]">
        <label>
          <FieldLabel>Search skills</FieldLabel>
          <input
            className={inputClass}
            onChange={(event) => update("search", event.target.value)}
            placeholder="Search skills"
            type="search"
            value={filter.search}
          />
        </label>
        <label>
          <FieldLabel>Category</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) =>
              update("category", event.target.value as SkillMapFilter["category"])
            }
            value={filter.category}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {labelFromValue(category)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldLabel>Status</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) =>
              update("status", event.target.value as SkillMapFilter["status"])
            }
            value={filter.status}
          >
            <option value="all">All status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {labelFromValue(status)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldLabel>Level</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) =>
              update("level", event.target.value as SkillMapFilter["level"])
            }
            value={filter.level}
          >
            <option value="all">All levels</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {labelFromValue(level)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldLabel>Project</FieldLabel>
          <select
            className={inputClass}
            onChange={(event) => update("projectId", event.target.value)}
            value={filter.projectId}
          >
            <option value="all">All projects</option>
            {viewModel.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-2 pt-1">
          <label className="flex min-h-8 items-center gap-2 text-[11px] text-[var(--text-secondary)]">
            <input
              checked={filter.hasGap}
              onChange={(event) => update("hasGap", event.target.checked)}
              type="checkbox"
            />
            Has gap
          </label>
          <label className="flex min-h-8 items-center gap-2 text-[11px] text-[var(--text-secondary)]">
            <input
              checked={filter.hasEvidence}
              onChange={(event) => update("hasEvidence", event.target.checked)}
              type="checkbox"
            />
            Has evidence
          </label>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["map", "gaps", "projects", "evidence"] as SkillMapFilter["segment"][]).map(
          (segment) => (
            <button
              className={cn(
                quietButtonClass,
                filter.segment === segment &&
                  "border-[rgba(91,124,250,.5)] bg-[rgba(91,124,250,.14)] text-[var(--text-primary)]",
              )}
              key={segment}
              onClick={() => update("segment", segment)}
              type="button"
            >
              {labelFromValue(segment)}
            </button>
          ),
        )}
      </div>
    </section>
  );
}

function SkillNetworkMap({
  skills,
  viewModel,
  selectedSkillId,
  hoveredSkillId,
  selectedProject,
  onSelectSkill,
  onHoverSkill,
}: Readonly<{
  skills: CodingSkill[];
  viewModel: SkillMapViewModel;
  selectedSkillId: string;
  hoveredSkillId: string | null;
  selectedProject: FutureCodingProject | null;
  onSelectSkill: (skillId: string) => void;
  onHoverSkill: (skillId: string | null) => void;
}>) {
  const activeSkillId = hoveredSkillId ?? selectedSkillId;
  const directRelated = new Set(relatedSkillIds(viewModel, activeSkillId));
  const selectedProjectSkillIds = new Set([
    ...(selectedProject?.requiredSkillIds ?? []),
    ...(selectedProject?.optionalSkillIds ?? []),
  ]);

  return (
    <section
      {...contentStateDataAttributes(
        resolveContentStateMeta({ itemCount: skills.length }),
        viewModel.profileId,
      )}
      aria-describedby="skill-map-description"
      aria-labelledby="skill-network-map-heading"
      className="overflow-hidden rounded-[18px] border border-[rgba(91,124,250,.26)] bg-[rgba(15,23,36,.9)] shadow-[0_12px_30px_rgba(0,0,0,.18)] xl:col-span-8"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[linear-gradient(90deg,rgba(91,124,250,.11),rgba(95,200,215,.055)_52%,transparent)] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
              P0 · Skill Network
            </p>
            <h2
              className="mt-1 text-[22px] font-semibold leading-7 text-[var(--text-primary)]"
              id="skill-network-map-heading"
            >
              Skill Network Map
            </h2>
            <p
              className="mt-2 max-w-2xl text-[12px] leading-5 text-[var(--text-secondary)]"
              id="skill-map-description"
            >
              {viewModel.insight}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Strong", "Learning", "Gap", "Project required"].map((item) => (
              <CodingPill
                accent={
                  item === "Strong"
                    ? "var(--accent-green)"
                    : item === "Learning"
                      ? "var(--accent-orange)"
                      : item === "Gap"
                        ? "var(--accent-red)"
                        : "var(--accent-blue)"
                }
                key={item}
                quiet={item === "Project required"}
              >
                {item}
              </CodingPill>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <div className="relative h-[640px] min-w-[960px] rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.48)]">
          {skills.length === 0 ? (
            <div className="absolute inset-4 flex items-center justify-center">
              <EmptyStateCard
                description={viewModel.emptyStates.noSkills.description}
                title={viewModel.emptyStates.noSkills.title}
              />
            </div>
          ) : null}
          {viewModel.clusters.map((cluster) => {
            const clusterSkills = viewModel.skills.filter((skill) =>
              cluster.skillIds.includes(skill.id),
            );
            const minX = Math.min(...clusterSkills.map((skill) => skill.x));
            const maxX = Math.max(...clusterSkills.map((skill) => skill.x));
            const minY = Math.min(...clusterSkills.map((skill) => skill.y));
            const maxY = Math.max(...clusterSkills.map((skill) => skill.y));
            const style = {
              left: `${Math.max(3, minX - 8)}%`,
              top: `${Math.max(3, minY - 8)}%`,
              width: `${Math.min(94, maxX - minX + 20)}%`,
              height: `${Math.min(88, maxY - minY + 20)}%`,
              "--accent": clusterAccent(cluster.colorToken),
            } as CSSProperties;

            return (
              <div
                aria-hidden="true"
                className="absolute rounded-[18px] border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[color-mix(in_srgb,var(--accent)_7%,transparent)]"
                key={cluster.id}
                style={style}
              >
                <p className="p-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--accent)_80%,white)]">
                  {cluster.title}
                </p>
              </div>
            );
          })}

          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            focusable="false"
            viewBox="0 0 100 100"
          >
            <title>Skill connections</title>
            <desc>Static SVG lines connect related coding skills.</desc>
            {viewModel.connections.map((connection) => {
              const source = viewModel.skills.find(
                (skill) => skill.id === connection.sourceSkillId,
              );
              const target = viewModel.skills.find(
                (skill) => skill.id === connection.targetSkillId,
              );

              if (!source || !target) {
                return null;
              }

              const connected =
                source.id === activeSkillId ||
                target.id === activeSkillId ||
                (directRelated.has(source.id) && directRelated.has(target.id));

              return (
                <line
                  key={connection.id}
                  stroke={
                    connected
                      ? "var(--accent-cyan)"
                      : connection.type === "prerequisite"
                        ? "rgba(217,146,79,.38)"
                        : "rgba(148,163,184,.22)"
                  }
                  strokeDasharray={
                    connection.type === "related" || connection.strength === "weak"
                      ? "2 2"
                      : undefined
                  }
                  strokeLinecap="round"
                  strokeWidth={connected ? 0.45 : 0.24}
                  x1={source.x}
                  x2={target.x}
                  y1={source.y}
                  y2={target.y}
                />
              );
            })}
          </svg>

          {skills.map((skill) => {
            const selected = skill.id === selectedSkillId;
            const connected = directRelated.has(skill.id);
            const projectRelevant = selectedProjectSkillIds.has(skill.id);
            const requirement = selectedProject
              ? projectRequirementFor(viewModel.requirements, selectedProject.id, skill.id)
              : undefined;
            const muted =
              selectedProject && !projectRelevant && skill.id !== selectedSkillId;

            return (
              <button
                aria-label={`${skill.title}, ${labelFromValue(skill.level)}, ${labelFromValue(skill.status)}`}
                className={cn(
                  "absolute z-10 min-h-11 w-36 -translate-x-1/2 -translate-y-1/2 rounded-[14px] border bg-[rgba(18,28,43,.92)] px-3 py-2 text-left shadow-[0_10px_22px_rgba(0,0,0,.22)] transition hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                  selected && "border-[rgba(91,124,250,.72)]",
                  connected && !selected && "border-[rgba(95,200,215,.45)]",
                  projectRelevant && "ring-1 ring-[color-mix(in_srgb,var(--accent)_45%,transparent)]",
                  muted && "opacity-45",
                )}
                key={skill.id}
                onClick={() => onSelectSkill(skill.id)}
                onFocus={() => onHoverSkill(skill.id)}
                onMouseEnter={() => onHoverSkill(skill.id)}
                onMouseLeave={() => onHoverSkill(null)}
                style={
                  {
                    left: `${skill.x}%`,
                    top: `${skill.y}%`,
                    "--accent": requirement
                      ? fitAccent(requirement.currentFit)
                      : statusAccent(skill.status),
                  } as CSSProperties
                }
                type="button"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
                    {skill.title}
                  </span>
                  <StatusDot accent="var(--accent)" />
                </span>
                <span className="mt-1 block text-[10px] leading-4 text-[var(--text-muted)]">
                  {labelFromValue(skill.level)} · {labelFromValue(skill.status)}
                </span>
                <span className="mt-1 block text-[10px] text-[var(--text-faint)]">
                  Evidence {skill.evidenceCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SelectedSkillInspector({
  skill,
  relatedSkills,
  evidence,
  requiredByProjects,
  onAddEvidence,
  onPlanPractice,
  onOpenResources,
}: Readonly<{
  skill: CodingSkill | null;
  relatedSkills: CodingSkill[];
  evidence: SkillEvidence[];
  requiredByProjects: FutureCodingProject[];
  onAddEvidence: () => void;
  onPlanPractice: () => void;
  onOpenResources: () => void;
}>) {
  return (
    <CodingPanel
      {...contentStateDataAttributes(
        resolveContentStateMeta({ hasPrimaryValue: Boolean(skill), itemCount: skill ? 1 : 0 }),
        skill ? "demo" : "empty",
      )}
      className="xl:col-span-4"
      subtitle="Manual skill detail. Evidence and project links explain confidence."
      title="Selected Skill Inspector"
    >
      {!skill ? (
        <EmptyStateCard
          description="Select a skill node or list item to inspect level, evidence, related skills and project requirements."
          title="No skill selected"
        />
      ) : (
        <div className="grid gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CodingPill accent={statusAccent(skill.status)}>
                {labelFromValue(skill.status)}
              </CodingPill>
              <CodingPill accent="var(--accent-blue)" quiet>
                {labelFromValue(skill.category)}
              </CodingPill>
            </div>
            <h2 className="mt-3 text-[22px] font-semibold text-[var(--text-primary)]">
              {skill.title}
            </h2>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
              {skill.summary}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {[
              ["Level", labelFromValue(skill.level)],
              ["Confidence", `${skill.confidence}%`],
              ["Evidence", String(skill.evidenceCount)],
            ].map(([label, value], index) => (
              <div
                className="rounded-[13px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3"
                key={`coding-skill-summary-${index}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {label}
                </p>
                <p className="mt-1 text-[15px] font-semibold text-[var(--text-primary)]">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Related Skills
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {relatedSkills.length ? (
                relatedSkills.map((related) => (
                  <CodingPill
                    accent={statusAccent(related.status)}
                    key={related.id}
                    quiet
                  >
                    {related.title}
                  </CodingPill>
                ))
              ) : (
                <span className="text-[12px] text-[var(--text-muted)]">
                  No direct connections.
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Required by Projects
            </p>
            <div className="mt-2 grid gap-2">
              {requiredByProjects.length ? (
                requiredByProjects.map((project) => (
                  <div
                    className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)] p-2 text-[12px] text-[var(--text-secondary)]"
                    key={project.id}
                  >
                    {project.title}
                  </div>
                ))
              ) : (
                <span className="text-[12px] text-[var(--text-muted)]">
                  Not required by selected future projects.
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Evidence
            </p>
            <div className="mt-2 grid gap-2">
              {evidence.slice(0, 3).map((item) => (
                <div
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)] p-2"
                  key={item.id}
                >
                  <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    {labelFromValue(item.type)} · {item.sourceTitle}
                  </p>
                </div>
              ))}
              {!evidence.length ? (
                <span className="text-[12px] text-[var(--text-muted)]">
                  No evidence yet.
                </span>
              ) : null}
            </div>
          </div>
          <div className="rounded-[13px] border border-[rgba(217,146,79,.24)] bg-[rgba(217,146,79,.07)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-orange)]">
              Next Practice
            </p>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
              {skill.nextPractice ?? "No next practice defined."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={secondaryButtonClass} onClick={onAddEvidence} type="button">
              Add evidence
            </button>
            <button className={secondaryButtonClass} onClick={onPlanPractice} type="button">
              Plan practice
            </button>
            <button className={quietButtonClass} onClick={onOpenResources} type="button">
              Open resources
            </button>
          </div>
        </div>
      )}
    </CodingPanel>
  );
}

function GapSummary({
  selectedProject,
  requirements,
}: Readonly<{
  selectedProject: FutureCodingProject | null;
  requirements: ProjectSkillRequirement[];
}>) {
  if (!selectedProject) {
    return null;
  }

  const summary = summarizeProject(selectedProject, requirements);

  return (
    <section className="rounded-[18px] border border-[rgba(217,146,79,.24)] bg-[rgba(217,146,79,.06)] p-4 xl:hidden">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-orange)]">
        Skill Gap Summary
      </p>
      <h2 className="mt-1 text-[18px] font-semibold text-[var(--text-primary)]">
        {selectedProject.title}
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Ready" value={summary.ready} accent="var(--accent-green)" />
        <Metric label="Partial" value={summary.partial} accent="var(--accent-orange)" />
        <Metric label="Gaps" value={summary.gaps} accent="var(--accent-red)" />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  accent,
}: Readonly<{ label: string; value: number | string; accent: string }>) {
  return (
    <div className="rounded-[13px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-semibold text-[var(--text-primary)]">
        <span
          className="mr-2 inline-block size-2 rounded-full bg-[var(--accent)]"
          style={accentStyle(accent)}
        />
        {value}
      </p>
    </div>
  );
}

function ProjectRequirementsPanel({
  projects,
  requirements,
  selectedProjectId,
  onSelectProject,
}: Readonly<{
  projects: FutureCodingProject[];
  requirements: ProjectSkillRequirement[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
}>) {
  return (
    <CodingPanel
      {...contentStateDataAttributes(
        resolveContentStateMeta({ itemCount: projects.length }),
        "demo",
      )}
      className="xl:col-span-4"
      subtitle="Select a project to highlight required, optional and missing skills."
      title="Project Skill Gaps"
    >
      {projects.length === 0 ? (
        <EmptyStateCard
          description="Project requirements will show ready skills, partial skills and gaps once future projects are defined."
          title="No project requirements"
        />
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => {
            const summary = summarizeProject(project, requirements);
            const selected = project.id === selectedProjectId;

            return (
              <article
                className={cn(
                  "rounded-[15px] border bg-[rgba(18,28,43,.56)] p-3 transition",
                  selected
                    ? "border-[rgba(91,124,250,.55)]"
                    : "border-[var(--border-subtle)]",
                )}
                key={project.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                      {project.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                      {project.description}
                    </p>
                  </div>
                  <CodingPill
                    accent={project.priority === "high" ? "var(--accent-orange)" : "var(--accent-blue)"}
                    quiet
                  >
                    {project.priority}
                  </CodingPill>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <Metric label="Req" value={summary.total} accent="var(--accent-blue)" />
                  <Metric label="Ready" value={summary.ready} accent="var(--accent-green)" />
                  <Metric label="Partial" value={summary.partial} accent="var(--accent-orange)" />
                  <Metric label="Gap" value={summary.gaps} accent="var(--accent-red)" />
                </div>
                <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
                  {project.nextAction}
                </p>
                <button
                  className={cn(secondaryButtonClass, "mt-3 w-full")}
                  onClick={() => onSelectProject(project.id)}
                  type="button"
                >
                  Compare project
                </button>
              </article>
            );
          })}
        </div>
      )}
    </CodingPanel>
  );
}

function SkillGapMatrix({
  skills,
  projects,
  requirements,
  onExplainCell,
}: Readonly<{
  skills: CodingSkill[];
  projects: FutureCodingProject[];
  requirements: ProjectSkillRequirement[];
  onExplainCell: (message: string) => void;
}>) {
  const visibleProjects = projects.slice(0, 4);
  const relevantSkillIds = new Set(
    visibleProjects.flatMap((project) => [
      ...project.requiredSkillIds,
      ...project.optionalSkillIds,
    ]),
  );
  const visibleSkills = skills
    .filter((skill) => relevantSkillIds.has(skill.id))
    .slice(0, 10);

  return (
    <CodingPanel
      {...contentStateDataAttributes(
        resolveContentStateMeta({ itemCount: visibleSkills.length }),
        "demo",
      )}
      className="xl:col-span-8"
      subtitle="Compact project fit matrix. Every cell has a text label."
      title="Skill Gap Matrix"
    >
      {visibleProjects.length === 0 || visibleSkills.length === 0 ? (
        <EmptyStateCard
          description="Skill fit cells appear after real skills and project requirements exist. No fake fit values are shown."
          title="No skill gap matrix yet"
        />
      ) : (
      <>
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[720px]">
          <div className="grid gap-2" style={{ gridTemplateColumns: `180px repeat(${visibleProjects.length}, minmax(120px, 1fr))` }}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Skill
            </div>
            {visibleProjects.map((project) => (
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]"
                key={project.id}
              >
                {project.title}
              </div>
            ))}
            {visibleSkills.map((skill) => (
              <div className="contents" key={skill.id}>
                <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-2 text-[12px] font-semibold text-[var(--text-primary)]">
                  {skill.title}
                </div>
                {visibleProjects.map((project) => {
                  const requirement = projectRequirementFor(
                    requirements,
                    project.id,
                    skill.id,
                  );
                  const label = requirement
                    ? requirement.importance === "optional"
                      ? "Optional"
                      : labelFromValue(requirement.currentFit)
                    : "Not needed";
                  const accent = requirement
                    ? requirement.importance === "optional"
                      ? "var(--accent-cyan)"
                      : fitAccent(requirement.currentFit)
                    : "var(--text-faint)";

                  return (
                    <button
                      aria-label={`${skill.title} for ${project.title}: ${label}`}
                      className="min-h-11 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] px-2 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                      key={`${project.id}-${skill.id}`}
                      onClick={() =>
                        onExplainCell(
                          `${skill.title} for ${project.title}: ${label}. ${
                            requirement?.note ?? "No current requirement."
                          }`,
                        )
                      }
                      style={accentStyle(accent)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className="mr-2 inline-block size-2 rounded-full bg-[var(--accent)]"
                      />
                      {label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:hidden">
        {visibleProjects.map((project) => {
          const summary = summarizeProject(project, requirements);
          return (
            <div
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3"
              key={project.id}
            >
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                {project.title}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Ready {summary.ready} · Partial {summary.partial} · Gaps{" "}
                {summary.gaps}
              </p>
            </div>
          );
        })}
      </div>
      </>
      )}
    </CodingPanel>
  );
}

function ClusterSummaryCards({
  clusters,
  skills,
}: Readonly<{
  clusters: SkillCluster[];
  skills: CodingSkill[];
}>) {
  return (
    <CodingPanel className="xl:col-span-4" subtitle="Cluster strength and next gap." title="Cluster Summary">
      {clusters.length === 0 ? (
        <EmptyStateCard
          description="Cluster summaries appear after local skills are grouped."
          title="No skill clusters yet"
        />
      ) : (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {clusters.map((cluster) => {
          const clusterSkills = skills.filter((skill) =>
            cluster.skillIds.includes(skill.id),
          );
          const strong = clusterSkills.filter((skill) => skill.status === "strong").length;
          const learning = clusterSkills.filter((skill) => skill.status === "learning").length;
          const missing = clusterSkills.filter((skill) => skill.status === "missing" || skill.status === "weak").length;
          const nextGap = clusterSkills.find((skill) => skillIsGap(skill));

          return (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3"
              key={cluster.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {cluster.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                    {cluster.description}
                  </p>
                </div>
                <StatusDot accent={clusterAccent(cluster.colorToken)} />
              </div>
              <p className="mt-3 text-[11px] text-[var(--text-secondary)]">
                Strong {strong} · Learning {learning} · Missing/weak {missing}
              </p>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                Next gap: {nextGap?.title ?? "No major gap"}
              </p>
            </article>
          );
        })}
      </div>
      )}
    </CodingPanel>
  );
}

function SkillListMobile({
  clusters,
  skills,
  selectedSkillId,
  onSelectSkill,
}: Readonly<{
  clusters: SkillCluster[];
  skills: CodingSkill[];
  selectedSkillId: string;
  onSelectSkill: (skillId: string) => void;
}>) {
  return (
    <section className="xl:hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.82)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-blue)]">
        Mobile Skill List
      </p>
      <div className="mt-3 grid gap-4">
        {skills.length === 0 ? (
          <EmptyStateCard
            description="Skill list appears after a local skill draft exists."
            title="No skills listed"
          />
        ) : clusters.map((cluster) => {
          const clusterSkills = skills.filter((skill) =>
            cluster.skillIds.includes(skill.id),
          );
          if (!clusterSkills.length) {
            return null;
          }
          return (
            <div key={cluster.id}>
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                {cluster.title}
              </h2>
              <div className="mt-2 grid gap-2">
                {clusterSkills.map((skill) => (
                  <button
                    className={cn(
                      "min-h-11 rounded-[12px] border bg-[rgba(18,28,43,.52)] px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                      selectedSkillId === skill.id
                        ? "border-[rgba(91,124,250,.55)]"
                        : "border-[var(--border-subtle)]",
                    )}
                    key={skill.id}
                    onClick={() => onSelectSkill(skill.id)}
                    type="button"
                  >
                    <span className="block text-[12px] font-semibold text-[var(--text-primary)]">
                      {skill.title}
                    </span>
                    <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                      {labelFromValue(skill.level)} · {labelFromValue(skill.status)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LearningRecommendations({
  recommendations,
  skills,
  projects,
}: Readonly<{
  recommendations: LearningRecommendation[];
  skills: CodingSkill[];
  projects: FutureCodingProject[];
}>) {
  return (
    <CodingPanel className="xl:col-span-4" subtitle="Prioritized next practice steps from mock gap data." title="Learning Recommendations">
      {recommendations.length === 0 ? (
        <EmptyStateCard
          description="Practice recommendations appear after real gaps or local practice plans exist."
          title="No practice recommendations"
        />
      ) : (
        <div className="grid gap-3">
          {recommendations.map((recommendation) => {
          const skill = skills.find((item) => item.id === recommendation.skillId);
          const project = projects.find(
            (item) => item.id === recommendation.linkedProjectId,
          );
          return (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3"
              key={recommendation.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {recommendation.title}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {skill?.title ?? "Unknown skill"} ·{" "}
                    {project?.title ?? "No project"}
                  </p>
                </div>
                <CodingPill accent="var(--accent-orange)" quiet>
                  {recommendation.estimatedEffort}
                </CodingPill>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                {recommendation.reason}
              </p>
              <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
                Next: {recommendation.nextAction}
              </p>
            </article>
          );
          })}
        </div>
      )}
    </CodingPanel>
  );
}

function EvidenceTimeline({
  evidence,
  skills,
  emptyState,
}: Readonly<{
  evidence: SkillEvidence[];
  skills: CodingSkill[];
  emptyState: SkillMapViewModel["emptyStates"]["noEvidence"];
}>) {
  return (
    <CodingPanel className="xl:col-span-4" subtitle="Recent proof points, not a full history." title="Evidence Timeline">
      {evidence.length === 0 ? (
        <EmptyStateCard description={emptyState.description} title={emptyState.title} />
      ) : (
        <div className="grid gap-3">
          {evidence.slice(0, 8).map((item) => {
            const skill = skills.find((entry) => entry.id === item.skillId);
            return (
              <article className="flex gap-3" key={item.id}>
                <StatusDot accent="var(--accent-cyan)" />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {skill?.title ?? "Unknown skill"} · {labelFromValue(item.type)} ·{" "}
                    {item.sourceTitle} · {item.createdAt}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </CodingPanel>
  );
}

function Rules({ rules }: Readonly<{ rules: string[] }>) {
  return (
    <section className="xl:col-span-12 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.48)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)]">
        P3 · System
      </p>
      <h2 className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]">
        Skill Map Rules
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {rules.map((rule) => (
          <CodingPill accent="var(--accent-cyan)" key={rule} quiet>
            {rule}
          </CodingPill>
        ))}
      </div>
    </section>
  );
}

function AddSkillDialog({
  open,
  onClose,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (draft: AddSkillDraft) => void;
}>) {
  const [draft, setDraft] = useState<AddSkillDraft>({
    title: "",
    category: "frontend",
    status: "learning",
    level: "basic",
    summary: "",
    nextPractice: "",
  });
  const [error, setError] = useState<string | null>(null);

  function update(
    key: keyof AddSkillDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.category) {
      setError("Skill title and category are required.");
      return;
    }
    onSave(draft);
  }

  return (
    <DialogFrame
      eyebrow="Dialog · Skill draft"
      headingId="add-skill-heading"
      onClose={onClose}
      open={open}
      title="Add skill"
    >
      <form onSubmit={submit}>
        <div className="grid gap-4 px-4 py-4">
          {error ? (
            <div className="rounded-[12px] border border-[rgba(221,107,95,.32)] bg-[rgba(221,107,95,.08)] p-3 text-[12px] text-[var(--text-secondary)]">
              {error}
            </div>
          ) : null}
          <label>
            <FieldLabel>Skill title *</FieldLabel>
            <input className={inputClass} onChange={(event) => update("title", event)} value={draft.title} />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label>
              <FieldLabel>Category *</FieldLabel>
              <select className={inputClass} onChange={(event) => update("category", event)} value={draft.category}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {labelFromValue(category)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Status</FieldLabel>
              <select className={inputClass} onChange={(event) => update("status", event)} value={draft.status}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {labelFromValue(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Level</FieldLabel>
              <select className={inputClass} onChange={(event) => update("level", event)} value={draft.level}>
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {labelFromValue(level)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <FieldLabel>Summary</FieldLabel>
            <textarea className={cn(inputClass, "min-h-24 py-3")} onChange={(event) => update("summary", event)} value={draft.summary} />
          </label>
          <label>
            <FieldLabel>Next practice</FieldLabel>
            <input className={inputClass} onChange={(event) => update("nextPractice", event)} value={draft.nextPractice} />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={primaryButtonClass} type="submit">
            Save skill
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function EvidenceDialog({
  open,
  onClose,
  onSave,
  skills,
  selectedSkillId,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (draft: AddEvidenceDraft) => void;
  skills: CodingSkill[];
  selectedSkillId: string;
}>) {
  const [draft, setDraft] = useState<AddEvidenceDraft>({
    skillId: selectedSkillId,
    title: "",
    type: "task",
    sourceTitle: "",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);

  function update(
    key: keyof AddEvidenceDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.skillId || !draft.title.trim() || !draft.sourceTitle.trim()) {
      setError("Skill, evidence title and source title are required.");
      return;
    }
    onSave(draft);
  }

  return (
    <DialogFrame
      eyebrow="Dialog · Evidence"
      headingId="add-evidence-heading"
      onClose={onClose}
      open={open}
      title="Add evidence"
    >
      <form onSubmit={submit}>
        <div className="grid gap-4 px-4 py-4">
          {error ? (
            <div className="rounded-[12px] border border-[rgba(221,107,95,.32)] bg-[rgba(221,107,95,.08)] p-3 text-[12px] text-[var(--text-secondary)]">
              {error}
            </div>
          ) : null}
          <label>
            <FieldLabel>Skill *</FieldLabel>
            <select className={inputClass} onChange={(event) => update("skillId", event)} value={draft.skillId}>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Evidence title *</FieldLabel>
            <input className={inputClass} onChange={(event) => update("title", event)} value={draft.title} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <FieldLabel>Type</FieldLabel>
              <select className={inputClass} onChange={(event) => update("type", event)} value={draft.type}>
                {evidenceTypes.map((type) => (
                  <option key={type} value={type}>
                    {labelFromValue(type)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Source title *</FieldLabel>
              <input className={inputClass} onChange={(event) => update("sourceTitle", event)} value={draft.sourceTitle} />
            </label>
          </div>
          <label>
            <FieldLabel optional>Note</FieldLabel>
            <textarea className={cn(inputClass, "min-h-20 py-3")} onChange={(event) => update("note", event)} value={draft.note} />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={primaryButtonClass} type="submit">
            Save evidence
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function PracticeDialog({
  open,
  onClose,
  onSave,
  skills,
  projects,
  selectedSkillId,
  selectedProjectId,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (draft: PracticeDraft) => void;
  skills: CodingSkill[];
  projects: FutureCodingProject[];
  selectedSkillId: string;
  selectedProjectId: string;
}>) {
  const [draft, setDraft] = useState<PracticeDraft>({
    skillId: selectedSkillId,
    linkedProjectId: selectedProjectId,
    title: "",
    estimatedEffort: "small",
    nextAction: "",
  });
  const [error, setError] = useState<string | null>(null);

  function update(
    key: keyof PracticeDraft,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.skillId || !draft.title.trim() || !draft.nextAction.trim()) {
      setError("Skill, practice task title and next action are required.");
      return;
    }
    onSave(draft);
  }

  return (
    <DialogFrame
      eyebrow="Dialog · Practice plan"
      headingId="plan-practice-heading"
      onClose={onClose}
      open={open}
      title="Plan practice"
    >
      <form onSubmit={submit}>
        <div className="grid gap-4 px-4 py-4">
          {error ? (
            <div className="rounded-[12px] border border-[rgba(221,107,95,.32)] bg-[rgba(221,107,95,.08)] p-3 text-[12px] text-[var(--text-secondary)]">
              {error}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <FieldLabel>Skill</FieldLabel>
              <select className={inputClass} onChange={(event) => update("skillId", event)} value={draft.skillId}>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Linked project</FieldLabel>
              <select className={inputClass} onChange={(event) => update("linkedProjectId", event)} value={draft.linkedProjectId}>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <FieldLabel>Practice task title *</FieldLabel>
            <input className={inputClass} onChange={(event) => update("title", event)} value={draft.title} />
          </label>
          <label>
            <FieldLabel>Estimated effort</FieldLabel>
            <select className={inputClass} onChange={(event) => update("estimatedEffort", event)} value={draft.estimatedEffort}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>
          <label>
            <FieldLabel>Next action *</FieldLabel>
            <textarea className={cn(inputClass, "min-h-20 py-3")} onChange={(event) => update("nextAction", event)} value={draft.nextAction} />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={primaryButtonClass} type="submit">
            Save practice
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function InspectorSheet({
  skill,
  relatedSkills,
  evidence,
  requiredByProjects,
  onClose,
  onAddEvidence,
  onPlanPractice,
  onOpenResources,
}: Readonly<{
  skill: CodingSkill | null;
  relatedSkills: CodingSkill[];
  evidence: SkillEvidence[];
  requiredByProjects: FutureCodingProject[];
  onClose: () => void;
  onAddEvidence: () => void;
  onPlanPractice: () => void;
  onOpenResources: () => void;
}>) {
  return (
    <DialogFrame
      eyebrow="Sheet · Skill inspector"
      headingId="mobile-skill-inspector-heading"
      onClose={onClose}
      open={Boolean(skill)}
      sheet
      title="Selected skill"
    >
      <div className="max-h-[calc(100dvh-73px)] overflow-y-auto p-4">
        <SelectedSkillInspector
          evidence={evidence}
          onAddEvidence={onAddEvidence}
          onOpenResources={onOpenResources}
          onPlanPractice={onPlanPractice}
          relatedSkills={relatedSkills}
          requiredByProjects={requiredByProjects}
          skill={skill}
        />
      </div>
    </DialogFrame>
  );
}

export function SkillMapPage({
  viewModel,
}: Readonly<{
  viewModel: SkillMapViewModel;
}>) {
  const [filter, setFilter] = useState<SkillMapFilter>(defaultFilter);
  const [skills, setSkills] = useState<CodingSkill[]>(viewModel.skills);
  const [evidence, setEvidence] = useState<SkillEvidence[]>(viewModel.evidence);
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>(
    viewModel.recommendations,
  );
  const [selectedSkillId, setSelectedSkillId] = useState(
    viewModel.skills[0]?.id ?? "",
  );
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState(
    viewModel.projects[0]?.id ?? "",
  );
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [addEvidenceOpen, setAddEvidenceOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const workingViewModel = useMemo(
    () => ({ ...viewModel, skills, evidence, recommendations }),
    [evidence, recommendations, skills, viewModel],
  );
  const selectedProject =
    viewModel.projects.find((project) => project.id === selectedProjectId) ??
    null;
  const selectedSkill =
    skills.find((skill) => skill.id === selectedSkillId) ?? skills[0] ?? null;
  const selectedRelatedIds = selectedSkill
    ? relatedSkillIds(workingViewModel, selectedSkill.id)
    : [];
  const relatedSkills = skills.filter((skill) =>
    selectedRelatedIds.includes(skill.id),
  );
  const selectedEvidence = evidence.filter(
    (item) => item.skillId === selectedSkill?.id,
  );
  const requiredByProjects = viewModel.projects.filter(
    (project) =>
      selectedSkill &&
      [...project.requiredSkillIds, ...project.optionalSkillIds].includes(
        selectedSkill.id,
      ),
  );

  const filteredSkills = useMemo(() => {
    const search = normalize(filter.search);
    return skills.filter((skill) => {
      const matchesSearch =
        !search ||
        [skill.title, skill.summary, skill.nextPractice ?? ""]
          .map(normalize)
          .some((value) => value.includes(search));
      const matchesCategory =
        filter.category === "all" || skill.category === filter.category;
      const matchesStatus = filter.status === "all" || skill.status === filter.status;
      const matchesLevel = filter.level === "all" || skill.level === filter.level;
      const matchesGap = !filter.hasGap || skillIsGap(skill);
      const matchesEvidence = !filter.hasEvidence || skill.evidenceCount > 0;
      const matchesProject =
        filter.projectId === "all" ||
        viewModel.requirements.some(
          (requirement) =>
            requirement.projectId === filter.projectId &&
            requirement.skillId === skill.id,
        );

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesLevel &&
        matchesGap &&
        matchesEvidence &&
        matchesProject
      );
    });
  }, [filter, skills, viewModel.requirements]);

  function selectSkill(skillId: string) {
    setSelectedSkillId(skillId);
    setInspectorOpen(true);
  }

  function saveSkill(draft: AddSkillDraft) {
    const skill: CodingSkill = {
      id: `skill-local-${Date.now()}`,
      title: draft.title.trim(),
      category: draft.category,
      status: draft.status,
      level: draft.level,
      confidence: draft.status === "strong" ? 70 : draft.status === "missing" ? 10 : 42,
      summary: draft.summary.trim() || "Local skill draft without persisted source.",
      evidenceCount: 0,
      nextPractice: draft.nextPractice.trim() || undefined,
      x: 50,
      y: 50,
    };
    setSkills((current) => [skill, ...current]);
    setSelectedSkillId(skill.id);
    setAddSkillOpen(false);
    setToast({
      title: "Skill saved locally",
      body: "The skill was added to UI state only. No database or code analysis ran.",
      tone: "success",
    });
  }

  function saveEvidence(draft: AddEvidenceDraft) {
    const item: SkillEvidence = {
      id: `evidence-local-${Date.now()}`,
      skillId: draft.skillId,
      title: draft.title.trim(),
      type: draft.type,
      sourceTitle: draft.sourceTitle.trim(),
      createdAt: "Local draft",
    };
    setEvidence((current) => [item, ...current]);
    setSkills((current) =>
      current.map((skill) =>
        skill.id === draft.skillId
          ? {
              ...skill,
              evidenceCount: skill.evidenceCount + 1,
              confidence: Math.min(100, skill.confidence + 4),
            }
          : skill,
      ),
    );
    setAddEvidenceOpen(false);
    setToast({
      title: "Evidence saved locally",
      body: draft.note.trim()
        ? "Evidence and note were captured in local UI state."
        : "Evidence was captured in local UI state.",
      tone: "success",
    });
  }

  function savePractice(draft: PracticeDraft) {
    setRecommendations((current) => [
      {
        id: `rec-local-${Date.now()}`,
        skillId: draft.skillId,
        title: draft.title.trim(),
        reason: "Local practice plan created from Skill Map.",
        linkedProjectId: draft.linkedProjectId,
        estimatedEffort: draft.estimatedEffort,
        nextAction: draft.nextAction.trim(),
      },
      ...current,
    ]);
    setPracticeOpen(false);
    setToast({
      title: "Practice plan saved locally",
      body: "This created a local recommendation only. No task was persisted.",
      tone: "success",
    });
  }

  const noResults = filteredSkills.length === 0;

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6"
      id="skill-map-page"
    >
      <Header
        onAddEvidence={() => setAddEvidenceOpen(true)}
        onAddSkill={() => setAddSkillOpen(true)}
        onCompareProject={() => {
          setFilter((current) => ({ ...current, segment: "projects" }));
          setToast({
            title: "Project compare active",
            body: selectedProject
              ? `${selectedProject.title} is highlighted in the map and matrix.`
              : "Select a project to compare requirements.",
            tone: "info",
          });
        }}
        onPlanPractice={() => setPracticeOpen(true)}
      />
      <GapSummary
        requirements={viewModel.requirements}
        selectedProject={selectedProject}
      />
      <FilterBar
        filter={filter}
        setFilter={setFilter}
        viewModel={workingViewModel}
      />

      {noResults && skills.length > 0 ? (
        <EmptyStateCard
          description={viewModel.emptyStates.noSearchResults.description}
          title={viewModel.emptyStates.noSearchResults.title}
        />
      ) : (
        <>
          <SkillListMobile
            clusters={viewModel.clusters}
            onSelectSkill={selectSkill}
            selectedSkillId={selectedSkill?.id ?? ""}
            skills={filteredSkills}
          />
          <div className="grid min-w-0 gap-2 xl:grid-cols-12">
            <SkillNetworkMap
              hoveredSkillId={hoveredSkillId}
              onHoverSkill={setHoveredSkillId}
              onSelectSkill={(skillId) => {
                setSelectedSkillId(skillId);
                setInspectorOpen(true);
              }}
              selectedProject={selectedProject}
              selectedSkillId={selectedSkill?.id ?? ""}
              skills={filteredSkills}
              viewModel={workingViewModel}
            />
            <div className="hidden xl:contents">
              <SelectedSkillInspector
                evidence={selectedEvidence}
                onAddEvidence={() => setAddEvidenceOpen(true)}
                onOpenResources={() =>
                  setToast({
                    title: "Resources are not connected",
                    body: "Resource opening is a prepared local action in this MVP.",
                    tone: "info",
                  })
                }
                onPlanPractice={() => setPracticeOpen(true)}
                relatedSkills={relatedSkills}
                requiredByProjects={requiredByProjects}
                skill={selectedSkill}
              />
            </div>
            <ProjectRequirementsPanel
              onSelectProject={(projectId) => {
                setSelectedProjectId(projectId);
                setFilter((current) => ({ ...current, projectId }));
              }}
              projects={viewModel.projects}
              requirements={viewModel.requirements}
              selectedProjectId={selectedProjectId}
            />
            <SkillGapMatrix
              onExplainCell={(message) =>
                setToast({
                  title: "Matrix cell",
                  body: message,
                  tone: "info",
                })
              }
              projects={viewModel.projects}
              requirements={viewModel.requirements}
              skills={skills}
            />
            <ClusterSummaryCards clusters={viewModel.clusters} skills={skills} />
            <LearningRecommendations
              projects={viewModel.projects}
              recommendations={recommendations}
              skills={skills}
            />
            <EvidenceTimeline
              emptyState={viewModel.emptyStates.noEvidence}
              evidence={evidence}
              skills={skills}
            />
            {viewModel.profileId === "demo" ? (
            <section className="xl:col-span-12 rounded-[16px] border border-[rgba(221,107,95,.22)] bg-[rgba(221,107,95,.06)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-red)]">
                Prepared error state
              </p>
              <h2 className="mt-1 text-[15px] font-semibold text-[var(--text-primary)]">
                {viewModel.futureErrorState.title}
              </h2>
              <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                {viewModel.futureErrorState.description}
              </p>
            </section>
            ) : null}
            <Rules rules={viewModel.rules} />
          </div>
        </>
      )}

      <div className="order-last rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3">
        <p className="text-[10px] leading-4 text-[var(--text-faint)]">
          {viewModel.pageContract.pageType} · {viewModel.pageContract.writes} ·{" "}
          {viewModel.pageContract.canonicalSource}
        </p>
      </div>

      {addSkillOpen ? (
        <AddSkillDialog
          onClose={() => setAddSkillOpen(false)}
          onSave={saveSkill}
          open={addSkillOpen}
        />
      ) : null}
      {addEvidenceOpen ? (
        <EvidenceDialog
          onClose={() => setAddEvidenceOpen(false)}
          onSave={saveEvidence}
          open={addEvidenceOpen}
          selectedSkillId={selectedSkill?.id ?? skills[0]?.id ?? ""}
          skills={skills}
        />
      ) : null}
      {practiceOpen ? (
        <PracticeDialog
          onClose={() => setPracticeOpen(false)}
          onSave={savePractice}
          open={practiceOpen}
          projects={viewModel.projects}
          selectedProjectId={selectedProjectId}
          selectedSkillId={selectedSkill?.id ?? skills[0]?.id ?? ""}
          skills={skills}
        />
      ) : null}
      <div className="xl:hidden">
        <InspectorSheet
          evidence={selectedEvidence}
          onAddEvidence={() => setAddEvidenceOpen(true)}
          onClose={() => setInspectorOpen(false)}
          onOpenResources={() =>
            setToast({
              title: "Resources are not connected",
              body: "Resource opening is a prepared local action in this MVP.",
              tone: "info",
            })
          }
          onPlanPractice={() => setPracticeOpen(true)}
          relatedSkills={relatedSkills}
          requiredByProjects={requiredByProjects}
          skill={inspectorOpen ? selectedSkill : null}
        />
      </div>
      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}
