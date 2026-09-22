import Link from "next/link";
import type { ReactNode } from "react";
import {
  criterionEvaluationState,
  currentGoalAchievementEvent,
  currentGoalMilestoneAchievementEvent,
  type GoalAchievementEvent,
  type GoalEvidenceReference,
  type GoalEvidenceSourceType,
  type GoalMilestone,
  type GoalMilestoneAchievementEvent,
  type GoalOutcome,
  type GoalOutcomeCriterion,
} from "@/features/real-data/domain/goal-outcome";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import { EntityWorkbenchShell } from "./pages";
import { Choice, fieldClass, OperationForm } from "./forms";
import {
  ManagementDisclosure,
  ManagementDisclosureGroup,
} from "./management-disclosure";

function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

function Panel({
  id,
  title,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id ?? title}-heading`}
      className={`grid content-start gap-4 rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,36,.6)] p-5 ${className}`}
    >
      <h2 id={`${id ?? title}-heading`} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function statusLabel(status: string) {
  if (status === "met") return "erfüllt";
  if (status === "not_met") return "noch nicht erfüllt";
  if (status === "deferred") return "Später prüfen";
  return "Noch nicht geprüft";
}

function milestoneStatusLabel(status: string) {
  if (status === "achieved") return "erreicht";
  if (status === "active") return "aktiv";
  if (status === "planned") return "geplant";
  return "archiviert";
}

function goalStatusLabel(status: string) {
  if (status === "achieved") return "erreicht";
  if (status === "active") return "aktiv";
  if (status === "paused") return "pausiert";
  if (status === "draft") return "Entwurf";
  return "archiviert";
}

function goalHorizonLabel(horizon: string | null) {
  if (horizon === "week") return "Woche";
  if (horizon === "month") return "Monat";
  if (horizon === "quarter") return "Quartal";
  if (horizon === "year") return "Jahr";
  if (horizon === "someday") return "Irgendwann";
  return "offen";
}

function goalDateLabel(date: string | null) {
  if (!date) return null;
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(parsed);
}

function evaluationStateLabel(state: string | null) {
  if (state === "met") return "erfüllt";
  if (state === "not_met") return "noch nicht erfüllt";
  if (state === "deferred") return "später prüfen";
  if (state === "unverified") return "noch nicht geprüft";
  return "unbekannt";
}

function milestoneBasisStatusLabel(status: string | null) {
  if (status === "achieved") return "erreicht";
  if (status === "active") return "aktiv";
  if (status === "planned") return "geplant";
  if (status === "archived") return "archiviert";
  return "unbekannt";
}

function readableBlocker(blocker: string) {
  if (
    blocker ===
    "Nur aktive Goals können erreicht werden. Goal zuerst aktivieren."
  ) {
    return "Aktiviere das Ziel zuerst, bevor du das Ergebnis bestätigst.";
  }
  if (blocker === "Mindestens ein aktives Kriterium definieren.") {
    return "Lege mindestens ein Erfolgskriterium fest.";
  }
  return blocker
    .replace("deferred", "später zu prüfen")
    .replace("Kriterium/Kriterien", "Erfolgskriterium/Erfolgskriterien")
    .replace("Etappe(n)", "Etappe(n)");
}

function PlanningRegion({
  id,
  title,
  children,
  className = "",
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`grid min-w-0 content-start gap-4 ${className}`}
    >
      <h2 id={`${id}-heading`} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function criterionDescription(criterion: GoalOutcomeCriterion) {
  if (criterion.criterionType === "boolean") {
    return "Ja / Nein · klare Entscheidung erforderlich";
  }
  const direction =
    criterion.direction === "at_least"
      ? "mindestens"
      : criterion.direction === "at_most"
        ? "höchstens"
        : "genau";
  return `${direction} ${criterion.target} ${criterion.unit}`;
}

function milestoneOptions(outcome: GoalOutcome) {
  return outcome.milestones
    .filter((milestone) => !milestone.archivedAt)
    .map((milestone) => ({ id: milestone.id, title: milestone.title }));
}

function sourceOptions(
  data: WorkbenchData,
  outcome: GoalOutcome,
  allowed: readonly GoalEvidenceSourceType[],
) {
  const options: { id: string; title: string }[] = [];
  if (allowed.includes("task")) {
    for (const task of outcome.tasks.filter((item) => !item.archivedAt)) {
      options.push({ id: `task:${task.id}`, title: `Aufgabe · ${task.title}` });
    }
  }
  if (allowed.includes("project")) {
    for (const project of outcome.projects.filter((item) => !item.archivedAt)) {
      options.push({
        id: `project:${project.id}`,
        title: `Projekt · ${project.title}`,
      });
    }
  }
  if (allowed.includes("project_milestone")) {
    for (const milestone of data.milestones.filter(
      (item) => !item.archived_at,
    )) {
      options.push({
        id: `project_milestone:${milestone.id}`,
        title: `Projekt-Meilenstein · ${milestone.title}`,
      });
    }
  }
  if (allowed.includes("resource")) {
    for (const resource of data.resources.filter((item) => !item.archived_at)) {
      options.push({
        id: `resource:${resource.id}`,
        title: `Resource · ${resource.title}`,
      });
    }
  }
  if (allowed.includes("review_record")) {
    for (const review of data.reviewRecords.filter(
      (item) => !item.archived_at,
    )) {
      options.push({
        id: `review_record:${review.id}`,
        title: `Review · ${review.kind} · ${review.period_start}`,
      });
    }
  }
  if (allowed.includes("goal_criterion_evaluation")) {
    for (const criterion of outcome.criteria) {
      for (const evaluation of criterion.evaluations) {
        if (!evaluation.retracted) {
          options.push({
            id: `goal_criterion_evaluation:${evaluation.id}`,
            title: `Kriterium · ${criterion.title} · ${evaluation.id.slice(0, 8)}`,
          });
        }
      }
    }
  }
  return options;
}

function evidenceSourceTypeLabel(sourceType: GoalEvidenceSourceType) {
  if (sourceType === "project_milestone") return "Projekt-Meilenstein";
  if (sourceType === "review_record") return "Review";
  if (sourceType === "goal_criterion_evaluation") return "Kriterium";
  return sourceType === "task" ? "Aufgabe" : "Projekt";
}

function InitialEvidenceFields({
  data,
  outcome,
  allowed,
}: {
  data: WorkbenchData;
  outcome: GoalOutcome;
  allowed: readonly GoalEvidenceSourceType[];
}) {
  const options = sourceOptions(data, outcome, allowed);
  return options.length > 0 ? (
    <Choice
      name="sourceReference"
      label="Entscheidungsbeleg (optional)"
      options={options}
    />
  ) : (
    <p className="text-xs text-[var(--text-muted)]">
      Noch keine zulässige aktive Belegquelle vorhanden.
    </p>
  );
}

function EvidenceLedgerFields({
  data,
  outcome,
  allowed,
  existing,
}: {
  data: WorkbenchData;
  outcome: GoalOutcome;
  allowed: readonly GoalEvidenceSourceType[];
  existing: readonly GoalEvidenceReference[];
}) {
  const sourceChoices = sourceOptions(data, outcome, allowed);
  const existingChoices = existing
    .filter((reference) => reference.action !== "withdrawn")
    .map((reference) => ({
      id: reference.id,
      title: `${evidenceSourceTypeLabel(reference.sourceType)} · ${reference.sourceTitle} · ${reference.id.slice(0, 8)}`,
    }));
  return (
    <>
      <Choice
        name="evidenceAction"
        label="Belegänderung"
        options={[
          { id: "attached", title: "Beleg anhängen" },
          { id: "replaced", title: "Beleg ersetzen" },
          { id: "withdrawn", title: "Beleg zurücknehmen" },
          { id: "supplemented", title: "Retrospektiv ergänzen" },
        ]}
        required
      />
      <Choice
        name="sourceReference"
        label="Neue zulässige Quelle"
        options={sourceChoices}
      />
      <Choice
        name="supersedesReferenceId"
        label="Bisherige Referenz für Ersatz / Zurücknehmen"
        options={existingChoices}
      />
      <label className="grid gap-1 text-sm">
        Grund für die Änderung
        <input className={fieldClass} name="referenceReason" />
      </label>
      <label className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
        <input name="retrospective" type="checkbox" />
        <span>Als retrospektive Ergänzung markieren</span>
      </label>
      <p className="text-xs text-[var(--text-muted)]">
        Ersetzen wählt eine neue aktive Quelle und bewahrt die überschriebene
        Referenz. Zurücknehmen entfernt nur die aktuelle Projektion; der Verlauf
        bleibt erhalten.
      </p>
    </>
  );
}

function latestEvaluationText(criterion: GoalOutcomeCriterion) {
  const evaluation = criterion.latestEvaluation;
  if (!evaluation) return "Noch nicht geprüft.";
  if (evaluation.retracted) {
    return "Bewertung zurückgenommen · Entscheidung wieder offen.";
  }
  if (evaluation.deferred) return "Später prüfen · noch keine Entscheidung.";
  if (criterion.criterionType === "boolean") {
    return evaluation.booleanValue
      ? "Ja · erfüllt."
      : "Nein · noch nicht erfüllt.";
  }
  return `Messwert: ${evaluation.numericValue} ${evaluation.unit ?? criterion.unit ?? ""}`;
}

function evidenceLabel(evidence: readonly GoalEvidenceReference[]) {
  return evidence
    .map((reference) => {
      const prefix =
        reference.action === "withdrawn"
          ? "zurückgenommen: "
          : reference.action === "replaced"
            ? "ersetzt durch: "
            : reference.action === "supplemented"
              ? "retrospektiv ergänzt: "
              : "";
      return `${prefix}${reference.sourceTitle}`;
    })
    .join(", ");
}

function criterionBasisLabel(
  basis: GoalAchievementEvent["criterionBasis"][number],
) {
  const direction =
    basis.directionSnapshot === "at_least"
      ? "mindestens"
      : basis.directionSnapshot === "at_most"
        ? "höchstens"
        : basis.directionSnapshot === "exact"
          ? "genau"
          : "Ziel";
  const target =
    basis.targetSnapshot === null
      ? ""
      : ` · ${direction} ${basis.targetSnapshot}${basis.unitSnapshot ? ` ${basis.unitSnapshot}` : ""}`;
  const evaluated = basis.evaluationOccurredAt
    ? ` · bewertet ${new Date(basis.evaluationOccurredAt).toLocaleString("de-DE")}`
    : "";
  return `${basis.criterionTitleSnapshot ?? "Kriterium unbekannt"} · ${evaluationStateLabel(basis.evaluationStateSnapshot)}${target}${evaluated}`;
}

function milestoneBasisLabel(
  basis: GoalAchievementEvent["milestoneBasis"][number],
) {
  return `${basis.milestoneTitleSnapshot ?? "Etappe unbekannt"} · ${milestoneBasisStatusLabel(basis.resultingStatusSnapshot)}`;
}

function goalAreaHref(goalId: string, area: string, stage?: string) {
  const params = new URLSearchParams({ area });
  if (stage) params.set("stage", stage);
  return `/goals/${goalId}?${params}`;
}

function MilestoneProgression({
  goalId,
  outcome,
  selectedId,
  horizontal = false,
}: {
  goalId: string;
  outcome: GoalOutcome;
  selectedId: string | null;
  horizontal?: boolean;
}) {
  const milestones = outcome.milestones.filter((item) => !item.archivedAt);
  if (milestones.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Noch keine Etappe. Etappen sind optionale Zwischenresultate, keine
        Voraussetzung für Aufgaben.
      </p>
    );
  }
  return (
    <ol
      className={`grid min-w-0 gap-0 ${horizontal ? "md:grid-cols-3 md:gap-4" : ""}`}
      aria-label="Etappen in Planungsreihenfolge"
      data-goal-progression
    >
      {milestones.map((milestone, index) => {
        const projects = outcome.projectSupport.filter(
          (link) => link.goalMilestoneId === milestone.id,
        );
        const tasks = outcome.taskSupport.filter(
          (link) => link.goalMilestoneId === milestone.id,
        );
        return (
          <li
            key={milestone.id}
            className={`relative min-w-0 border-l border-[var(--border-default)] pb-5 pl-7 last:border-l-transparent last:pb-0 ${horizontal ? "md:border-l-0 md:border-t md:pt-7 md:pl-0 md:pb-2 md:last:border-t" : ""}`}
            data-goal-stage-status={milestone.status}
          >
            <span
              aria-hidden="true"
              className={`absolute -left-[11px] top-0 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${horizontal ? "md:-top-[11px] md:left-0" : ""} ${milestone.status === "achieved" ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)] text-[var(--bg-app)]" : milestone.status === "active" ? "border-[var(--accent-cyan)] bg-[var(--surface-2)] text-[var(--accent-cyan)]" : "border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-muted)]"}`}
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <Link
                href={goalAreaHref(goalId, "arbeit", milestone.id)}
                aria-current={
                  selectedId === milestone.id ? "location" : undefined
                }
                className={`min-w-0 font-semibold underline-offset-4 hover:underline focus-visible:underline ${selectedId === milestone.id ? "text-[var(--accent-cyan)]" : "text-[var(--text-primary)]"}`}
              >
                {milestone.title}
              </Link>
              <span className="rounded-md border border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                {milestoneStatusLabel(milestone.status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Etappe {index + 1} von {milestones.length}
              {milestone.targetDate
                ? ` · Ziel ${goalDateLabel(milestone.targetDate)}`
                : ""}
            </p>
            {(projects.length > 0 || tasks.length > 0) && (
              <p className="mt-2 break-words text-sm text-[var(--text-secondary)]">
                {projects
                  .map((link) => `Projekt: ${link.targetTitle}`)
                  .concat(tasks.map((link) => `Aufgabe: ${link.targetTitle}`))
                  .join(" · ")}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function eventDate(event: { occurredAt: string | null; recordedAt: string }) {
  return event.occurredAt
    ? new Date(event.occurredAt).toLocaleString("de-DE")
    : `Zeitpunkt unbekannt · aufgezeichnet ${new Date(event.recordedAt).toLocaleString("de-DE")}`;
}

function legacyLabel(event: {
  legacyState: Record<string, unknown> | null;
  retrospective: boolean;
}) {
  const labels: string[] = [];
  if (event.legacyState) {
    labels.push(
      "Legacy · historische Identität und Übergangszeitpunkt nicht vollständig rekonstruierbar",
    );
  }
  if (event.retrospective) labels.push("Retrospektiv ergänzt");
  return labels.length > 0 ? labels.join(" · ") : null;
}

function CriterionRow({
  criterion,
  data,
  goalId,
  outcome,
  milestoneTitles,
  canManage,
}: {
  criterion: GoalOutcomeCriterion;
  data: WorkbenchData;
  goalId: string;
  outcome: GoalOutcome;
  milestoneTitles: ReadonlyMap<string, string>;
  canManage: boolean;
}) {
  const state = criterionEvaluationState(criterion, criterion.latestEvaluation);
  return (
    <article
      className="grid gap-3 border-t border-[var(--border-subtle)] pt-4"
      data-goal-criterion-id={criterion.id}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{criterion.title}</h3>
          <p className="text-sm text-[var(--text-muted)]">
            {criterionDescription(criterion)}
            {criterion.goalMilestoneId
              ? ` · ${milestoneTitles.get(criterion.goalMilestoneId) ?? "Etappe"}`
              : " · Zielweit"}
          </p>
        </div>
        <span className="rounded-full border border-[var(--border-default)] px-2 py-1 text-xs">
          {statusLabel(state)}
        </span>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        Letzte Entscheidung: {latestEvaluationText(criterion)}
        {criterion.latestEvaluation?.note
          ? ` · ${criterion.latestEvaluation.note}`
          : ""}
      </p>
      {criterion.latestEvaluation?.evidence?.length ? (
        <p className="text-xs text-[var(--text-muted)]">
          Aktive Belege: {evidenceLabel(criterion.latestEvaluation.evidence)}
        </p>
      ) : null}
      {criterion.evaluations.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-[var(--text-muted)]">
            Frühere Entscheidungen anzeigen ({criterion.evaluations.length})
          </summary>
          <ul className="mt-2 grid gap-2 text-[var(--text-secondary)]">
            {criterion.evaluations.map((evaluation) => (
              <li key={evaluation.id}>
                {new Date(evaluation.evaluatedAt).toLocaleString("de-DE")} ·{" "}
                {evaluation.revisionKind === "correction"
                  ? "Korrektur"
                  : evaluation.revisionKind === "retraction"
                    ? "zurückgenommen"
                    : evaluation.deferred
                      ? "Später prüfen"
                      : criterion.criterionType === "boolean"
                        ? evaluation.booleanValue
                          ? "Ja"
                          : "Nein"
                        : `${evaluation.numericValue} ${evaluation.unit ?? ""}`}
                {evaluation.correctionReason
                  ? ` · ${evaluation.correctionReason}`
                  : ""}
                {evaluation.legacyState ? " · ältere Aufzeichnung" : ""}
                {evaluation.retrospective ? " · retrospektiv" : ""}
                {evaluation.evidenceHistory?.length
                  ? ` · Belegverlauf: ${evidenceLabel(evaluation.evidenceHistory)}`
                  : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
      {canManage && (
        <ManagementDisclosure label="Kriterium verwalten">
          <OperationForm
            operation="criterion.evaluate"
            label="Bewertung speichern"
            closeOnSuccess
          >
            <Hidden name="goalId" value={goalId} />
            <Hidden name="criterionId" value={criterion.id} />
            <Hidden name="criterionType" value={criterion.criterionType} />
            <Hidden
              name="expectedLatestEvaluationId"
              value={criterion.latestEvaluation?.id ?? ""}
            />
            <Choice
              name="evaluationState"
              label="Bewertungsstatus"
              options={[
                { id: "value", title: "Wert bewerten" },
                { id: "deferred", title: "Später prüfen" },
              ]}
              required
            />
            {criterion.criterionType === "boolean" ? (
              <Choice
                name="booleanValue"
                label="Wert"
                options={[
                  { id: "true", title: "Ja · erfüllt" },
                  { id: "false", title: "Nein · noch nicht erfüllt" },
                ]}
              />
            ) : (
              <>
                <label className="grid gap-1 text-sm">
                  Aktueller Messwert
                  <input
                    className={fieldClass}
                    name="numericValue"
                    type="number"
                    step="any"
                  />
                </label>
                <input type="hidden" name="unit" value={criterion.unit ?? ""} />
                <p className="text-sm text-[var(--text-muted)]">
                  Einheit: {criterion.unit}
                </p>
              </>
            )}
            <label className="grid gap-1 text-sm">
              Notiz (optional)
              <input className={fieldClass} name="note" />
            </label>
          </OperationForm>
          {criterion.latestEvaluation && (
            <OperationForm
              operation="criterion.evidence"
              label="Belegverlauf ändern"
              closeOnSuccess
            >
              <Hidden name="goalId" value={goalId} />
              <Hidden
                name="evaluationId"
                value={criterion.latestEvaluation.id}
              />
              <EvidenceLedgerFields
                data={data}
                outcome={outcome}
                allowed={[
                  "task",
                  "project",
                  "project_milestone",
                  "resource",
                  "review_record",
                ]}
                existing={criterion.latestEvaluation.evidenceHistory ?? []}
              />
            </OperationForm>
          )}
          {criterion.latestEvaluation && (
            <div className="grid gap-3 md:grid-cols-2">
              <OperationForm
                operation="criterion.correct"
                label="Letzte Bewertung korrigieren"
                closeOnSuccess
              >
                <Hidden name="goalId" value={goalId} />
                <Hidden name="criterionId" value={criterion.id} />
                <Hidden name="criterionType" value={criterion.criterionType} />
                <Hidden
                  name="expectedLatestEvaluationId"
                  value={criterion.latestEvaluation.id}
                />
                {criterion.criterionType === "boolean" ? (
                  <Choice
                    name="booleanValue"
                    label="Korrekturwert"
                    options={[
                      { id: "true", title: "Ja · erfüllt" },
                      { id: "false", title: "Nein · noch nicht erfüllt" },
                    ]}
                    required
                  />
                ) : (
                  <>
                    <label className="grid gap-1 text-sm">
                      Korrekturwert
                      <input
                        className={fieldClass}
                        name="numericValue"
                        type="number"
                        step="any"
                        required
                      />
                    </label>
                    <input
                      type="hidden"
                      name="unit"
                      value={criterion.unit ?? ""}
                    />
                  </>
                )}
                <label className="grid gap-1 text-sm">
                  Korrekturgrund
                  <input
                    className={fieldClass}
                    name="correctionReason"
                    required
                  />
                </label>
              </OperationForm>
              <OperationForm
                operation="criterion.retract"
                label="Bewertung zurücknehmen"
                closeOnSuccess
              >
                <Hidden name="goalId" value={goalId} />
                <Hidden name="criterionId" value={criterion.id} />
                <Hidden name="criterionType" value={criterion.criterionType} />
                <Hidden
                  name="expectedLatestEvaluationId"
                  value={criterion.latestEvaluation.id}
                />
                <label className="grid gap-1 text-sm">
                  Grund
                  <input
                    className={fieldClass}
                    name="correctionReason"
                    required
                  />
                </label>
              </OperationForm>
            </div>
          )}
          <OperationForm
            operation="criterion.archive"
            label="Kriterium archivieren"
            closeOnSuccess
          >
            <Hidden name="goalId" value={goalId} />
            <Hidden name="criterionId" value={criterion.id} />
          </OperationForm>
        </ManagementDisclosure>
      )}
    </article>
  );
}

function EventAmendmentFields({
  event,
  kind,
}: {
  event: GoalAchievementEvent | GoalMilestoneAchievementEvent;
  kind: "goal" | "milestone";
}) {
  return (
    <>
      <Hidden name="eventId" value={event.id} />
      <label className="grid gap-1 text-sm">
        Korrigierter Zeitpunkt (optional)
        <input className={fieldClass} name="occurredAt" type="datetime-local" />
      </label>
      <label className="grid gap-1 text-sm">
        {kind === "goal"
          ? "Korrigierte Erfolgsnotiz"
          : "Korrigierte Verlaufsnotiz"}
        <input
          className={fieldClass}
          name={kind === "goal" ? "achievementNote" : "note"}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Begründung
        <input className={fieldClass} name="correctionReason" required />
      </label>
      <label className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
        <input name="retrospective" type="checkbox" />
        <span>Als retrospektive Ergänzung markieren</span>
      </label>
    </>
  );
}

function MilestoneCard({
  data,
  goalId,
  milestone,
  outcome,
  projectById,
  taskById,
  canManage,
  index,
  activeCount,
}: {
  data: WorkbenchData;
  goalId: string;
  milestone: GoalMilestone;
  outcome: GoalOutcome;
  projectById: ReadonlyMap<string, { id: string; title: string }>;
  taskById: ReadonlyMap<string, { id: string; title: string }>;
  canManage: boolean;
  index: number;
  activeCount: number;
}) {
  const projectLinks = outcome.projectSupport.filter(
    (link) => link.goalMilestoneId === milestone.id,
  );
  const taskLinks = outcome.taskSupport.filter(
    (link) => link.goalMilestoneId === milestone.id,
  );
  const event = currentGoalMilestoneAchievementEvent(
    milestone.id,
    milestone.status,
    outcome.milestoneHistory,
  );
  const isArchived = Boolean(milestone.archivedAt);
  return (
    <article
      className="grid gap-3 border-t border-[var(--border-subtle)] pt-4"
      data-goal-milestone-id={milestone.id}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{milestone.title}</h3>
          <p className="text-sm text-[var(--text-muted)]">
            {milestoneStatusLabel(milestone.status)}
            {milestone.targetDate ? ` · Ziel ${milestone.targetDate}` : ""}
            {isArchived ? " · archiviert" : ""}
          </p>
        </div>
        {canManage && !isArchived && (
          <ManagementDisclosure label="Etappe bearbeiten">
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <OperationForm
                  operation="milestone.status"
                  label={
                    milestone.status === "achieved"
                      ? "Wieder aktivieren"
                      : "Aktivieren"
                  }
                  disabled={milestone.status === "active"}
                  closeOnSuccess
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="milestoneId" value={milestone.id} />
                  <Hidden name="status" value="active" />
                  <Hidden
                    name="expectedUpdatedAt"
                    value={milestone.updatedAt}
                  />
                </OperationForm>
                <OperationForm
                  operation="milestone.status"
                  label="Planen"
                  disabled={milestone.status !== "active"}
                  closeOnSuccess
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="milestoneId" value={milestone.id} />
                  <Hidden name="status" value="planned" />
                </OperationForm>
                <OperationForm
                  operation="milestone.status"
                  label="Erreicht"
                  disabled={milestone.status !== "active"}
                  closeOnSuccess
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="milestoneId" value={milestone.id} />
                  <Hidden name="status" value="achieved" />
                  <Hidden
                    name="expectedUpdatedAt"
                    value={milestone.updatedAt}
                  />
                  <label className="grid gap-1 text-sm">
                    Notiz (optional)
                    <input className={fieldClass} name="note" />
                  </label>
                </OperationForm>
              </div>
              <OperationForm
                operation="milestone.update"
                label="Etappe speichern"
                closeOnSuccess
              >
                <Hidden name="goalId" value={goalId} />
                <Hidden name="milestoneId" value={milestone.id} />
                <label className="grid gap-1 text-sm">
                  Titel
                  <input
                    className={fieldClass}
                    name="title"
                    defaultValue={milestone.title}
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Beschreibung
                  <textarea
                    className={fieldClass}
                    name="description"
                    defaultValue={milestone.description ?? ""}
                    rows={3}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Zieldatum
                  <input
                    className={fieldClass}
                    name="targetDate"
                    type="date"
                    defaultValue={milestone.targetDate ?? ""}
                  />
                </label>
              </OperationForm>
              <div className="flex flex-wrap gap-3">
                <OperationForm
                  operation="milestone.reorder"
                  label="Nach oben"
                  disabled={index === 0}
                  closeOnSuccess
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="milestoneId" value={milestone.id} />
                  <Hidden name="direction" value="up" />
                </OperationForm>
                <OperationForm
                  operation="milestone.reorder"
                  label="Nach unten"
                  disabled={index === activeCount - 1}
                  closeOnSuccess
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="milestoneId" value={milestone.id} />
                  <Hidden name="direction" value="down" />
                </OperationForm>
                <OperationForm
                  operation="milestone.archive"
                  label="Etappe archivieren"
                  closeOnSuccess
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="milestoneId" value={milestone.id} />
                </OperationForm>
              </div>
              {event && milestone.status === "achieved" && (
                <OperationForm
                  operation="milestone.evidence"
                  label="Etappen-Belegverlauf ändern"
                  closeOnSuccess
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="milestoneId" value={milestone.id} />
                  <Hidden name="achievementEventId" value={event.id} />
                  <EvidenceLedgerFields
                    data={data}
                    outcome={outcome}
                    allowed={[
                      "goal_criterion_evaluation",
                      "project",
                      "project_milestone",
                      "task",
                      "resource",
                      "review_record",
                    ]}
                    existing={event.evidenceHistory}
                  />
                </OperationForm>
              )}
              {event && (
                <OperationForm
                  operation="milestone.amend"
                  label="Etappen-Verlauf ergänzen"
                  closeOnSuccess
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="milestoneId" value={milestone.id} />
                  <EventAmendmentFields event={event} kind="milestone" />
                </OperationForm>
              )}
            </div>
          </ManagementDisclosure>
        )}
      </div>
      {milestone.description && (
        <p className="text-sm text-[var(--text-secondary)]">
          {milestone.description}
        </p>
      )}
      {event?.resultingStatus === "achieved" && (
        <p className="text-sm text-[var(--text-muted)]">
          {event.evidence.length} aktive Belege im aktuellen Ergebnis.
        </p>
      )}
      <div className="grid gap-2 text-sm">
        <p className="font-semibold">Beitragender Kontext</p>
        {projectLinks.length > 0 || taskLinks.length > 0 ? (
          <ul className="grid gap-1 text-[var(--text-secondary)]">
            {projectLinks.map((link) => (
              <li key={link.id}>
                <Link
                  className="text-[var(--accent-cyan)]"
                  href={`/projects/${link.targetId}`}
                >
                  Projekt ·{" "}
                  {projectById.get(link.targetId)?.title ?? link.targetTitle}
                </Link>
              </li>
            ))}
            {taskLinks.map((link) => (
              <li key={link.id}>
                <Link
                  className="text-[var(--accent-cyan)]"
                  href={`/tasks/${link.targetId}`}
                >
                  Aufgabe ·{" "}
                  {taskById.get(link.targetId)?.title ?? link.targetTitle}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--text-muted)]">
            Noch kein Projekt- oder Aufgaben-Kontext.
          </p>
        )}
      </div>
      {canManage && !isArchived && (
        <div className="flex flex-wrap gap-3">
          <Link
            className="text-sm text-[var(--accent-cyan)]"
            href={`/projects/new?goal=${goalId}&goalMilestone=${milestone.id}`}
          >
            Projekt hinzufügen
          </Link>
          <Link
            className="text-sm text-[var(--accent-cyan)]"
            href={`/tasks/new?goal=${goalId}&goalMilestone=${milestone.id}`}
          >
            Aufgabe hinzufügen
          </Link>
        </div>
      )}
    </article>
  );
}

function HistoryManagement({
  data,
  outcome,
  goalId,
  event,
}: {
  data: WorkbenchData;
  outcome: GoalOutcome;
  goalId: string;
  event: GoalAchievementEvent;
}) {
  return (
    <ManagementDisclosure label="Verlaufseintrag verwalten">
      <OperationForm
        operation="goal.amend"
        label="Ziel-Verlauf ergänzen"
        closeOnSuccess
      >
        <Hidden name="goalId" value={goalId} />
        <EventAmendmentFields event={event} kind="goal" />
      </OperationForm>
      {event.resultingStatus === "achieved" && (
        <OperationForm
          operation="goal.evidence"
          label="Ziel-Belegverlauf ändern"
          closeOnSuccess
        >
          <Hidden name="goalId" value={goalId} />
          <Hidden name="achievementEventId" value={event.id} />
          <EvidenceLedgerFields
            data={data}
            outcome={outcome}
            allowed={[
              "project",
              "project_milestone",
              "task",
              "resource",
              "review_record",
            ]}
            existing={event.evidenceHistory}
          />
        </OperationForm>
      )}
    </ManagementDisclosure>
  );
}

function HistoryEntry({
  data,
  outcome,
  goalId,
  event,
}: {
  data: WorkbenchData;
  outcome: GoalOutcome;
  goalId: string;
  event: GoalAchievementEvent;
}) {
  const marker = legacyLabel(event);
  return (
    <article className="grid gap-2 border-t border-[var(--border-subtle)] pt-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            Ziel{" "}
            {event.eventType === "achieved"
              ? "erreicht"
              : event.eventType === "reopened"
                ? "wieder geöffnet"
                : "Verlauf ergänzt"}
          </p>
          <p className="text-sm text-[var(--text-muted)]">{eventDate(event)}</p>
        </div>
        <HistoryManagement
          data={data}
          outcome={outcome}
          goalId={goalId}
          event={event}
        />
      </div>
      {marker && (
        <p className="text-xs text-[var(--accent-orange)]">{marker}</p>
      )}
      {event.legacyState && (
        <p className="text-sm text-[var(--text-secondary)]">
          Aktuelle Zielidentität: {outcome.goalTitle}. Die historische Identität
          bleibt unbekannt.
        </p>
      )}
      {event.achievementNote && (
        <p className="text-sm text-[var(--text-secondary)]">
          Notiz: {event.achievementNote}
        </p>
      )}
      {event.correctsEventId && (
        <p className="text-sm text-[var(--text-secondary)]">
          Korrigiert eine frühere Entscheidung · Grund:{" "}
          {event.correctionReason ?? "nicht angegeben"}
        </p>
      )}
      {event.resultingStatus === "achieved" && (
        <>
          <p className="text-sm">
            {event.criterionBasis.length}{" "}
            {event.criterionBasis.length === 1
              ? "Erfolgskriterium"
              : "Erfolgskriterien"}{" "}
            · {event.milestoneBasis.length}{" "}
            {event.milestoneBasis.length === 1 ? "Etappe" : "Etappen"} ·{" "}
            {event.evidence.length}{" "}
            {event.evidence.length === 1 ? "Beleg" : "Belege"}
          </p>
          {event.criterionBasis.length > 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Damalige Erfolgskriterien:{" "}
              {event.criterionBasis.map(criterionBasisLabel).join(" · ")}
            </p>
          )}
          {event.milestoneBasis.length > 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Damals erreichte Etappen:{" "}
              {event.milestoneBasis.map(milestoneBasisLabel).join(" · ")}
            </p>
          )}
        </>
      )}
      {event.evidenceHistory.length > 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          Belegverlauf: {evidenceLabel(event.evidenceHistory)}
        </p>
      )}
    </article>
  );
}

function MilestoneHistoryEntry({
  data,
  outcome,
  goalId,
  event,
}: {
  data: WorkbenchData;
  outcome: GoalOutcome;
  goalId: string;
  event: GoalMilestoneAchievementEvent;
}) {
  const marker = legacyLabel(event);
  return (
    <article className="grid gap-2 border-t border-[var(--border-subtle)] pt-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            Etappe{" "}
            {event.eventType === "achieved"
              ? "erreicht"
              : event.eventType === "reopened"
                ? "wieder geöffnet"
                : "Verlauf ergänzt"}
            {event.milestoneTitleSnapshot
              ? `: ${event.milestoneTitleSnapshot}`
              : ""}
          </p>
          <p className="text-sm text-[var(--text-muted)]">{eventDate(event)}</p>
        </div>
        <ManagementDisclosure label="Verlaufseintrag verwalten">
          <OperationForm
            operation="milestone.amend"
            label="Etappen-Verlauf ergänzen"
            closeOnSuccess
          >
            <Hidden name="goalId" value={goalId} />
            <Hidden name="milestoneId" value={event.milestoneId} />
            <EventAmendmentFields event={event} kind="milestone" />
          </OperationForm>
          {event.resultingStatus === "achieved" && (
            <OperationForm
              operation="milestone.evidence"
              label="Etappen-Belegverlauf ändern"
              closeOnSuccess
            >
              <Hidden name="goalId" value={goalId} />
              <Hidden name="milestoneId" value={event.milestoneId} />
              <Hidden name="achievementEventId" value={event.id} />
              <EvidenceLedgerFields
                data={data}
                outcome={outcome}
                allowed={[
                  "goal_criterion_evaluation",
                  "project",
                  "project_milestone",
                  "task",
                  "resource",
                  "review_record",
                ]}
                existing={event.evidenceHistory}
              />
            </OperationForm>
          )}
        </ManagementDisclosure>
      </div>
      {marker && (
        <p className="text-xs text-[var(--accent-orange)]">{marker}</p>
      )}
      {event.legacyState && (
        <p className="text-sm text-[var(--text-secondary)]">
          Aktuelle Etappenidentität:{" "}
          {outcome.milestones.find(
            (milestone) => milestone.id === event.milestoneId,
          )?.title ?? "nicht verfügbar"}
          . Die historische Identität bleibt unbekannt.
        </p>
      )}
      {event.note && (
        <p className="text-sm text-[var(--text-secondary)]">
          Notiz: {event.note}
        </p>
      )}
      {event.correctsEventId && (
        <p className="text-sm text-[var(--text-secondary)]">
          Korrigiert eine frühere Entscheidung · Grund:{" "}
          {event.correctionReason ?? "nicht angegeben"}
        </p>
      )}
      {event.evidenceHistory.length > 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          Belegverlauf: {evidenceLabel(event.evidenceHistory)}
        </p>
      )}
    </article>
  );
}

export function GoalOutcomeWorkbench({
  data,
  goalId,
  edit,
  outcome,
  area,
  selectedStage,
}: {
  data: WorkbenchData;
  goalId: string;
  edit: ReactNode;
  outcome: GoalOutcome;
  area?: string;
  selectedStage?: string;
}) {
  const milestoneTitles = new Map(
    outcome.milestones.map((milestone) => [milestone.id, milestone.title]),
  );
  const activeMilestones = outcome.milestones.filter(
    (milestone) => !milestone.archivedAt,
  );
  const selectedArea = ["ueberblick", "arbeit", "erfolg", "verlauf"].includes(
    area ?? "",
  )
    ? area!
    : selectedStage
      ? "arbeit"
      : "ueberblick";
  const selectedMilestone =
    activeMilestones.find((milestone) => milestone.id === selectedStage) ??
    activeMilestones.find((milestone) => milestone.status === "active") ??
    activeMilestones[0] ??
    null;
  const activeCriteria = outcome.criteria.filter(
    (criterion) => !criterion.archivedAt,
  );
  const projectSupportIds = new Set(
    outcome.projectSupport.map((link) => link.targetId),
  );
  const taskSupportIds = new Set(
    outcome.taskSupport.map((link) => link.targetId),
  );
  const archived = outcome.goalStatus === "archived";
  const canManage = !archived && outcome.goalStatus !== "achieved";
  const projectById = new Map(
    outcome.projects.map((project) => [project.id, project]),
  );
  const taskById = new Map(outcome.tasks.map((task) => [task.id, task]));
  const eligibleProjects = outcome.projects
    .filter(
      (project) => !project.archivedAt && !projectSupportIds.has(project.id),
    )
    .map((project) => ({ id: project.id, title: project.title }));
  const eligibleTasks = outcome.tasks
    .filter((task) => !task.archivedAt && !taskSupportIds.has(task.id))
    .map((task) => ({ id: task.id, title: task.title }));
  const recentGoalHistory = outcome.achievementHistory;
  const recentMilestoneHistory = outcome.milestoneHistory;
  const latestAchievement = currentGoalAchievementEvent(
    outcome.achievementHistory,
    outcome.goalStatus,
  );
  const effectiveAchievementAt =
    latestAchievement?.occurredAt ?? outcome.achievedAt;
  const goalRow = data.goals.find((goal) => goal.id === goalId);
  const areaName = data.areas.find(
    (area) => area.id === goalRow?.area_id && !area.archived_at,
  )?.name;
  const hasSuccessDefinition =
    activeCriteria.length > 0 || activeMilestones.length > 0;
  const hasSupportingWork =
    outcome.projects.some((project) => !project.archivedAt) ||
    outcome.tasks.some((task) => !task.archivedAt);
  const nextStepTitle =
    outcome.goalStatus === "achieved"
      ? "Das erreichte Ergebnis bleibt nachvollziehbar"
      : outcome.summary.readyToAchieve && activeCriteria.length > 0
        ? "Ergebnis bewusst prüfen und bestätigen"
        : outcome.nextStep.kind !== "goal"
          ? outcome.nextStep.title
          : activeCriteria.length === 0
            ? "Definiere, woran du Erfolg erkennst."
            : activeMilestones.length === 0
              ? "Gib dem Weg zum Ziel eine erste Etappe."
              : "Plane den nächsten konkreten Schritt.";
  const nextStepReason =
    outcome.goalStatus === "achieved"
      ? "Die damalige Grundlage und ausdrücklich ausgewählten Belege sind im Überblick und Verlauf dokumentiert."
      : outcome.summary.readyToAchieve && activeCriteria.length > 0
        ? "Alle kanonischen Kriterien und Etappen sind erfüllt. Erst deine ausdrückliche Entscheidung schließt das Ziel ab."
        : outcome.nextStep.kind !== "goal"
          ? outcome.nextStep.reason
          : activeCriteria.length === 0
            ? "Eine klare Erfolgsidee hilft dir später bei der bewussten Entscheidung."
            : activeMilestones.length === 0
              ? "Etappen machen den Weg sichtbar, ohne eine feste Reihenfolge zu erzwingen."
              : outcome.nextStep.reason;
  const nextStepAction =
    outcome.goalStatus === "achieved"
      ? { href: goalAreaHref(goalId, "verlauf"), label: "Verlauf ansehen" }
      : outcome.summary.readyToAchieve && activeCriteria.length > 0
        ? { href: goalAreaHref(goalId, "erfolg"), label: "Ergebnis prüfen" }
        : outcome.nextStep.kind === "task"
          ? {
              href: outcome.nextStep.href ?? `/tasks/${outcome.nextStep.id}`,
              label:
                outcome.nextStep.state === "blocked"
                  ? "Blockierte Aufgabe öffnen"
                  : "Aufgabe öffnen",
            }
          : outcome.nextStep.kind === "project"
            ? {
                href:
                  outcome.nextStep.href ?? `/projects/${outcome.nextStep.id}`,
                label: "Projekt öffnen",
              }
            : activeCriteria.length === 0
              ? {
                  href: goalAreaHref(goalId, "erfolg"),
                  label: "Erfolg festlegen",
                }
              : {
                  href: goalAreaHref(goalId, "arbeit"),
                  label: "Weg gestalten",
                };
  const successGuidance =
    outcome.goalStatus === "achieved"
      ? "Das Ergebnis ist bestätigt. Grundlage und Belege bleiben hier nachvollziehbar."
      : activeCriteria.length === 0 && activeMilestones.length === 0
        ? "Lege zuerst fest, woran du Erfolg erkennst. Den Weg kannst du danach in Etappen formen."
        : activeCriteria.length === 0
          ? "Lege ein Erfolgskriterium fest, damit du später weißt, wann das Ziel erreicht ist."
          : activeMilestones.length === 0 && !hasSupportingWork
            ? "Der Erfolg ist definiert. Gib dem Ziel jetzt bei Bedarf einen ersten Weg oder eine Aufgabe."
            : outcome.summary.readyToAchieve
              ? "Die aktuellen Kriterien und Etappen sind erfüllt. Du kannst das Ergebnis jetzt bewusst bestätigen."
              : "Die offenen Kriterien und Etappen zeigen, was vor der Ergebnisbestätigung noch fehlt.";
  return (
    <EntityWorkbenchShell
      kind="goal"
      title={outcome.goalTitle}
      headingInContent
    >
      <div
        data-goal-outcome="workbench"
        data-goal-read-first="true"
        className="grid min-w-0 content-start gap-5"
      >
        <header
          className="grid min-w-0 gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 md:p-7"
          data-goal-default-surface
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--accent-blue)]">
              {outcome.goalStatus === "achieved"
                ? "Erreichtes Ergebnis"
                : "Ziel"}
            </p>
            <span
              className="rounded-full border border-[var(--border-default)] px-2 py-1 text-xs text-[var(--text-secondary)]"
              data-goal-status
            >
              {goalStatusLabel(outcome.goalStatus)}
            </span>
          </div>
          <h1 className="max-w-5xl break-words text-3xl font-semibold tracking-tight">
            {outcome.goalTitle}
          </h1>
          {outcome.goalStatus === "achieved" && (
            <div className="grid gap-2">
              <p className="text-base font-semibold text-[var(--accent-cyan)]">
                Ergebnis bestätigt
                {effectiveAchievementAt
                  ? ` am ${goalDateLabel(effectiveAchievementAt)}`
                  : ""}
                .
              </p>
              {(latestAchievement?.achievementNote ??
                outcome.achievementNote) && (
                <p className="max-w-4xl whitespace-pre-wrap text-base text-[var(--text-secondary)]">
                  {latestAchievement?.achievementNote ??
                    outcome.achievementNote}
                </p>
              )}
            </div>
          )}
          {outcome.goalStatus !== "achieved" && (
            <div className="grid gap-2">
              <p className="max-w-4xl whitespace-pre-wrap text-base text-[var(--text-secondary)] line-clamp-2">
                {outcome.goalDescription ||
                  "Noch keine Beschreibung. Das Ziel bleibt bewusst leichtgewichtig."}
              </p>
              {outcome.goalWhy && (
                <p className="max-w-4xl whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold">Warum:</span>{" "}
                  {outcome.goalWhy}
                </p>
              )}
            </div>
          )}
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-[var(--text-muted)]">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--text-faint)]">
                Horizont
              </dt>
              <dd>{goalHorizonLabel(outcome.goalHorizon)}</dd>
            </div>
            {outcome.targetDate && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--text-faint)]">
                  Zieltermin
                </dt>
                <dd>{goalDateLabel(outcome.targetDate)}</dd>
              </div>
            )}
            {areaName && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--text-faint)]">
                  Area
                </dt>
                <dd>{areaName}</dd>
              </div>
            )}
          </dl>
          {archived && (
            <p role="status" className="text-sm text-[var(--text-secondary)]">
              Dieses archivierte Ziel ist schreibgeschützt. Verlauf und Belege
              bleiben sichtbar.
            </p>
          )}
          {outcome.goalStatus !== "achieved" && (
            <section
              id="naechster-schritt"
              aria-label="Aktueller Schritt"
              className="grid gap-2 border-t border-[var(--border-subtle)] pt-4"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {outcome.summary.readyToAchieve
                  ? "Prüfbereit"
                  : "Aktueller Schritt"}
              </h2>
              <div className="grid gap-2">
                <p
                  className="text-sm font-semibold text-[var(--accent-orange)]"
                  data-goal-next-step-state={outcome.nextStep.state}
                >
                  {outcome.summary.readyToAchieve
                    ? "Zur Prüfung bereit"
                    : outcome.nextStep.state === "blocked"
                      ? "Blockiert"
                      : outcome.nextStep.state === "ready"
                        ? "Bereit"
                        : "Planung"}
                </p>
                <p className="text-base font-semibold">{nextStepTitle}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {nextStepReason}
                </p>
                {!outcome.summary.readyToAchieve &&
                  outcome.nextStep.blockers.length > 0 && (
                    <div className="grid gap-1 text-sm text-[var(--accent-orange)]">
                      <span>Blockiert durch:</span>
                      <ul className="grid gap-1">
                        {outcome.nextStep.blockers.map((blocker) => (
                          <li key={blocker.id ?? blocker.title}>
                            {blocker.id ? (
                              <Link
                                className="underline underline-offset-4"
                                href={`/tasks/${blocker.id}`}
                              >
                                {blocker.title}
                              </Link>
                            ) : (
                              blocker.title
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {nextStepAction && (
                  <Link
                    className="mt-2 inline-flex min-h-10 w-fit items-center rounded-lg bg-[var(--accent-cyan)] px-4 py-2 text-sm font-semibold text-[var(--bg-app)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                    href={nextStepAction.href}
                  >
                    {nextStepAction.label}
                  </Link>
                )}
              </div>
            </section>
          )}
        </header>

        <nav
          aria-label="Zielbereiche"
          className="flex min-w-0 gap-1 overflow-x-auto border-b border-[var(--border-subtle)]"
          data-goal-areas
        >
          {(
            [
              ["ueberblick", "Überblick"],
              ["arbeit", "Arbeit"],
              ["erfolg", "Erfolg"],
              ["verlauf", "Verlauf"],
            ] as const
          ).map(([id, label]) => (
            <Link
              key={id}
              href={goalAreaHref(
                goalId,
                id,
                id === "arbeit" ? selectedMilestone?.id : undefined,
              )}
              aria-current={selectedArea === id ? "page" : undefined}
              className={`min-h-11 shrink-0 border-b-2 px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] ${selectedArea === id ? "border-[var(--accent-cyan)] text-[var(--text-primary)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <ManagementDisclosureGroup className="grid gap-6">
          {selectedArea === "ueberblick" && (
            <section
              aria-label="Zielüberblick"
              className="grid min-w-0 gap-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 md:p-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]"
            >
              <div
                className={`${outcome.goalStatus === "achieved" ? "order-1" : "order-2"} grid min-w-0 content-start gap-5 lg:col-span-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]`}
              >
                <div
                  className={`min-w-0 ${outcome.goalStatus === "achieved" ? "order-2 lg:col-span-2" : ""}`}
                >
                  <h2 className="text-lg font-semibold">
                    Was sich verändern soll
                  </h2>
                  <p className="mt-3 max-w-[75ch] whitespace-pre-wrap break-words text-base leading-7 text-[var(--text-secondary)]">
                    {outcome.goalDescription ||
                      "Beschreibe das gewünschte Ergebnis und seine Grenzen."}
                  </p>
                  {outcome.goalWhy && (
                    <p className="mt-4 max-w-[75ch] whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">
                        Warum mir das wichtig ist ·{" "}
                      </span>
                      {outcome.goalWhy}
                    </p>
                  )}
                </div>
                {outcome.goalStatus === "achieved" && latestAchievement && (
                  <div
                    className="order-1 grid min-w-0 gap-3 border-l-2 border-[var(--accent-cyan)] pl-5 lg:col-span-2"
                    data-goal-achieved-overview
                  >
                    <h2 className="text-lg font-semibold">
                      Bestätigtes Ergebnis
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Bestätigt {eventDate(latestAchievement)}
                      {latestAchievement.achievementNote
                        ? ` · ${latestAchievement.achievementNote}`
                        : ""}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {latestAchievement.criterionBasis.length}{" "}
                      {latestAchievement.criterionBasis.length === 1
                        ? "Erfolgskriterium"
                        : "Erfolgskriterien"}{" "}
                      · {latestAchievement.milestoneBasis.length}{" "}
                      {latestAchievement.milestoneBasis.length === 1
                        ? "Etappe"
                        : "Etappen"}{" "}
                      · {latestAchievement.evidence.length}{" "}
                      {latestAchievement.evidence.length === 1
                        ? "Beleg"
                        : "Belege"}
                    </p>
                    <ul className="grid gap-1 text-sm text-[var(--text-secondary)]">
                      {latestAchievement.criterionBasis.map((basis) => (
                        <li key={basis.criterionId}>
                          {criterionBasisLabel(basis)}
                        </li>
                      ))}
                      {latestAchievement.milestoneBasis.map((basis) => {
                        const episode = outcome.milestoneHistory.find(
                          (event) =>
                            event.episodeId === basis.achievementEpisodeId &&
                            event.eventType === "achieved",
                        );
                        return (
                          <li key={basis.milestoneId}>
                            {milestoneBasisLabel(basis)}
                            {episode
                              ? ` · bestätigt ${eventDate(episode)}`
                              : ""}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Zusätzliche Quellen:{" "}
                      {latestAchievement.evidence.length
                        ? evidenceLabel(latestAchievement.evidence)
                        : "Keine ausdrücklich ausgewählt."}
                    </p>
                    <Link
                      href={goalAreaHref(goalId, "verlauf")}
                      className="w-fit text-sm text-[var(--accent-cyan)] underline underline-offset-4"
                    >
                      Entscheidungsverlauf ansehen
                    </Link>
                    {!archived && (
                      <ManagementDisclosure
                        label="Ziel wieder öffnen"
                        triggerText="Wieder öffnen"
                      >
                        <OperationForm
                          operation="reopen"
                          label="Ziel wieder öffnen"
                          closeOnSuccess
                        >
                          <Hidden name="goalId" value={goalId} />
                          <Hidden
                            name="expectedUpdatedAt"
                            value={outcome.updatedAt}
                          />
                        </OperationForm>
                      </ManagementDisclosure>
                    )}
                  </div>
                )}
                {outcome.goalStatus !== "achieved" && (
                  <div className="grid gap-2 border-t border-[var(--border-subtle)] pt-4">
                    <h2 className="text-lg font-semibold">Erfolg und Arbeit</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {activeCriteria.length}{" "}
                      {activeCriteria.length === 1
                        ? "Erfolgskriterium"
                        : "Erfolgskriterien"}{" "}
                      ·{" "}
                      {
                        outcome.projects.filter((item) => !item.archivedAt)
                          .length
                      }{" "}
                      Projekte ·{" "}
                      {outcome.tasks.filter((item) => !item.archivedAt).length}{" "}
                      Aufgaben
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Erfolg wird ausdrücklich bewertet. Arbeit und Etappen
                      leisten einen Beitrag, bestätigen ihn aber nicht
                      automatisch.
                    </p>
                    <Link
                      href={goalAreaHref(goalId, "erfolg")}
                      className="w-fit text-sm text-[var(--accent-cyan)] underline underline-offset-4"
                    >
                      Erfolgskriterien ansehen
                    </Link>
                  </div>
                )}
              </div>
              <div
                className={`${outcome.goalStatus === "achieved" ? "order-2" : "order-1"} min-w-0 border-b border-[var(--border-subtle)] pb-5 lg:col-span-2`}
              >
                <div className="mb-5">
                  <h2 className="text-lg font-semibold">Etappenfolge</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Planungsreihenfolge, keine Abhängigkeit. Mehrere Etappen
                    können gleichzeitig aktiv sein.
                  </p>
                </div>
                <MilestoneProgression
                  goalId={goalId}
                  outcome={outcome}
                  selectedId={null}
                  horizontal
                />
                {canManage && (
                  <Link
                    href={goalAreaHref(goalId, "arbeit")}
                    className="mt-5 inline-block text-sm text-[var(--accent-cyan)] underline underline-offset-4"
                  >
                    Arbeit und Etappen bearbeiten
                  </Link>
                )}
              </div>
            </section>
          )}
          {(selectedArea === "arbeit" || selectedArea === "erfolg") && (
            <section
              id="zielplanung"
              aria-labelledby="zielplanung-heading"
              data-goal-planning-surface
              className="grid min-w-0 gap-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 md:p-7"
            >
              <h2 id="zielplanung-heading" className="sr-only">
                Zielplanung
              </h2>

              {selectedArea === "erfolg" && (
                <PlanningRegion id="erfolg-erkennen" title="Erfolg erkennen">
                  <p className="text-sm text-[var(--text-muted)]">
                    {successGuidance}
                  </p>

                  {outcome.goalStatus === "achieved" ? (
                    <div className="grid gap-3" data-goal-achieved-summary>
                      {latestAchievement ? (
                        <div className="grid gap-2 text-sm text-[var(--text-secondary)]">
                          <p>
                            Grundlage: {latestAchievement.criterionBasis.length}{" "}
                            Erfolgskriterien ·{" "}
                            {latestAchievement.milestoneBasis.length} Etappen ·{" "}
                            {latestAchievement.evidence.length} Belege
                          </p>
                          {latestAchievement.criterionBasis.length > 0 && (
                            <p>
                              Erfolgskriterien:{" "}
                              {latestAchievement.criterionBasis
                                .map(criterionBasisLabel)
                                .join(" · ")}
                            </p>
                          )}
                          {latestAchievement.milestoneBasis.length > 0 && (
                            <p>
                              Etappen:{" "}
                              {latestAchievement.milestoneBasis
                                .map(milestoneBasisLabel)
                                .join(" · ")}
                            </p>
                          )}
                          <p>
                            Belege:{" "}
                            {latestAchievement.evidence.length > 0
                              ? evidenceLabel(latestAchievement.evidence)
                              : "Keine aktiven Belege hinterlegt."}
                          </p>
                        </div>
                      ) : null}
                      {!archived && latestAchievement && (
                        <ManagementDisclosure
                          label="Ziel wieder öffnen"
                          triggerText="Wieder öffnen"
                        >
                          <OperationForm
                            operation="reopen"
                            label="Ziel wieder öffnen"
                            closeOnSuccess
                          >
                            <Hidden name="goalId" value={goalId} />
                            <Hidden
                              name="expectedUpdatedAt"
                              value={outcome.updatedAt}
                            />
                          </OperationForm>
                        </ManagementDisclosure>
                      )}
                    </div>
                  ) : (
                    <>
                      {hasSuccessDefinition && (
                        <p
                          className="text-sm font-semibold text-[var(--text-secondary)]"
                          data-goal-result-state={
                            outcome.summary.readyToAchieve ? "ready" : "open"
                          }
                        >
                          {outcome.summary.readyToAchieve
                            ? "Ergebnis bereit"
                            : "Ergebnis noch offen"}
                        </p>
                      )}
                      {hasSuccessDefinition &&
                        outcome.summary.blockers.length > 0 && (
                          <ul
                            className="grid gap-1 text-sm text-[var(--accent-orange)]"
                            aria-label="Was noch fehlt"
                          >
                            {outcome.summary.blockers.map((blocker) => (
                              <li key={blocker}>{readableBlocker(blocker)}</li>
                            ))}
                          </ul>
                        )}
                    </>
                  )}

                  {outcome.goalStatus !== "achieved" &&
                    hasSuccessDefinition && (
                      <div className="grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                        {activeCriteria.length > 0 && (
                          <p>
                            {outcome.summary.metCriteriaCount} von{" "}
                            {outcome.summary.activeCriteriaCount}{" "}
                            Erfolgskriterien erfüllt
                          </p>
                        )}
                        {outcome.summary.deferredCriteriaCount > 0 && (
                          <p>
                            {outcome.summary.deferredCriteriaCount}{" "}
                            Erfolgskriterium/ Erfolgskriterien später prüfen
                          </p>
                        )}
                        {activeMilestones.length > 0 && (
                          <p>
                            {outcome.summary.achievedMilestoneCount} von{" "}
                            {outcome.summary.activeMilestoneCount} Etappen
                            erreicht
                          </p>
                        )}
                      </div>
                    )}

                  {activeCriteria.length > 0 ? (
                    <div className="grid gap-5">
                      {activeCriteria.map((criterion) => (
                        <CriterionRow
                          key={criterion.id}
                          criterion={criterion}
                          data={data}
                          goalId={goalId}
                          outcome={outcome}
                          milestoneTitles={milestoneTitles}
                          canManage={canManage}
                        />
                      ))}
                    </div>
                  ) : outcome.goalStatus !== "achieved" ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      Noch kein Erfolgskriterium festgelegt.
                    </p>
                  ) : null}

                  {canManage && (
                    <ManagementDisclosure
                      label={
                        activeCriteria.length === 0
                          ? "Erfolg definieren"
                          : "Erfolgskriterium hinzufügen"
                      }
                    >
                      <OperationForm
                        operation="criterion.create"
                        label="Erfolgskriterium erstellen"
                        closeOnSuccess
                      >
                        <Hidden name="goalId" value={goalId} />
                        <label className="grid gap-1 text-sm">
                          Titel
                          <input className={fieldClass} name="title" required />
                        </label>
                        <Choice
                          name="criterionType"
                          label="Erfolg prüfen als"
                          options={[
                            { id: "boolean", title: "Ja / Nein" },
                            { id: "numeric", title: "Messwert" },
                          ]}
                          required
                        />
                        <Choice
                          label="Etappe (optional)"
                          name="goalMilestoneId"
                          options={milestoneOptions(outcome)}
                        />
                        <div className="grid gap-3 md:grid-cols-3">
                          <label className="grid gap-1 text-sm">
                            Einheit (Messwert)
                            <input
                              className={fieldClass}
                              name="unit"
                              placeholder="z. B. Stunden"
                            />
                          </label>
                          <label className="grid gap-1 text-sm">
                            Zielwert
                            <input
                              className={fieldClass}
                              name="target"
                              type="number"
                              step="any"
                            />
                          </label>
                          <Choice
                            name="direction"
                            label="Richtung"
                            options={[
                              { id: "at_least", title: "mindestens" },
                              { id: "at_most", title: "höchstens" },
                              { id: "exact", title: "genau" },
                            ]}
                          />
                        </div>
                      </OperationForm>
                    </ManagementDisclosure>
                  )}

                  {canManage &&
                    outcome.summary.readyToAchieve &&
                    activeCriteria.length > 0 && (
                      <ManagementDisclosure label="Ergebnis prüfen">
                        <OperationForm
                          operation="achieve"
                          label="Ergebnis bestätigen"
                          confirmMessage="Ergebnis als erreicht bestätigen? Die aktuelle Grundlage wird mit dem Ergebnis festgehalten."
                          closeOnSuccess
                        >
                          <Hidden name="goalId" value={goalId} />
                          <Hidden
                            name="expectedUpdatedAt"
                            value={outcome.updatedAt}
                          />
                          <label className="grid gap-1 text-sm">
                            Erfolgsnotiz (optional)
                            <input className={fieldClass} name="note" />
                          </label>
                          <InitialEvidenceFields
                            data={data}
                            outcome={outcome}
                            allowed={[
                              "project",
                              "project_milestone",
                              "task",
                              "resource",
                              "review_record",
                            ]}
                          />
                        </OperationForm>
                      </ManagementDisclosure>
                    )}
                </PlanningRegion>
              )}

              {selectedArea === "arbeit" && (
                <PlanningRegion id="weg-zum-ziel" title="Arbeit und Etappen">
                  <p className="text-sm text-[var(--text-muted)]">
                    Etappen machen den Weg sichtbar. Ihre Reihenfolge ist
                    Orientierung; daraus wird nichts automatisch geplant.
                  </p>
                  <div className="grid min-w-0 gap-6 border-y border-[var(--border-subtle)] py-5 lg:grid-cols-[minmax(250px,1fr)_minmax(0,1.5fr)]">
                    <div className="min-w-0">
                      <MilestoneProgression
                        goalId={goalId}
                        outcome={outcome}
                        selectedId={selectedMilestone?.id ?? null}
                      />
                    </div>
                    <div
                      className="min-w-0 border-t border-[var(--border-subtle)] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
                      data-goal-selected-work
                    >
                      {selectedMilestone ? (
                        <MilestoneCard
                          data={data}
                          goalId={goalId}
                          milestone={selectedMilestone}
                          outcome={outcome}
                          projectById={projectById}
                          taskById={taskById}
                          canManage={canManage}
                          index={activeMilestones.findIndex(
                            (item) => item.id === selectedMilestone.id,
                          )}
                          activeCount={activeMilestones.length}
                        />
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">
                          Wähle eine Etappe oder beginne direkt mit einer
                          Aufgabe oder einem Projekt.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-5 lg:grid-cols-2">
                    <section className="min-w-0" aria-label="Projekte im Ziel">
                      <h3 className="font-semibold">Projekte im Ziel</h3>
                      {outcome.projects.filter((project) => !project.archivedAt)
                        .length ? (
                        <ul className="mt-3 grid gap-3">
                          {outcome.projects
                            .filter((project) => !project.archivedAt)
                            .map((project) => {
                              const support = outcome.projectSupport.find(
                                (link) => link.targetId === project.id,
                              );
                              const tasks = outcome.tasks.filter(
                                (task) =>
                                  !task.archivedAt &&
                                  task.projectId === project.id,
                              );
                              const projectMilestones = data.milestones.filter(
                                (item) =>
                                  item.project_id === project.id &&
                                  !item.archived_at,
                              );
                              return (
                                <li
                                  key={project.id}
                                  className="min-w-0 border-t border-[var(--border-subtle)] pt-3"
                                >
                                  <Link
                                    href={`/projects/${project.id}`}
                                    className="break-words text-[var(--accent-cyan)] underline underline-offset-4"
                                  >
                                    {project.title}
                                  </Link>
                                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                                    {support
                                      ? `Unterstützt Etappe „${milestoneTitles.get(support.goalMilestoneId) ?? "Etappe"}“`
                                      : "Direkt dem Ziel zugeordnet"}{" "}
                                    · {tasks.length}{" "}
                                    {tasks.length === 1
                                      ? "Projektaufgabe"
                                      : "Projektaufgaben"}
                                    {projectMilestones.length
                                      ? ` · ${projectMilestones.length} Projekt-Meilensteine`
                                      : ""}
                                  </p>
                                  {tasks.length > 0 && (
                                    <ul className="mt-2 grid gap-1 pl-3 text-sm">
                                      {tasks.slice(0, 4).map((task) => (
                                        <li key={task.id}>
                                          <Link
                                            href={`/tasks/${task.id}`}
                                            className="text-[var(--accent-cyan)] underline underline-offset-4"
                                          >
                                            {task.title}
                                          </Link>
                                        </li>
                                      ))}
                                      {tasks.length > 4 && (
                                        <li className="text-[var(--text-muted)]">
                                          Weitere Aufgaben im Projekt öffnen
                                        </li>
                                      )}
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-[var(--text-muted)]">
                          Noch kein Projekt zugeordnet.
                        </p>
                      )}
                      {canManage && (
                        <Link
                          href={`/projects/new?goal=${goalId}`}
                          className="mt-4 inline-block text-sm text-[var(--accent-cyan)] underline underline-offset-4"
                        >
                          Projekt hinzufügen
                        </Link>
                      )}
                    </section>
                    <section
                      className="min-w-0 border-t border-[var(--border-subtle)] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
                      aria-label="Direkte Aufgaben im Ziel"
                    >
                      <h3 className="font-semibold">
                        Direkte Aufgaben im Ziel
                      </h3>
                      {outcome.tasks.filter(
                        (task) => !task.archivedAt && !task.projectId,
                      ).length ? (
                        <ul className="mt-3 grid gap-3">
                          {outcome.tasks
                            .filter(
                              (task) => !task.archivedAt && !task.projectId,
                            )
                            .map((task) => {
                              const support = outcome.taskSupport.find(
                                (link) => link.targetId === task.id,
                              );
                              const cue =
                                outcome.nextStep.kind === "task" &&
                                outcome.nextStep.id === task.id
                                  ? outcome.nextStep
                                  : null;
                              return (
                                <li
                                  key={task.id}
                                  className="min-w-0 border-t border-[var(--border-subtle)] pt-3"
                                >
                                  <Link
                                    href={`/tasks/${task.id}`}
                                    className="break-words text-[var(--accent-cyan)] underline underline-offset-4"
                                  >
                                    {task.title}
                                  </Link>
                                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                                    {support
                                      ? `Unterstützt Etappe „${milestoneTitles.get(support.goalMilestoneId) ?? "Etappe"}“`
                                      : "Direkt dem Ziel zugeordnet"}
                                    {cue
                                      ? ` · ${cue.state === "blocked" ? "Durch Task-Voraussetzung blockiert" : cue.state === "ready" ? "Bereit" : "Planung"}`
                                      : ""}
                                  </p>
                                  {cue?.blockers.length ? (
                                    <p className="mt-1 text-sm text-[var(--accent-orange)]">
                                      Wartet auf:{" "}
                                      {cue.blockers
                                        .map((item) => item.title)
                                        .join(", ")}
                                    </p>
                                  ) : null}
                                </li>
                              );
                            })}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-[var(--text-muted)]">
                          Noch keine direkte Aufgabe.
                        </p>
                      )}
                      {canManage && (
                        <Link
                          href={`/tasks/new?goal=${goalId}`}
                          className="mt-4 inline-block text-sm text-[var(--accent-cyan)] underline underline-offset-4"
                        >
                          Aufgabe hinzufügen
                        </Link>
                      )}
                    </section>
                  </div>
                  {canManage && (
                    <ManagementDisclosure label="Etappe hinzufügen">
                      <OperationForm
                        operation="milestone.create"
                        label="Etappe erstellen"
                        closeOnSuccess
                      >
                        <Hidden name="goalId" value={goalId} />
                        <label className="grid gap-1 text-sm">
                          Titel
                          <input className={fieldClass} name="title" required />
                        </label>
                        <label className="grid gap-1 text-sm">
                          Beschreibung
                          <textarea
                            className={fieldClass}
                            name="description"
                            rows={3}
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          Zieldatum
                          <input
                            className={fieldClass}
                            name="targetDate"
                            type="date"
                          />
                        </label>
                        <Choice
                          name="status"
                          label="Startstatus"
                          options={[
                            { id: "planned", title: "geplant" },
                            { id: "active", title: "aktiv" },
                          ]}
                          required
                        />
                        <Hidden
                          name="sortOrder"
                          value={String(outcome.milestones.length)}
                        />
                      </OperationForm>
                    </ManagementDisclosure>
                  )}
                </PlanningRegion>
              )}
            </section>
          )}

          {selectedArea === "verlauf" && (
            <Panel id="verlauf-belege" title="Verlauf & Belege">
              <p className="text-sm text-[var(--text-muted)]">
                Der Verlauf zeigt Ziel-, Etappen- und Kriterienentscheidungen.
                Aufgaben- und Projektabschlüsse bleiben in ihren eigenen
                Verläufen.
              </p>
              {recentGoalHistory.length === 0 &&
              recentMilestoneHistory.length === 0 &&
              activeCriteria.every(
                (criterion) => criterion.evaluations.length === 0,
              ) ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Noch kein Verlauf.
                </p>
              ) : (
                <div className="grid gap-4">
                  {recentGoalHistory.map((event) => (
                    <HistoryEntry
                      key={event.id}
                      data={data}
                      outcome={outcome}
                      goalId={goalId}
                      event={event}
                    />
                  ))}
                  {recentMilestoneHistory.map((event) => (
                    <MilestoneHistoryEntry
                      key={event.id}
                      data={data}
                      outcome={outcome}
                      goalId={goalId}
                      event={event}
                    />
                  ))}
                  {activeCriteria.flatMap((criterion) =>
                    criterion.evaluations.map((evaluation) => (
                      <article
                        key={evaluation.id}
                        className="grid gap-1 border-t border-[var(--border-subtle)] pt-3 text-sm"
                      >
                        <h3 className="font-semibold">
                          {criterion.title} ·{" "}
                          {evaluation.revisionKind === "correction"
                            ? "Bewertung korrigiert"
                            : evaluation.revisionKind === "retraction"
                              ? "Bewertung zurückgenommen"
                              : "Bewertung erfasst"}
                        </h3>
                        <p className="text-[var(--text-muted)]">
                          {new Date(evaluation.evaluatedAt).toLocaleString(
                            "de-DE",
                          )}{" "}
                          ·{" "}
                          {evaluation.deferred
                            ? "Später prüfen"
                            : criterion.criterionType === "boolean"
                              ? evaluation.booleanValue
                                ? "Ja"
                                : "Nein"
                              : `${evaluation.numericValue} ${evaluation.unit ?? criterion.unit ?? ""}`}
                        </p>
                        {evaluation.note && (
                          <p className="text-[var(--text-secondary)]">
                            Notiz: {evaluation.note}
                          </p>
                        )}
                        {evaluation.correctionReason && (
                          <p className="text-[var(--text-secondary)]">
                            Grund: {evaluation.correctionReason}
                          </p>
                        )}
                        {evaluation.evidenceHistory?.length ? (
                          <p className="text-[var(--text-secondary)]">
                            Belege: {evidenceLabel(evaluation.evidenceHistory)}
                          </p>
                        ) : null}
                      </article>
                    )),
                  )}
                </div>
              )}
              {outcome.milestones.some((milestone) => milestone.archivedAt) && (
                <section
                  aria-label="Archivierte Etappen"
                  className="grid gap-2 border-t border-[var(--border-subtle)] pt-4"
                >
                  <h3 className="font-semibold">Archivierte Etappen</h3>
                  {outcome.milestones
                    .filter((milestone) => milestone.archivedAt)
                    .map((milestone) => (
                      <MilestoneCard
                        key={milestone.id}
                        data={data}
                        goalId={goalId}
                        milestone={milestone}
                        outcome={outcome}
                        projectById={projectById}
                        taskById={taskById}
                        canManage={false}
                        index={-1}
                        activeCount={activeMilestones.length}
                      />
                    ))}
                </section>
              )}
            </Panel>
          )}

          {canManage && (
            <div
              aria-label="Zielverwaltung"
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border-subtle)] pt-2"
            >
              <ManagementDisclosure label="Bearbeiten">
                {edit}
              </ManagementDisclosure>
              <ManagementDisclosure label="Weitere Optionen">
                <div className="grid gap-4">
                  <ManagementDisclosure label="Unterstützende Arbeit verwalten">
                    <p className="text-sm text-[var(--text-muted)]">
                      Verknüpfte Projekte und Aufgaben machen sichtbar, wodurch
                      eine Etappe vorankommt. Sie erfüllen kein Erfolgskriterium
                      automatisch.
                    </p>
                    <div className="grid gap-4">
                      {[...outcome.projectSupport, ...outcome.taskSupport].map(
                        (link) => (
                          <div
                            className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3"
                            key={link.id}
                          >
                            <p className="text-sm">
                              {link.targetTitle} ·{" "}
                              {milestoneTitles.get(link.goalMilestoneId) ??
                                "Etappe"}
                            </p>
                            <OperationForm
                              operation={
                                outcome.projectSupport.some(
                                  (item) => item.id === link.id,
                                )
                                  ? "support.project.remove"
                                  : "support.task.remove"
                              }
                              label="Support lösen"
                              closeOnSuccess
                            >
                              <Hidden name="goalId" value={goalId} />
                              <Hidden name="supportId" value={link.id} />
                            </OperationForm>
                          </div>
                        ),
                      )}
                    </div>
                    {activeMilestones.length > 0 &&
                      eligibleProjects.length > 0 && (
                        <OperationForm
                          operation="support.project.add"
                          label="Projekt verknüpfen"
                          closeOnSuccess
                        >
                          <Hidden name="goalId" value={goalId} />
                          <Choice
                            label="Etappe"
                            name="goalMilestoneId"
                            options={milestoneOptions(outcome)}
                            required
                          />
                          <Choice
                            label="Projekt"
                            name="projectId"
                            options={eligibleProjects}
                            required
                          />
                        </OperationForm>
                      )}
                    {activeMilestones.length > 0 &&
                      eligibleTasks.length > 0 && (
                        <OperationForm
                          operation="support.task.add"
                          label="Aufgabe verknüpfen"
                          closeOnSuccess
                        >
                          <Hidden name="goalId" value={goalId} />
                          <Choice
                            label="Etappe"
                            name="goalMilestoneId"
                            options={milestoneOptions(outcome)}
                            required
                          />
                          <Choice
                            label="Aufgabe"
                            name="taskId"
                            options={eligibleTasks}
                            required
                          />
                        </OperationForm>
                      )}
                    {eligibleProjects.length === 0 &&
                      eligibleTasks.length === 0 && (
                        <p className="text-sm text-[var(--text-muted)]">
                          Keine passenden aktiven Projekt- oder Aufgabenkontexte
                          verfügbar.
                        </p>
                      )}
                  </ManagementDisclosure>
                  <ManagementDisclosure label="Ziel archivieren">
                    <OperationForm
                      operation="goal.archive"
                      label="Ziel archivieren"
                      closeOnSuccess
                    >
                      <Hidden name="goalId" value={goalId} />
                    </OperationForm>
                  </ManagementDisclosure>
                </div>
              </ManagementDisclosure>
            </div>
          )}
        </ManagementDisclosureGroup>
      </div>
    </EntityWorkbenchShell>
  );
}
