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
import { actionClass, Choice, fieldClass, OperationForm } from "./forms";
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
  const target =
    basis.targetSnapshot === null
      ? ""
      : ` · ${basis.directionSnapshot ?? "Ziel"} ${basis.targetSnapshot}${basis.unitSnapshot ? ` ${basis.unitSnapshot}` : ""}`;
  return `${basis.criterionTitleSnapshot ?? "Kriterium unbekannt"} · ${evaluationStateLabel(basis.evaluationStateSnapshot)}${target}`;
}

function milestoneBasisLabel(
  basis: GoalAchievementEvent["milestoneBasis"][number],
) {
  return `${basis.milestoneTitleSnapshot ?? "Etappe unbekannt"} · ${milestoneBasisStatusLabel(basis.resultingStatusSnapshot)}`;
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
                {evaluation.legacyState ? " · Legacy" : ""}
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
          <ManagementDisclosure
            label="Etappe verwalten"
            triggerText="Verwalten"
          >
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
      {!isArchived && (
        <div className="flex flex-wrap gap-3">
          <Link
            className="text-sm text-[var(--accent-cyan)]"
            href={`/projects/new?goal=${goalId}&goalMilestone=${milestone.id}`}
          >
            Projekt aus Etappe erstellen
          </Link>
          <Link
            className="text-sm text-[var(--accent-cyan)]"
            href={`/tasks/new?goal=${goalId}&goalMilestone=${milestone.id}`}
          >
            Aufgabe aus Etappe erstellen
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
          <p className="text-sm text-[var(--text-muted)]">
            {eventDate(event)} · Episode {event.episodeId.slice(0, 8)}
          </p>
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
            {event.criterionBasis.length} Kriterien-Basen ·{" "}
            {event.milestoneBasis.length} Etappen-Basen ·{" "}
            {event.evidence.length} aktive Belege
          </p>
          {event.criterionBasis.length > 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Kriterium-Basis:{" "}
              {event.criterionBasis.map(criterionBasisLabel).join(" · ")}
            </p>
          )}
          {event.milestoneBasis.length > 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Etappen-Basis:{" "}
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
          <p className="text-sm text-[var(--text-muted)]">
            {eventDate(event)} · Episode {event.episodeId.slice(0, 8)}
          </p>
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
}: {
  data: WorkbenchData;
  goalId: string;
  edit: ReactNode;
  outcome: GoalOutcome;
}) {
  const milestoneTitles = new Map(
    outcome.milestones.map((milestone) => [milestone.id, milestone.title]),
  );
  const activeMilestones = outcome.milestones.filter(
    (milestone) => !milestone.archivedAt,
  );
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
  const recentGoalHistory = outcome.achievementHistory.slice(0, 4);
  const recentMilestoneHistory = outcome.milestoneHistory.slice(0, 4);
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
    outcome.nextStep.kind !== "goal"
      ? outcome.nextStep.title
      : outcome.goalStatus === "achieved"
        ? "Ergebnis und Verlauf im Blick behalten."
        : activeCriteria.length === 0
          ? "Definiere, woran du Erfolg erkennst."
          : activeMilestones.length === 0
            ? "Gib dem Weg zum Ziel eine erste Etappe."
            : "Plane den nächsten konkreten Schritt.";
  const nextStepReason =
    outcome.nextStep.kind !== "goal"
      ? outcome.nextStep.reason
      : outcome.goalStatus === "achieved"
        ? "Das Ergebnis bleibt nachvollziehbar; ein erneutes Öffnen ist eine bewusste Entscheidung."
        : activeCriteria.length === 0
          ? "Eine klare Erfolgsidee hilft dir später bei der bewussten Entscheidung."
          : activeMilestones.length === 0
            ? "Etappen machen den Weg sichtbar, ohne eine feste Reihenfolge zu erzwingen."
            : outcome.nextStep.reason;
  const nextStepAction =
    outcome.goalStatus === "achieved"
      ? { href: "#verlauf-belege", label: "Verlauf ansehen" }
      : outcome.summary.readyToAchieve && activeCriteria.length > 0
        ? { href: "#erfolg-erkennen", label: "Ergebnis prüfen" }
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
              ? { href: "#erfolg-erkennen", label: "Erfolg festlegen" }
              : { href: "#weg-zum-ziel", label: "Weg gestalten" };
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
    <EntityWorkbenchShell kind="goal" title={outcome.goalTitle}>
      <div
        data-goal-outcome="workbench"
        data-goal-read-first="true"
        className="grid content-start gap-6"
      >
        <header className="grid gap-4" data-goal-default-surface>
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
          <div className="grid gap-2">
            <p className="max-w-4xl whitespace-pre-wrap text-base text-[var(--text-secondary)]">
              {outcome.goalDescription ||
                "Noch keine Beschreibung. Das Ziel bleibt bewusst leichtgewichtig."}
            </p>
            {outcome.goalWhy && (
              <p className="max-w-4xl whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
                <span className="font-semibold">Warum:</span> {outcome.goalWhy}
              </p>
            )}
          </div>
          <dl className="grid gap-3 text-sm text-[var(--text-muted)] sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--text-faint)]">
                Stand
              </dt>
              <dd>{goalStatusLabel(outcome.goalStatus)}</dd>
            </div>
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
        </header>

        <Panel id="naechster-schritt" title="Nächster Schritt">
          <div className="grid gap-2">
            <p
              className="text-sm font-semibold text-[var(--accent-orange)]"
              data-goal-next-step-state={outcome.nextStep.state}
            >
              {outcome.goalStatus === "achieved"
                ? "Ergebnis"
                : outcome.nextStep.state === "blocked"
                  ? "Blockiert"
                  : outcome.nextStep.state === "ready"
                    ? "Bereit"
                    : "Planung"}
            </p>
            <p className="text-base font-semibold">{nextStepTitle}</p>
            <p className="text-sm text-[var(--text-muted)]">{nextStepReason}</p>
            {outcome.nextStep.blockers.length > 0 && (
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
                className={`${actionClass} mt-2 inline-flex w-fit items-center text-[var(--text-primary)]`}
                href={nextStepAction.href}
              >
                {nextStepAction.label}
              </Link>
            )}
            {canManage && (
              <div className="grid gap-2 border-t border-[var(--border-subtle)] pt-3">
                <p className="text-xs uppercase tracking-wide text-[var(--text-faint)]">
                  Direkt anlegen
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="text-sm text-[var(--accent-cyan)]"
                    href={`/tasks/new?goal=${goalId}`}
                  >
                    Aufgabe aus Ziel erstellen
                  </Link>
                  <Link
                    className="text-sm text-[var(--accent-cyan)]"
                    href={`/projects/new?goal=${goalId}`}
                  >
                    Projekt aus Ziel erstellen
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Panel>

        <ManagementDisclosureGroup className="grid gap-6">
          <section
            id="zielplanung"
            aria-labelledby="zielplanung-heading"
            data-goal-planning-surface
            className="grid min-w-0 gap-6 rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,36,.45)] p-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:items-start"
          >
            <h2 id="zielplanung-heading" className="sr-only">
              Zielplanung
            </h2>

            <PlanningRegion
              id="erfolg-erkennen"
              title="Erfolg erkennen"
              className="lg:col-start-2 lg:row-start-1 lg:border-l lg:border-[var(--border-subtle)] lg:pl-6"
            >
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

              {outcome.goalStatus !== "achieved" && hasSuccessDefinition && (
                <div className="grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                  {activeCriteria.length > 0 && (
                    <p>
                      {outcome.summary.metCriteriaCount} von{" "}
                      {outcome.summary.activeCriteriaCount} Erfolgskriterien
                      erfüllt
                    </p>
                  )}
                  {outcome.summary.deferredCriteriaCount > 0 && (
                    <p>
                      {outcome.summary.deferredCriteriaCount} Erfolgskriterium/
                      Erfolgskriterien später prüfen
                    </p>
                  )}
                  {activeMilestones.length > 0 && (
                    <p>
                      {outcome.summary.achievedMilestoneCount} von{" "}
                      {outcome.summary.activeMilestoneCount} Etappen erreicht
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

              {canManage && activeCriteria.length > 0 && (
                <ManagementDisclosure label="Ergebnis prüfen">
                  <OperationForm
                    operation="achieve"
                    label="Ergebnis bestätigen"
                    disabled={!outcome.summary.readyToAchieve}
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

            <PlanningRegion
              id="weg-zum-ziel"
              title="Weg zum Ziel"
              className="lg:col-start-1 lg:row-start-1"
            >
              <p className="text-sm text-[var(--text-muted)]">
                Etappen machen den Weg sichtbar. Ihre Reihenfolge ist
                Orientierung; daraus wird nichts automatisch geplant.
              </p>
              {outcome.milestones.length > 0 ? (
                <div className="grid gap-5">
                  {outcome.milestones.map((milestone) => (
                    <MilestoneCard
                      key={milestone.id}
                      data={data}
                      goalId={goalId}
                      milestone={milestone}
                      outcome={outcome}
                      projectById={projectById}
                      taskById={taskById}
                      canManage={canManage}
                      index={activeMilestones.findIndex(
                        (activeMilestone) =>
                          activeMilestone.id === milestone.id,
                      )}
                      activeCount={activeMilestones.length}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  Noch keine Etappe definiert. Forme den Weg, wenn ein
                  Zwischenziel hilfreich ist.
                </p>
              )}
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
          </section>

          <Panel id="verlauf-belege" title="Verlauf & Belege">
            <p className="text-sm text-[var(--text-muted)]">
              Der Verlauf zeigt die jüngsten Ziel-, Etappen- und
              Kriterienentscheidungen. Aufgaben- und Projektabschlüsse bleiben
              in ihren eigenen Verläufen.
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
                {activeCriteria.some(
                  (criterion) => criterion.evaluations.length > 0,
                ) && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Kriterienverlauf ist je Erfolgskriterium hinter „Frühere
                    Entscheidungen anzeigen“ verfügbar.
                  </p>
                )}
              </div>
            )}
          </Panel>

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
