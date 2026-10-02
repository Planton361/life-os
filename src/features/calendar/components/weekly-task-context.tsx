import Link from "next/link";
import type { WeeklyTaskContext } from "../weekly-task-context";

const linkClass =
  "inline-block min-h-8 py-1 text-[var(--text-secondary)] underline decoration-[var(--border-strong)] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";
function Text({ label, value }: { label: string; value?: string | null }) {
  return value ? (
    <p>
      <span className="text-[var(--text-muted)]">{label}: </span>
      {value}
    </p>
  ) : null;
}

export function WeeklyTaskContextPanel({
  context,
}: {
  context: WeeklyTaskContext;
}) {
  return (
    <div
      className="min-w-0 space-y-2 text-[11px] leading-5 [overflow-wrap:anywhere]"
      data-weekly-task-context={context.id}
    >
      <section
        aria-label="Ausführbarkeit"
        className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3"
      >
        <h3 className="font-semibold text-[var(--text-primary)]">
          Ausführbarkeit
        </h3>
        <p
          className="text-[var(--text-secondary)]"
          role={context.execution === "unknown" ? "alert" : undefined}
        >
          {context.execution === "unknown"
            ? "Ausführbarkeit derzeit nicht verfügbar"
            : context.execution === "READY"
              ? "READY · Task-Voraussetzungen erfüllt"
              : "BLOCKED · Offene Task-Voraussetzungen"}
        </p>
        {context.blockers.length ? (
          <ul className="mt-1 text-[var(--text-secondary)]">
            {context.blockers.map((b, i) => (
              <li key={b.id ?? i}>
                {b.id ? (
                  <Link className={linkClass} href={`/tasks/${b.id}`}>
                    {b.title}
                  </Link>
                ) : (
                  b.title
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section
        aria-label="Zusammenhang"
        className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3 text-[var(--text-secondary)]"
      >
        <h3 className="font-semibold text-[var(--text-primary)]">
          Zusammenhang
        </h3>
        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
          Orientierung für deine Planung.
        </p>
        {context.unavailable ? (
          <p role="alert">Zusammenhang derzeit nicht verfügbar.</p>
        ) : (
          <div className="mt-2 divide-y divide-[var(--border-subtle)]">
            {context.project ? (
              <div className="py-2 first:pt-0" data-weekly-project>
                <Link
                  className={linkClass}
                  href={`/projects/${context.project.id}`}
                >
                  Project · {context.project.title}
                </Link>
                <Text
                  label="Gewünschtes Ergebnis"
                  value={context.project.result}
                />
                <Text
                  label="Task-zugeordnete Project-Etappe"
                  value={context.project.assigned?.title}
                />
                <Text
                  label="Etappenergebnis"
                  value={context.project.assigned?.description}
                />
                <Text
                  label="Aktueller Project-Fokus"
                  value={context.project.current?.title}
                />
                <Text
                  label="Fokusergebnis"
                  value={context.project.current?.description}
                />
              </div>
            ) : null}
            {context.goalConflict ? (
              <p className="py-2">
                Abweichende Goal-Pfade: direkter Task-Kontext und Goal über
                Project.
              </p>
            ) : null}
            {context.goals.map((goal) => (
              <div
                className="py-2 first:pt-0"
                key={goal.id}
                data-weekly-goal={goal.path}
              >
                <Link className={linkClass} href={`/goals/${goal.id}`}>
                  Goal · {goal.title}
                </Link>
                <p className="text-[var(--text-muted)]">
                  {goal.path === "redundant"
                    ? "Direkt und über Project · dasselbe Goal"
                    : goal.path === "direct"
                      ? "Direkter Goal-Kontext"
                      : "Goal über Project"}
                </p>
                <Text label="Beschreibung" value={goal.description} />
                <Text label="Warum" value={goal.why} />
                {goal.support.map((s) => (
                  <div key={`${s.path}-${s.stage.id}`}>
                    <Text
                      label={
                        s.path === "task"
                          ? "Task unterstützt Goal-Etappe"
                          : "Project unterstützt Goal-Etappe"
                      }
                      value={s.stage.title}
                    />
                    <Text
                      label="Zwischenresultat"
                      value={s.stage.description}
                    />
                  </div>
                ))}
                <Text
                  label="Aktueller Goal-Fokus · Orientierung"
                  value={goal.current?.title}
                />
                <Text label="Fokusergebnis" value={goal.current?.description} />
              </div>
            ))}
            {context.skills.map((skill) => (
              <div className="py-2 first:pt-0" key={skill.id} data-weekly-skill>
                <Link className={linkClass} href={`/skills/${skill.id}`}>
                  Skill · {skill.title}
                </Link>
                <p className="text-[var(--text-muted)]">
                  Expliziter Practice/Application-Kontext
                </p>
                {skill.targetUnavailable ? (
                  <p>Aktueller Entwicklungsfokus derzeit nicht verfügbar.</p>
                ) : skill.currentTarget ? (
                  <>
                    <Text
                      label="Aktueller Entwicklungsfokus"
                      value={skill.currentTarget.title}
                    />
                    <Text
                      label="Gewünschte Fähigkeit"
                      value={skill.currentTarget.description}
                    />
                  </>
                ) : (
                  <p className="text-[var(--text-muted)]">
                    Kein aktueller Entwicklungsfokus.
                  </p>
                )}
              </div>
            ))}
            {!context.project &&
            !context.goals.length &&
            !context.skills.length ? (
              <p>Kein verknüpfter Project-, Goal- oder Skill-Kontext.</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
