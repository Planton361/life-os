import type { DashboardProjectWorkBalance } from "@/features/dashboard/project-work-balance";

const categories = [
  ["done", "erledigt", "var(--accent-green)"],
  ["ready", "bereit", "var(--accent-blue)"],
  ["blocked", "blockiert", "var(--accent-orange)"],
  ["other", "sonstige offen", "var(--text-muted)"],
] as const;

const unavailableWork: DashboardProjectWorkBalance = {
  state: "unavailable",
  total: 0,
  counts: { done: 0, ready: 0, blocked: 0, other: 0 },
  milestones: null,
};

export function ProjectPortfolioWork({
  work = unavailableWork,
  focus,
  descriptionId,
}: {
  work?: DashboardProjectWorkBalance;
  focus?: string;
  descriptionId: string;
}) {
  const available = work.state === "available";
  const categoryText = categories
    .map(([key, label]) => `${work.counts[key]} ${label}`)
    .join(" · ");
  return (
    <div className="portfolio-project-work" data-work-state={work.state}>
      <span id={descriptionId} hidden>
        {work.state === "unavailable"
          ? "Arbeitsstand nicht verfügbar"
          : `${work.counts.done}/${work.total} Tasks erledigt. ${available ? categoryText : "Ausführbarkeit unbekannt"}.`}
        {work.milestones && work.milestones.total > 0
          ? ` ${work.milestones.done}/${work.milestones.total} Meilensteine erledigt.`
          : ""}
      </span>
      <p className="portfolio-task-count">
        {work.state === "unavailable"
          ? "Arbeitsstand nicht verfügbar"
          : work.total === 0
            ? "Noch keine Tasks"
            : `${work.counts.done}/${work.total} Tasks erledigt`}
      </p>
      {work.state !== "unavailable" && work.total > 0 && (
        <>
          {available ? (
            <>
              <div
                className="portfolio-work-bar"
                role="img"
                aria-label={`Task-Arbeitsstand: ${categoryText}`}
              >
                {categories.map(
                  ([key, , color]) =>
                    work.counts[key] > 0 && (
                      <span
                        key={key}
                        data-work-category={key}
                        style={{
                          width: `${(work.counts[key] / work.total) * 100}%`,
                          background: color,
                        }}
                      />
                    ),
                )}
              </div>
              <p className="portfolio-work-categories" aria-hidden="true">
                {work.counts.done === work.total
                  ? "Alle erfassten Tasks erledigt"
                  : categories
                      .filter(([key]) => key !== "done" && work.counts[key] > 0)
                      .map(([key, label]) => `${work.counts[key]} ${label}`)
                      .join(" · ")}
              </p>
            </>
          ) : (
            <p className="portfolio-work-categories">
              Ausführbarkeit unbekannt
            </p>
          )}
        </>
      )}
      {work.milestones === null ? (
        <p className="portfolio-project-milestones">
          Meilensteine nicht verfügbar
        </p>
      ) : (
        work.milestones.total > 0 && (
          <p className="portfolio-project-milestones">
            {work.milestones.done}/{work.milestones.total} Meilensteine erledigt
          </p>
        )
      )}
      {focus?.trim() && (
        <p className="portfolio-project-focus">Fokus: {focus}</p>
      )}
    </div>
  );
}
