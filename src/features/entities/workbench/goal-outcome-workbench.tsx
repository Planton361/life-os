import Link from "next/link";
import type { ReactNode } from "react";
import {
  criterionEvaluationState,
  currentGoalAchievementEvent,
  currentGoalMilestoneAchievementEvent,
  deriveGoalJourneyGuidance,
  orderCurrentGoalMilestoneTasks,
  type GoalAchievementEvent,
  type GoalEvidenceReference,
  type GoalEvidenceSourceType,
  type GoalMilestone,
  type GoalMilestoneAchievementEvent,
  type GoalOutcome,
  type GoalOutcomeCriterion,
} from "@/features/real-data/domain/goal-outcome";
import type { WorkbenchData } from "@/features/real-data/runtime/entity-workbench-read";
import { EntityWorkbenchShell } from "./pages";
import { Choice, fieldClass, OperationForm } from "./forms";
import { taskDependencyContext } from "@/features/real-data/domain/task-dependencies";
import {
  ManagementDialog,
  ManagementDisclosure,
} from "./management-disclosure";
import { TaskEditDialog } from "./task-edit-dialog";
import { projectTaskGuidance } from "./project-guidance";
import { taskHasExecutableLifecycle } from "@/features/real-data/domain/task-dependencies";
import styles from "./goal-outcome-workbench.module.css";

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
              ? ` · ${milestoneTitles.get(criterion.goalMilestoneId) ?? "Zwischenziel"}`
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
      {canManage && !isArchived && milestone.status === "active" && (
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
  const activeMilestones = outcome.milestones.filter(
    (m) => !m.archivedAt && m.status !== "archived",
  );
  const activeCriteria = outcome.criteria.filter((c) => !c.archivedAt);
  const milestoneTitles = new Map(
    outcome.milestones.map((m) => [m.id, m.title]),
  );
  const projectById = new Map(outcome.projects.map((p) => [p.id, p]));
  const taskById = new Map(outcome.tasks.map((t) => [t.id, t]));
  const archived = outcome.goalStatus === "archived";
  const canManage = !archived && outcome.goalStatus !== "achieved";
  const guidance = deriveGoalJourneyGuidance(outcome, data.dependencyGraph);
  const currentMilestone = activeMilestones.find((m) => m.status === "active");
  const supportedTaskIds = new Set(outcome.taskSupport.map((l) => l.targetId));
  const supportedProjectIds = new Set(
    outcome.projectSupport.map((l) => l.targetId),
  );
  const eligibleTasks = outcome.tasks.filter(
    (t) => !t.archivedAt && !supportedTaskIds.has(t.id),
  );
  const eligibleProjects = outcome.projects.filter(
    (p) => !p.archivedAt && !supportedProjectIds.has(p.id),
  );
  const directTasks = outcome.tasks.filter(
    (t) =>
      !t.archivedAt &&
      !supportedTaskIds.has(t.id) &&
      (!t.projectId ||
        data.tasks.some((row) => row.id === t.id && row.goal_id === goalId)),
  );
  const currentTaskIds = new Set(
    outcome.taskSupport
      .filter((link) => link.goalMilestoneId === currentMilestone?.id)
      .map((link) => link.targetId),
  );
  const workTasks = currentMilestone
    ? outcome.tasks.filter(
        (task) => currentTaskIds.has(task.id) && !task.archivedAt,
      )
    : !activeMilestones.length
      ? directTasks
      : [];
  const executableTasks = workTasks.filter((task) => {
    const raw = data.tasks.find((row) => row.id === task.id);
    return (
      raw &&
      taskHasExecutableLifecycle(raw) &&
      !data.scheduleSources.some((source) => source.task_id === task.id)
    );
  });
  const taskGuidance = projectTaskGuidance({
    archived: !canManage,
    taskCount: workTasks.length,
    readyTaskIds: executableTasks
      .filter(
        (task) =>
          taskDependencyContext(data.dependencyGraph, task.id).availability ===
          "READY",
      )
      .map((task) => task.id),
    blockedCount: executableTasks.filter(
      (task) =>
        taskDependencyContext(data.dependencyGraph, task.id).availability ===
        "BLOCKED",
    ).length,
  });
  const recentGoalHistory = outcome.achievementHistory;
  const recentMilestoneHistory = outcome.milestoneHistory;
  const selectedArea = area === "verlauf" ? "verlauf" : "work";
  const goalRow = data.goals.find((g) => g.id === goalId);
  const areaName = data.areas.find(
    (a) => a.id === goalRow?.area_id && !a.archived_at,
  )?.name;
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: data.timezone,
  }).format(new Date());
  const latestAchievement = currentGoalAchievementEvent(
    outcome.achievementHistory,
    outcome.goalStatus,
  );
  const criteria = (
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
      {!activeCriteria.length && (
        <p className="text-sm text-[var(--text-muted)]">
          Noch keine Erfolgskriterien.
        </p>
      )}
      {canManage && (
        <ManagementDisclosure label="Erfolgskriterium hinzufügen">
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
              label="Zwischenziel (optional)"
              name="goalMilestoneId"
              options={milestoneOptions(outcome)}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-sm">
                Einheit (Messwert)
                <input className={fieldClass} name="unit" />
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
    </div>
  );
  const createTask = (milestone?: GoalMilestone) => {
    if (!canManage) return null;
    if (!milestone || milestone.status === "active")
      return (
        <Link
          className={styles.action}
          href={`/tasks/new?${new URLSearchParams({ goal: goalId, ...(milestone ? { goalMilestone: milestone.id } : {}) })}`}
        >
          + Task
        </Link>
      );
    return (
      <ManagementDialog
        label={`Task zu „${milestone.title}“ hinzufügen`}
        triggerText="+ Task"
        triggerClassName={styles.action}
        panelClassName="m-auto"
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Aktiviere dieses Zwischenziel, um hier eine Task anzulegen.
        </p>
        <OperationForm
          operation="milestone.status"
          label={
            milestone.status === "achieved"
              ? "Zwischenziel wieder aktivieren"
              : "Zwischenziel aktivieren"
          }
          closeOnSuccess
        >
          <Hidden name="goalId" value={goalId} />
          <Hidden name="milestoneId" value={milestone.id} />
          <Hidden name="status" value="active" />
          <Hidden name="expectedUpdatedAt" value={milestone.updatedAt} />
        </OperationForm>
      </ManagementDialog>
    );
  };
  const renderTasks = (tasks: GoalOutcome["tasks"]) =>
    tasks.length ? (
      <ul className={styles.tasks}>
        {orderCurrentGoalMilestoneTasks(
          tasks,
          data.dependencyGraph,
          taskGuidance.kind === "single-ready"
            ? taskGuidance.taskId
            : undefined,
        ).map((task) => {
          const dependency = taskDependencyContext(
            data.dependencyGraph,
            task.id,
          );
          const raw = data.tasks.find((t) => t.id === task.id);
          const project = data.projects.find((p) => p.id === raw?.project_id);
          const parentArchived = Boolean(
            project?.archived_at || project?.status === "archived",
          );
          const closed = ["done", "completed", "canceled"].includes(
            task.status,
          );
          const sourceOwned = data.scheduleSources.some(
            (s) => s.task_id === task.id,
          );
          const isPrimary =
            canManage &&
            activeCriteria.length > 0 &&
            taskGuidance.kind === "single-ready" &&
            taskGuidance.taskId === task.id;
          const calendarHref =
            "/calendar?" +
            new URLSearchParams({
              task: task.id,
              date: raw?.scheduled_start_at
                ? new Intl.DateTimeFormat("sv-SE", {
                    timeZone: data.timezone,
                  }).format(new Date(raw.scheduled_start_at))
                : task.plannedDate || today,
              view: "week",
            }).toString();
          const showCalendar =
            !archived &&
            !parentArchived &&
            raw &&
            !raw.archived_at &&
            ((!sourceOwned && taskHasExecutableLifecycle(raw)) ||
              Boolean(raw.scheduled_start_at));
          return (
            <li
              key={task.id}
              className={`${styles.task} ${closed ? styles.completed : ""}`}
              data-goal-task={task.id}
              data-task-availability={dependency.availability.toLowerCase()}
              data-goal-primary-task={isPrimary ? "true" : undefined}
            >
              <div className="min-w-0">
                <p className={styles.taskState}>
                  {!closed &&
                    `${({ planned: "Geplant", active: "Aktiv", inbox: "Inbox", waiting: "Wartet", someday: "Irgendwann" } as Record<string, string>)[task.status] ?? task.status} · `}
                  {closed
                    ? task.status === "canceled"
                      ? "Abgebrochen"
                      : "Erledigt"
                    : dependency.availability === "BLOCKED"
                      ? "Blockiert"
                      : dependency.availability === "READY"
                        ? "Bereit"
                        : "Verfügbarkeit unbekannt"}
                  {task.plannedDate
                    ? ` · ${goalDateLabel(task.plannedDate)}`
                    : ""}
                  {task.dueAt
                    ? ` · fällig ${goalDateLabel(task.dueAt.slice(0, 10))}`
                    : ""}
                </p>
                <Link className={styles.taskTitle} href={`/tasks/${task.id}`}>
                  {task.title}
                </Link>
                {!!dependency.blockers.length && (
                  <p className={styles.blocker}>
                    Wartet auf:{" "}
                    {dependency.blockers.map((b, i) => (
                      <span key={b.edgeId}>
                        {i ? " · " : ""}
                        {b.task ? (
                          <Link
                            href={`/tasks/${b.task.id}`}
                            className="underline underline-offset-4"
                          >
                            {b.task.title}
                          </Link>
                        ) : (
                          "Unbekannte Voraussetzung"
                        )}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div
                className={styles.taskActions}
                aria-label={`Aktionen: ${task.title}`}
              >
                {canManage && !parentArchived && raw && !sourceOwned && (
                  <TaskEditDialog
                    data={data}
                    taskId={task.id}
                    triggerClassName={styles.action}
                  />
                )}
                {showCalendar && (
                  <Link
                    className={styles.action}
                    href={calendarHref}
                    aria-label={`${task.title}: Im Calendar planen`}
                  >
                    Calendar
                  </Link>
                )}
                <Link
                  className={isPrimary ? styles.primary : styles.action}
                  href={`/tasks/${task.id}`}
                  aria-label={`${task.title}: Öffnen`}
                >
                  Öffnen
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className={styles.empty}>Noch keine Tasks.</p>
    );
  return (
    <EntityWorkbenchShell
      kind="goal"
      title={outcome.goalTitle}
      headingInContent
    >
      <div className={styles.composition} data-goal-detail-variant="B8">
        <header className={styles.header} data-goal-default-surface>
          <div className={styles.heading}>
            <div className="min-w-0">
              <p className={styles.eyebrow}>
                GOAL ·{" "}
                <span data-goal-status>
                  {goalStatusLabel(outcome.goalStatus)}
                </span>
              </p>
              <h1 className={styles.title}>{outcome.goalTitle}</h1>
            </div>
            {canManage && (
              <ManagementDialog
                label="Ziel bearbeiten"
                triggerText="Bearbeiten"
                triggerClassName={styles.action}
                panelClassName="m-auto"
              >
                {edit}
              </ManagementDialog>
            )}
          </div>
          <div className={styles.outcome}>
            <section aria-label="Gewünschtes Ergebnis">
              <h2 className={styles.label}>Gewünschtes Ergebnis</h2>
              <p className={styles.description}>
                {outcome.goalDescription || "Noch kein Ergebnis beschrieben."}
              </p>
              {outcome.goalWhy && (
                <p className={styles.why}>Warum · {outcome.goalWhy}</p>
              )}
            </section>
            <section aria-label="Erfolgskriterien" data-goal-criteria-summary>
              <div className={styles.heading}>
                <h2 className={styles.label}>Erreicht, wenn …</h2>
                <ManagementDialog
                  label="Erfolgskriterien prüfen"
                  triggerText={
                    canManage
                      ? activeCriteria.length
                        ? "Prüfen / bearbeiten"
                        : "Erfolg definieren"
                      : "Ansehen"
                  }
                  triggerClassName={
                    canManage && !activeCriteria.length
                      ? styles.primary
                      : styles.action
                  }
                  panelClassName="m-auto"
                  initiallyOpen={canManage && area === "erfolg"}
                >
                  {criteria}
                </ManagementDialog>
              </div>
              {activeCriteria.length ? (
                <ul className={styles.criteria}>
                  {activeCriteria.map((c) => (
                    <li key={c.id}>
                      <span>
                        {c.title}
                        {c.criterionType === "numeric"
                          ? ` · ${criterionDescription(c)}`
                          : ""}
                        {c.goalMilestoneId ? (
                          <small>
                            {" "}
                            · {milestoneTitles.get(c.goalMilestoneId)}
                          </small>
                        ) : null}
                      </span>
                      <span className={styles.criterionState}>
                        {statusLabel(
                          criterionEvaluationState(c, c.latestEvaluation),
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>Noch keine Erfolgskriterien.</p>
              )}
            </section>
          </div>
          <p className={styles.meta}>
            {[
              areaName,
              goalHorizonLabel(outcome.goalHorizon),
              outcome.targetDate
                ? `Ziel ${goalDateLabel(outcome.targetDate)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {latestAchievement && (
            <p className={styles.meta}>
              Ausdrücklich erreicht bestätigt · {eventDate(latestAchievement)}
              {outcome.achievementNote ? ` · ${outcome.achievementNote}` : ""}
            </p>
          )}
          {archived && (
            <p role="status" className={styles.meta}>
              Archiviertes Ziel · schreibgeschützt.
            </p>
          )}
        </header>
        <section className={styles.work} aria-label="Goal Work" data-goal-work>
          <div className={styles.workHead}>
            <h2>Work</h2>
            {canManage && (
              <ManagementDialog
                label="Zwischenziel hinzufügen"
                triggerText="+ Zwischenziel"
                triggerClassName={styles.action}
                panelClassName="m-auto"
                initiallyOpen={area === "planung" && !selectedStage}
              >
                <OperationForm
                  operation="milestone.create"
                  label="Zwischenziel erstellen"
                  closeOnSuccess
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="status" value="planned" />
                  <Hidden
                    name="sortOrder"
                    value={String(outcome.milestones.length)}
                  />
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
                </OperationForm>
              </ManagementDialog>
            )}
          </div>
          {activeMilestones.map((milestone, index) => {
            const links = outcome.taskSupport.filter(
              (l) => l.goalMilestoneId === milestone.id,
            );
            const ids = new Set(links.map((l) => l.targetId));
            const tasks = outcome.tasks.filter(
              (t) => !t.archivedAt && ids.has(t.id),
            );
            const projects = outcome.projectSupport.filter(
              (l) => l.goalMilestoneId === milestone.id,
            );
            const stageCriteria = activeCriteria.filter(
              (c) => c.goalMilestoneId === milestone.id,
            );
            return (
              <section
                key={milestone.id}
                aria-label={`Zwischenziel: ${milestone.title}`}
                className={styles.milestone}
                data-goal-work-milestone={milestone.id}
                data-current={
                  milestone.status === "active" ? "true" : undefined
                }
              >
                <div className={styles.band}>
                  <div className="min-w-0">
                    <p className={styles.eyebrow}>
                      {milestoneStatusLabel(milestone.status)}
                      {milestone.targetDate
                        ? ` · ${goalDateLabel(milestone.targetDate)}`
                        : ""}
                    </p>
                    <h3>{milestone.title}</h3>
                    {milestone.description && (
                      <p className={styles.milestoneDescription}>
                        {milestone.description}
                      </p>
                    )}
                  </div>
                  <div className={styles.groupActions}>
                    {createTask(milestone)}
                    {canManage && (
                      <ManagementDialog
                        label={`Zwischenziel verwalten: ${milestone.title}`}
                        triggerText="Weitere Optionen"
                        triggerClassName={styles.action}
                        panelClassName="m-auto"
                        initiallyOpen={
                          area === "planung" && selectedStage === milestone.id
                        }
                      >
                        <MilestoneCard
                          data={data}
                          goalId={goalId}
                          milestone={milestone}
                          outcome={outcome}
                          projectById={projectById}
                          taskById={taskById}
                          canManage={canManage}
                          index={index}
                          activeCount={activeMilestones.length}
                        />
                        {!!eligibleTasks.length && (
                          <ManagementDisclosure label="Bestehende Task zuordnen">
                            <OperationForm
                              operation="support.task.add"
                              label="Aufgabe verknüpfen"
                              closeOnSuccess
                            >
                              <Hidden name="goalId" value={goalId} />
                              <Hidden
                                name="goalMilestoneId"
                                value={milestone.id}
                              />
                              <Choice
                                label="Aufgabe"
                                name="taskId"
                                options={eligibleTasks}
                                required
                              />
                            </OperationForm>
                          </ManagementDisclosure>
                        )}
                        {!!eligibleProjects.length && (
                          <ManagementDisclosure label="Projektkontext verknüpfen">
                            <OperationForm
                              operation="support.project.add"
                              label="Projekt verknüpfen"
                              closeOnSuccess
                            >
                              <Hidden name="goalId" value={goalId} />
                              <Hidden
                                name="goalMilestoneId"
                                value={milestone.id}
                              />
                              <Choice
                                label="Projekt"
                                name="projectId"
                                options={eligibleProjects}
                                required
                              />
                            </OperationForm>
                          </ManagementDisclosure>
                        )}
                        {!!links.length && (
                          <ManagementDisclosure label="Task-Zuordnungen verwalten">
                            {links.map((l) => (
                              <OperationForm
                                key={l.id}
                                operation="support.task.remove"
                                label={`Zuordnung lösen: ${l.targetTitle}`}
                                closeOnSuccess
                              >
                                <Hidden name="goalId" value={goalId} />
                                <Hidden name="supportId" value={l.id} />
                              </OperationForm>
                            ))}
                          </ManagementDisclosure>
                        )}
                        {!!projects.length && (
                          <ManagementDisclosure label="Projektzuordnungen verwalten">
                            {projects.map((l) => (
                              <OperationForm
                                key={l.id}
                                operation="support.project.remove"
                                label={`Projektkontext lösen: ${l.targetTitle}`}
                                closeOnSuccess
                              >
                                <Hidden name="goalId" value={goalId} />
                                <Hidden name="supportId" value={l.id} />
                              </OperationForm>
                            ))}
                          </ManagementDisclosure>
                        )}
                      </ManagementDialog>
                    )}
                  </div>
                </div>
                {!!stageCriteria.length && (
                  <p className={styles.context}>
                    Erreicht, wenn:{" "}
                    {stageCriteria
                      .map(
                        (c) =>
                          `${c.title} (${statusLabel(criterionEvaluationState(c, c.latestEvaluation))})`,
                      )
                      .join(" · ")}
                  </p>
                )}
                {renderTasks(tasks)}
                {!!projects.length && (
                  <p className={styles.context}>
                    Projektkontext ·{" "}
                    {projects.map((p, i) => (
                      <span key={p.id}>
                        {i ? " · " : ""}
                        <Link
                          href={`/projects/${p.targetId}`}
                          className="underline underline-offset-4"
                        >
                          {p.targetTitle}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
                {canManage &&
                  guidance.action === "review_milestone" &&
                  milestone.id === currentMilestone?.id && (
                    <div className={styles.review}>
                      <ManagementDialog
                        label="Zwischenziel prüfen"
                        triggerText="Zwischenziel prüfen"
                        triggerClassName={styles.primary}
                        panelClassName="m-auto"
                      >
                        <p className="text-sm text-[var(--text-secondary)]">
                          Ist „{milestone.title}“ erreicht? Task-Abschlüsse
                          bestätigen dieses Ergebnis nicht automatisch.
                        </p>
                        <OperationForm
                          operation="milestone.status"
                          label="Zwischenziel erreicht bestätigen"
                          confirmMessage="Hast du das Zwischenziel geprüft und möchtest es ausdrücklich als erreicht bestätigen?"
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
                            Review-Notiz (optional)
                            <input className={fieldClass} name="note" />
                          </label>
                        </OperationForm>
                      </ManagementDialog>
                    </div>
                  )}
              </section>
            );
          })}
          {(!activeMilestones.length || directTasks.length > 0) && (
            <section aria-label="Direkte Goal Tasks" className={styles.direct}>
              <div className={styles.band}>
                <h3>
                  {activeMilestones.length ? "Ohne Zwischenziel" : "Tasks"}
                </h3>
                {createTask()}
              </div>
              {renderTasks(directTasks)}
            </section>
          )}
          {outcome.projects.some(
            (p) => !p.archivedAt && !supportedProjectIds.has(p.id),
          ) && (
            <details className={styles.projectContext}>
              <summary>Weitere Projekte im Goal</summary>
              {outcome.projects
                .filter((p) => !p.archivedAt && !supportedProjectIds.has(p.id))
                .map((p) => (
                  <p key={p.id}>
                    <Link href={`/projects/${p.id}`} className={styles.action}>
                      {p.title}
                    </Link>
                  </p>
                ))}
            </details>
          )}
        </section>
        <footer className={styles.footer}>
          <Link
            href={`${goalAreaHref(goalId, "verlauf")}#verlauf-belege`}
            className={styles.action}
          >
            Verlauf ansehen
          </Link>
          {!archived && (
            <ManagementDialog
              label="Ziel prüfen"
              triggerText="Ziel prüfen"
              triggerClassName={
                guidance.action === "review_goal" &&
                outcome.summary.readyToAchieve
                  ? styles.primary
                  : styles.action
              }
              panelClassName="m-auto"
            >
              <p className="text-sm text-[var(--text-secondary)]">
                Ist dein Ziel erreicht? Bestätige das Ergebnis ausdrücklich
                anhand deiner Erfolgskriterien.
              </p>
              {criteria}
              {canManage && outcome.summary.readyToAchieve ? (
                <OperationForm
                  operation="achieve"
                  label="Ziel erreicht bestätigen"
                  confirmMessage="Hast du das Ziel geprüft und möchtest es ausdrücklich als erreicht bestätigen?"
                  closeOnSuccess
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="expectedUpdatedAt" value={outcome.updatedAt} />
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
              ) : canManage ? (
                <p role="status" className="text-sm text-[var(--text-muted)]">
                  {outcome.summary.blockers.join(" · ")}
                </p>
              ) : (
                <OperationForm
                  operation="reopen"
                  label="Ziel wieder öffnen"
                  confirmMessage="Möchtest du das erreichte Ziel wieder öffnen und weiter daran arbeiten?"
                  closeOnSuccess
                >
                  <Hidden name="goalId" value={goalId} />
                </OperationForm>
              )}
            </ManagementDialog>
          )}
          {canManage && (
            <ManagementDialog
              label="Zielverwaltung"
              triggerText="Weitere Optionen"
              triggerClassName={styles.action}
              panelClassName="m-auto"
            >
              <OperationForm
                operation="goal.archive"
                label="Ziel archivieren"
                closeOnSuccess
              >
                <Hidden name="goalId" value={goalId} />
              </OperationForm>
            </ManagementDialog>
          )}
        </footer>
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
      </div>
    </EntityWorkbenchShell>
  );
}
