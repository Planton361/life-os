import Link from "next/link";
import {
  portfolioStatusMeta,
  portfolioTypeLabels,
  portfolioTypeAccent,
} from "../portfolio-style";
import type { PortfolioEntity } from "../types";

const linkClass =
  "rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm transition hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

export function PortfolioCreateLauncher() {
  return (
    <section
      aria-labelledby="portfolio-create-heading"
      className="order-2 shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 xl:order-0"
    >
      <h2
        id="portfolio-create-heading"
        className="mb-3 text-sm font-semibold text-[var(--text-secondary)]"
      >
        Neu erstellen
      </h2>
      <nav aria-label="Entity erstellen" className="flex flex-wrap gap-2">
        {["Task", "Project", "Goal", "Skill", "Resource"].map((label) => (
          <Link
            key={label}
            className={linkClass}
            prefetch={false}
            href={`/${label.toLowerCase()}s/new`}
            aria-label={`${label} erstellen`}
          >
            <span aria-hidden="true" className="mr-1 text-[var(--text-muted)]">
              +
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </section>
  );
}

export function PortfolioInspector({
  entity,
}: Readonly<{ entity: PortfolioEntity | null }>) {
  const contextRelations = entity?.connectedContext
    ? Object.values(entity.connectedContext)
        .flat()
        .filter((relation) => !relation.archived)
    : [];
  const relations =
    contextRelations.length > 0
      ? contextRelations.map((relation) => ({
          label: relation.targetType,
          value: `${relation.targetTitle}${relation.via ? ` · via ${relation.via.title}` : ""}`,
        }))
      : (entity?.relations ?? []);
  return (
    <aside
      aria-label="Selected Entity"
      className="min-h-0 min-w-0 flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] xl:overflow-y-auto"
    >
      <h2 className="border-b border-[var(--border-subtle)] px-5 py-4 text-base font-semibold">
        Selected Entity
      </h2>
      {entity ? (
        <div className="grid gap-5 break-words p-5">
          <div>
            <p
              className="text-xs font-semibold"
              style={{ color: portfolioTypeAccent[entity.type] }}
            >
              {portfolioTypeLabels[entity.type]} ·{" "}
              {portfolioStatusMeta[entity.status].label}
            </p>
            <h3 className="mt-2 text-xl font-semibold">{entity.title}</h3>
            {entity.description && (
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--text-secondary)]">
                {entity.description}
              </p>
            )}
          </div>
          {entity.nextAction && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-muted)]">
                Next Action
              </h4>
              <p className="mt-1 text-sm leading-6">{entity.nextAction}</p>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-[var(--text-muted)]">
                Priorität / Focus
              </dt>
              <dd className="mt-1">
                {entity.priority} · {entity.focusLevel}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">
                {entity.type === "skill" ? "Letzte Praxis" : "Deadline"}
              </dt>
              <dd className="mt-1">
                {entity.type === "skill"
                  ? entity.lastTouched
                  : entity.type === "task"
                    ? entity.taskEditValues?.dueAt || "Keine Deadline"
                    : entity.dueLabel}
              </dd>
            </div>
            {entity.countLabel && entity.type !== "task" && (
              <div className="col-span-2">
                <dt className="text-xs text-[var(--text-muted)]">
                  Aktueller Stand
                </dt>
                <dd className="mt-1">
                  {entity.type === "skill"
                    ? `${entity.skillContext?.evidenceRows?.length ?? 0} Evidence-Einträge`
                    : entity.countLabel}
                </dd>
              </div>
            )}
            {entity.taskLifecycle && (
              <div className="col-span-2">
                <dt className="text-xs text-[var(--text-muted)]">Planung</dt>
                <dd className="mt-1">
                  {entity.taskLifecycle.plannedDate || "Kein Datum geplant"} ·{" "}
                  {entity.taskEditValues?.durationMinutes != null
                    ? `${entity.taskEditValues.durationMinutes} min`
                    : "Aufwand nicht gesetzt"}
                </dd>
              </div>
            )}
          </dl>
          {entity.type === "goal" && entity.goalOutcome && (
            <section
              aria-label="Goal Outcome"
              className="grid gap-2 border-t border-[var(--border-subtle)] pt-4"
            >
              <h4 className="text-xs font-semibold text-[var(--text-muted)]">
                Goal Outcome
              </h4>
              <p className="text-sm">
                {entity.goalOutcome.metCriteriaCount} /{" "}
                {entity.goalOutcome.activeCriteriaCount} Kriterien erfüllt ·{" "}
                {entity.goalOutcome.achievedMilestoneCount} /{" "}
                {entity.goalOutcome.activeMilestoneCount} Milestones erreicht
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {entity.goalOutcome.readyToAchieve
                  ? "Bereit für die explizite Erreichung."
                  : entity.goalOutcome.blockers.join(" ")}
              </p>
            </section>
          )}
          {relations.length > 0 && (
            <section aria-label="Beziehungen">
              <h4 className="mb-2 text-xs font-semibold text-[var(--text-muted)]">
                Beziehungen
              </h4>
              <dl className="grid gap-2 text-sm">
                {relations.map((relation, index) => (
                  <div key={index}>
                    <dt className="text-xs text-[var(--text-muted)]">
                      {relation.label}
                    </dt>
                    <dd>{relation.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {((entity.linkedResources?.length ?? 0) > 0 ||
            (entity.skillContext?.relatedResources?.length ?? 0) > 0) && (
            <section aria-label="Resources">
              <h4 className="text-xs font-semibold text-[var(--text-muted)]">
                Resources
              </h4>
              <ul className="mt-2 grid gap-2 text-sm">
                {(
                  entity.linkedResources ??
                  entity.skillContext?.relatedResources ??
                  []
                )
                  .filter((resource) => !resource.archived)
                  .map((resource) => (
                    <li key={resource.id}>{resource.title}</li>
                  ))}
              </ul>
            </section>
          )}
          {!!entity.skillContext?.linkedTasks?.length && (
            <section aria-label="Practice Tasks">
              <h4 className="text-xs font-semibold text-[var(--text-muted)]">
                Practice Tasks
              </h4>
              <ul className="mt-2 grid gap-2 text-sm">
                {entity.skillContext.linkedTasks.slice(0, 3).map((task) => (
                  <li key={task.relationId}>{task.taskTitle}</li>
                ))}
              </ul>
            </section>
          )}
          {!!entity.skillContext?.evidenceRows?.length && (
            <section aria-label="Evidence">
              <h4 className="text-xs font-semibold text-[var(--text-muted)]">
                Evidence
              </h4>
              <ul className="mt-2 grid gap-2 text-sm">
                {entity.skillContext.evidenceRows
                  .slice(0, 3)
                  .map((row, index) => (
                    <li key={row.id ?? index}>
                      {row.title}
                      <p className="text-xs text-[var(--text-muted)]">
                        {row.sourceLabel}
                      </p>
                    </li>
                  ))}
              </ul>
            </section>
          )}
          <Link
            className={`${linkClass} bg-[rgba(95,200,215,.08)] text-center`}
            href={`/${entity.type}s/${entity.id}`}
          >
            Details öffnen
          </Link>
        </div>
      ) : (
        <div className="p-5">
          <h3 className="text-sm font-medium">Ein Element auswählen</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
            Details, Beziehungen und aktueller Zustand erscheinen hier.
          </p>
        </div>
      )}
    </aside>
  );
}
