import Link from "next/link";
import type { ReactNode } from "react";
import type { ContentStateMeta } from "@/features/content-state";
import { scheduleTaskForTodayFormAction } from "@/features/real-data/actions/task.actions";
import {
  EmptyState,
  Pill,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import {
  getPortfolioEntitySourceRoute,
  getPortfolioPrimaryReason,
  portfolioAreaMeta,
  portfolioFocusLabels,
  portfolioStatusMeta,
  portfolioTypeAccent,
  portfolioTypeLabels,
  portfolioVisibilityReasonMeta,
} from "../portfolio-style";
import type {
  PortfolioDecision,
  PortfolioEntity,
  PortfolioViewModel,
} from "../types";

function progressWidth(progress: number) {
  return `${Math.max(0, Math.min(100, progress))}%`;
}

function decisionAccent(decision: PortfolioDecision) {
  if (decision.state === "blocked") {
    return "var(--accent-red)";
  }

  if (decision.state === "decide") {
    return "var(--accent-orange)";
  }

  if (decision.state === "ready") {
    return "var(--accent-cyan)";
  }

  return "var(--text-muted)";
}

function FieldCard({
  label,
  value,
  accent,
}: Readonly<{
  label: string;
  value: string;
  accent: string;
}>) {
  return (
    <div
      className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[rgba(11,17,28,.42)] px-3 py-2"
      style={accentStyle(accent)}
    >
      <p className="text-[10px] font-semibold text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[12px] leading-4 text-[var(--text-secondary)]">
        {value}
      </p>
    </div>
  );
}

function ActionLink({
  href,
  children,
}: Readonly<{
  href: `/${string}`;
  children: ReactNode;
}>) {
  return (
    <Link
      className="inline-flex min-h-8 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.76)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      href={href}
    >
      {children}
    </Link>
  );
}

function TaskPlanningForm({
  mode,
  taskId,
}: Readonly<{
  mode: "plan" | "schedule";
  taskId: string;
}>) {
  return (
    <form action={scheduleTaskForTodayFormAction}>
      <input name="taskId" type="hidden" value={taskId} />
      <input name="mode" type="hidden" value={mode} />
      <button
        className="inline-flex min-h-8 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.76)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        type="submit"
      >
        {mode === "schedule" ? "Heute terminieren" : "Heute planen"}
      </button>
    </form>
  );
}

function contentStateAttributes(
  meta: ContentStateMeta,
  profileId: PortfolioViewModel["profileId"],
) {
  return {
    "data-capacity": meta.capacity?.toString() ?? undefined,
    "data-content-state": meta.state,
    "data-item-count": meta.itemCount.toString(),
    "data-profile-id": profileId,
  };
}

export function PortfolioContextPanel({
  contentState,
  entity,
  profileId,
}: Readonly<{
  contentState: ContentStateMeta;
  entity: PortfolioEntity | null;
  profileId: PortfolioViewModel["profileId"];
}>) {
  if (!entity) {
    return (
      <aside
        className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.84)] p-3 shadow-[0_8px_22px_rgba(0,0,0,.12)]"
        data-portfolio-section="context-panel"
        {...contentStateAttributes(contentState, profileId)}
      >
        <EmptyState
          description="Wähle eine Entity oder einen breiteren Scope, um Kontext, Quellen und Review-Hinweise zu sehen."
          title="Keine Entity ausgewählt"
        />
      </aside>
    );
  }

  const typeAccent = portfolioTypeAccent[entity.type];
  const area = portfolioAreaMeta[entity.area];
  const status = portfolioStatusMeta[entity.status];
  const primaryReason = getPortfolioPrimaryReason(entity);
  const reason = portfolioVisibilityReasonMeta[primaryReason];
  const entityRoute = getPortfolioEntitySourceRoute(entity);
  const sourceLink =
    entity.sourceLinks.find((link) => link.href !== entityRoute) ??
    entity.sourceLinks[0] ??
    null;

  return (
    <aside
      aria-labelledby="selected-entity-heading"
      className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:min-h-0"
      data-portfolio-section="context-panel"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.50)] px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-orange)]">
              Selected Entity
            </p>
            <h2
              className="mt-1 text-[20px] font-semibold leading-6 text-[var(--text-primary)]"
              id="selected-entity-heading"
            >
              {entity.title}
            </h2>
            <p className="mt-1 max-w-xl text-[11px] leading-4 text-[var(--text-secondary)]">
              {entity.description}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Pill accent={typeAccent}>{portfolioTypeLabels[entity.type]}</Pill>
            <Pill accent={area.accent}>{area.label}</Pill>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ActionLink href={entityRoute}>
            Open {portfolioTypeLabels[entity.type].toLowerCase()}
          </ActionLink>
          {sourceLink ? (
            <ActionLink href={sourceLink.href}>Open source</ActionLink>
          ) : null}
          {profileId === "manual" && entity.type === "task" ? (
            <>
              <TaskPlanningForm mode="plan" taskId={entity.id} />
              <TaskPlanningForm mode="schedule" taskId={entity.id} />
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 p-3 xl:max-h-[calc(100dvh-25rem)] xl:overflow-y-auto">
        <div className="grid gap-2 sm:grid-cols-2">
          <FieldCard
            accent={typeAccent}
            label="Type"
            value={portfolioTypeLabels[entity.type]}
          />
          <FieldCard accent={area.accent} label="Area" value={area.label} />
          <FieldCard
            accent={status.accent}
            label="Status"
            value={status.label}
          />
          <FieldCard
            accent={reason.accent}
            label="Why visible"
            value={reason.label}
          />
          <FieldCard
            accent={typeAccent}
            label="Priority / Focus"
            value={`${entity.priority} / ${portfolioFocusLabels[entity.focusLevel]}`}
          />
          <FieldCard
            accent={typeAccent}
            label="Progress / Count"
            value={`${entity.progress}% / ${entity.countLabel}`}
          />
        </div>

        <div className="grid gap-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(148,163,184,.14)]">
            <div
              aria-hidden="true"
              className="h-full rounded-full bg-[var(--accent)]"
              style={{
                ...accentStyle(typeAccent),
                width: progressWidth(entity.progress),
              }}
            />
          </div>
          <p className="text-[10px] leading-4 text-[var(--text-muted)]">
            Progress is text-backed above; color is only an accent.
          </p>
        </div>

        {entity.type === "skill" && entity.skillContext ? (
          <section aria-labelledby="entity-skill-context-heading">
            <h3
              className="text-[13px] font-semibold text-[var(--text-primary)]"
              id="entity-skill-context-heading"
            >
              Practice / Learning Signal
            </h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <FieldCard
                accent="var(--accent-cyan)"
                label="Practice Status"
                value={entity.skillContext.practiceStatus}
              />
              <FieldCard
                accent="var(--accent-cyan)"
                label="Confidence"
                value={entity.skillContext.confidence}
              />
              <FieldCard
                accent="var(--accent-orange)"
                label="Next Session"
                value={entity.skillContext.nextSession}
              />
              <FieldCard
                accent="var(--text-muted)"
                label="Evidence"
                value={entity.skillContext.evidence}
              />
            </div>
          </section>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <FieldCard
            accent="var(--accent-orange)"
            label="Next Action"
            value={entity.nextAction}
          />
          <FieldCard
            accent="var(--accent-blue)"
            label="Review Status"
            value={
              entity.reviewNeeded
                ? "Needs weekly review note"
                : "No review note needed"
            }
          />
        </div>

        <section aria-labelledby="entity-relations-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="entity-relations-heading"
          >
            Relations
          </h3>
          <div className="mt-2 grid gap-1.5">
            {entity.relations.map((relation, index) => (
              <div
                className="flex min-h-8 items-center justify-between gap-3 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.40)] px-3 text-[11px]"
                key={`portfolio-relation-${index}`}
              >
                <span className="font-semibold text-[var(--text-muted)]">
                  {relation.label}
                </span>
                <span className="min-w-0 truncate text-right text-[var(--text-secondary)]">
                  {relation.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="entity-decisions-heading">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="entity-decisions-heading"
          >
            Decision Needed
          </h3>
          <div className="mt-2 grid gap-1.5">
            {entity.decisions.length > 0 ? (
              entity.decisions.map((decision, index) => (
                <article
                  className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,rgba(11,17,28,.48))] px-3 py-2"
                  key={`portfolio-decision-${index}`}
                  style={accentStyle(decisionAccent(decision))}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
                        {decision.title}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
                        {decision.detail}
                      </p>
                    </div>
                    <Pill accent={decisionAccent(decision)}>
                      {decision.state}
                    </Pill>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.38)] px-3 py-2 text-[11px] leading-4 text-[var(--text-muted)]">
                No explicit decision is open for this entity.
              </p>
            )}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <section aria-labelledby="entity-source-links-heading">
            <h3
              className="text-[13px] font-semibold text-[var(--text-primary)]"
              id="entity-source-links-heading"
            >
              Source Links
            </h3>
            <div className="mt-2 grid gap-1.5">
              {entity.sourceLinks.map((link) => (
                <Link
                  className="flex min-h-8 items-center justify-between gap-3 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] px-3 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  href={link.href}
                  key={`${link.href}-${link.label}`}
                >
                  <span className="min-w-0 truncate">{link.label}</span>
                  <span aria-hidden="true" className="text-[var(--text-muted)]">
                    {">"}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="entity-notes-heading">
            <h3
              className="text-[13px] font-semibold text-[var(--text-primary)]"
              id="entity-notes-heading"
            >
              Quick Notes / Review Snippet
            </h3>
            <div className="mt-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3">
              <p className="text-[11px] leading-4 text-[var(--text-secondary)]">
                {entity.noteSnippet}
              </p>
              <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
                Portfolio reads this snippet only. Source editing belongs in the
                entity workbench or detail page.
              </p>
            </div>
          </section>
        </div>

        <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.32)] px-3 py-2 text-[10px] leading-4 text-[var(--text-muted)]">
          Boundary: Portfolio shows entities and filters. It does not duplicate
          tasks, projects, goals or skills.
        </p>
      </div>
    </aside>
  );
}
