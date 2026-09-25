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
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import { EntityWorkbenchShell } from "./pages";
import { Choice, fieldClass, OperationForm } from "./forms";
import { taskDependencyContext } from "@/features/real-data/domain/task-dependencies";
import { ManagementDisclosure } from "./management-disclosure";
import {
  GoalPlanningMode,
  GoalPlanningModeToggle,
  GoalPlanningOnly,
} from "./goal-planning-mode";

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
  canManage,
}: {
  goalId: string;
  outcome: GoalOutcome;
  selectedId: string | null;
  canManage: boolean;
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
      className="grid min-w-0 gap-0"
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
            className="relative min-w-0 border-l border-[var(--border-default)] pb-5 pl-7 last:border-l-transparent last:pb-0"
            data-goal-stage-status={milestone.status}
            data-goal-milestone-id={milestone.id}
          >
            <span
              aria-hidden="true"
              className={`absolute -left-[11px] top-0 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${milestone.status === "achieved" ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)] text-[var(--bg-app)]" : milestone.status === "active" ? "border-[var(--accent-cyan)] bg-[var(--surface-2)] text-[var(--accent-cyan)]" : "border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-muted)]"}`}
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <Link
                href={goalAreaHref(goalId, "planung", milestone.id)}
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
            {canManage && (
              <GoalPlanningOnly marker="journey-milestone">
                <div className="mt-3 grid gap-3" data-goal-milestone-controls>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
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
                      disabled={index === milestones.length - 1}
                      closeOnSuccess
                    >
                      <Hidden name="goalId" value={goalId} />
                      <Hidden name="milestoneId" value={milestone.id} />
                      <Hidden name="direction" value="down" />
                    </OperationForm>
                    {milestone.status === "active" && (
                      <OperationForm
                        operation="milestone.status"
                        label="Planen"
                        closeOnSuccess
                      >
                        <Hidden name="goalId" value={goalId} />
                        <Hidden name="milestoneId" value={milestone.id} />
                        <Hidden name="status" value="planned" />
                      </OperationForm>
                    )}
                  </div>
                  <ManagementDisclosure label="Etappe bearbeiten">
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
                    <OperationForm
                      operation="milestone.archive"
                      label="Etappe archivieren"
                      closeOnSuccess
                    >
                      <Hidden name="goalId" value={goalId} />
                      <Hidden name="milestoneId" value={milestone.id} />
                    </OperationForm>
                  </ManagementDisclosure>
                </div>
              </GoalPlanningOnly>
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
    (milestone) => !milestone.archivedAt && milestone.status !== "archived",
  );
  const selectedArea = area === "verlauf" ? "verlauf" : "journey";
  const activeCriteria = outcome.criteria.filter(
    (criterion) => !criterion.archivedAt,
  );
  const currentMilestone =
    activeMilestones.find((milestone) => milestone.status === "active") ?? null;
  const journeyGuidance = deriveGoalJourneyGuidance(
    outcome,
    data.dependencyGraph,
  );
  const currentMilestoneTaskIds = new Set(
    currentMilestone
      ? outcome.taskSupport
          .filter((link) => link.goalMilestoneId === currentMilestone.id)
          .map((link) => link.targetId)
      : [],
  );
  const currentMilestoneTasks = currentMilestone
    ? orderCurrentGoalMilestoneTasks(
        outcome.tasks.filter(
          (task) => currentMilestoneTaskIds.has(task.id) && !task.archivedAt,
        ),
        data.dependencyGraph,
        journeyGuidance.action === "open_ready_task"
          ? (journeyGuidance.task?.id ?? undefined)
          : undefined,
      )
    : [];
  const currentMilestoneProjects = currentMilestone
    ? outcome.projectSupport
        .filter((link) => link.goalMilestoneId === currentMilestone.id)
        .map((link) =>
          outcome.projects.find((project) => project.id === link.targetId),
        )
        .filter((project) => project && !project.archivedAt)
    : [];
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
      <GoalPlanningMode
        initiallyOpen={
          canManage && ["planung", "arbeit", "erfolg"].includes(area ?? "")
        }
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
            {canManage && (
              <div className="ml-auto">
                <GoalPlanningModeToggle />
              </div>
            )}
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
        </header>

        <div className="grid gap-6">
          <section
            id="goal-jetzt"
            aria-label="JETZT"
            data-goal-now
            className="grid min-w-0 gap-4 rounded-xl border border-[rgba(89,214,223,.38)] bg-[linear-gradient(135deg,rgba(89,214,223,.09),rgba(15,23,36,.76)_42%)] p-5 shadow-[0_18px_60px_rgba(0,0,0,.16)] md:p-7"
          >
            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent-cyan)]">
                JETZT
              </p>
              <h2 className="max-w-4xl break-words text-2xl font-semibold tracking-tight md:text-3xl">
                {journeyGuidance.title}
              </h2>
              <p
                className="max-w-4xl text-sm leading-6 text-[var(--text-secondary)] md:text-base"
                data-goal-journey-action={journeyGuidance.action}
                data-goal-next-step-state={
                  journeyGuidance.action === "resolve_blocker"
                    ? "blocked"
                    : journeyGuidance.action === "open_ready_task" ||
                        journeyGuidance.action === "review_milestone" ||
                        (journeyGuidance.action === "review_goal" &&
                          outcome.summary.readyToAchieve)
                      ? "ready"
                      : "planning"
                }
              >
                {journeyGuidance.reason}
              </p>
              {journeyGuidance.blockers.length > 0 && (
                <ul
                  className="grid gap-1 text-sm text-[var(--accent-orange)]"
                  aria-label="Offene Aufgaben-Voraussetzungen"
                >
                  {journeyGuidance.blockers.map((blocker) => (
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
              )}
              {journeyGuidance.action === "review_goal" &&
                !outcome.summary.readyToAchieve && (
                  <ul
                    className="grid gap-1 text-sm text-[var(--text-muted)]"
                    aria-label="Was vor dem Goal Review noch fehlt"
                  >
                    {outcome.summary.blockers.map((blocker) => (
                      <li key={blocker}>{readableBlocker(blocker)}</li>
                    ))}
                  </ul>
                )}
            </div>

            {journeyGuidance.action === "review_milestone" &&
              currentMilestone &&
              canManage && (
                <OperationForm
                  operation="milestone.status"
                  label="Meilenstein erreicht"
                  confirmMessage="Zwischenresultat gegen die Etappe prüfen und ausdrücklich als erreicht bestätigen?"
                  submitClassName="min-h-12 w-fit rounded-lg bg-[var(--accent-cyan)] px-5 py-3 text-sm font-semibold text-[var(--bg-app)] shadow-[0_8px_24px_rgba(89,214,223,.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="milestoneId" value={currentMilestone.id} />
                  <Hidden name="status" value="achieved" />
                  <Hidden
                    name="expectedUpdatedAt"
                    value={currentMilestone.updatedAt}
                  />
                  <label className="grid max-w-xl gap-1 text-sm">
                    Review-Notiz (optional)
                    <input className={fieldClass} name="note" />
                  </label>
                </OperationForm>
              )}
            {journeyGuidance.action === "review_goal" &&
              outcome.summary.readyToAchieve &&
              canManage && (
                <OperationForm
                  operation="achieve"
                  label="Ziel als erreicht bestätigen"
                  confirmMessage="Das finale Ergebnis gegen die Definition of Done prüfen und ausdrücklich als erreicht bestätigen?"
                  submitClassName="min-h-12 w-fit rounded-lg bg-[var(--accent-cyan)] px-5 py-3 text-sm font-semibold text-[var(--bg-app)] shadow-[0_8px_24px_rgba(89,214,223,.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                >
                  <Hidden name="goalId" value={goalId} />
                  <Hidden name="expectedUpdatedAt" value={outcome.updatedAt} />
                  <label className="grid max-w-xl gap-1 text-sm">
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
              )}
            {journeyGuidance.action === "review_goal" &&
              !outcome.summary.readyToAchieve &&
              canManage && (
                <Link
                  className="inline-flex min-h-12 w-fit items-center rounded-lg bg-[var(--accent-cyan)] px-5 py-3 text-sm font-semibold text-[var(--bg-app)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                  href={goalAreaHref(goalId, "planung")}
                >
                  Definition of Done prüfen
                </Link>
              )}
            {journeyGuidance.action === "open_ready_task" &&
              journeyGuidance.task && (
                <Link
                  className="inline-flex min-h-12 w-fit items-center rounded-lg bg-[var(--accent-cyan)] px-5 py-3 text-sm font-semibold text-[var(--bg-app)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                  href={`/tasks/${journeyGuidance.task.id}`}
                >
                  Aufgabe öffnen
                </Link>
              )}
            {journeyGuidance.action === "resolve_blocker" &&
              journeyGuidance.task && (
                <Link
                  className="inline-flex min-h-12 w-fit items-center rounded-lg border border-[var(--accent-orange)] px-5 py-3 text-sm font-semibold text-[var(--accent-orange)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                  href={`/tasks/${journeyGuidance.blockers[0]?.id ?? journeyGuidance.task.id}`}
                >
                  Voraussetzung öffnen
                </Link>
              )}
            {journeyGuidance.action === "create_next_task" &&
              currentMilestone &&
              canManage && (
                <Link
                  className="inline-flex min-h-12 w-fit items-center rounded-lg bg-[var(--accent-cyan)] px-5 py-3 text-sm font-semibold text-[var(--bg-app)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                  href={`/tasks/new?goal=${goalId}&goalMilestone=${currentMilestone.id}`}
                >
                  Aufgabe zur Etappe hinzufügen
                </Link>
              )}
            {[
              "define_outcome",
              "create_first_milestone",
              "select_current_milestone",
            ].includes(journeyGuidance.action) &&
              canManage && (
                <Link
                  className="inline-flex min-h-12 w-fit items-center rounded-lg bg-[var(--accent-cyan)] px-5 py-3 text-sm font-semibold text-[var(--bg-app)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                  href={goalAreaHref(goalId, "planung")}
                >
                  Planung bearbeiten
                </Link>
              )}
            {journeyGuidance.action === "achieved" && (
              <Link
                className="inline-flex min-h-10 w-fit items-center rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                href={goalAreaHref(goalId, "verlauf")}
              >
                Review und Verlauf ansehen
              </Link>
            )}
            {journeyGuidance.action === "archived" && (
              <p role="status" className="text-sm text-[var(--text-muted)]">
                Archivierte Ziele sind schreibgeschützt.
              </p>
            )}
          </section>

          <div
            className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,68fr)_minmax(280px,32fr)]"
            data-goal-journey-layout
          >
            <section
              aria-label="Arbeit an der aktuellen Etappe"
              className="grid min-w-0 content-start gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 md:p-6"
              data-goal-current-workbench
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Current-Milestone-Workbench
                  </p>
                  <h2 className="mt-1 break-words text-xl font-semibold">
                    {currentMilestone?.title ?? "Keine aktuelle Etappe"}
                  </h2>
                  {currentMilestone?.description && (
                    <p className="mt-2 max-w-[70ch] whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                      {currentMilestone.description}
                    </p>
                  )}
                </div>
                {currentMilestone && (
                  <span className="rounded-full border border-[var(--accent-cyan)] px-3 py-1 text-xs font-semibold text-[var(--accent-cyan)]">
                    Current
                  </span>
                )}
              </div>

              {currentMilestone && canManage && (
                <GoalPlanningOnly marker="current-milestone">
                  <div
                    className="grid gap-3 border-t border-[var(--border-subtle)] pt-4"
                    data-goal-current-planning-controls
                  >
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                      <Link
                        href={`/tasks/new?goal=${goalId}&goalMilestone=${currentMilestone.id}`}
                        className="text-[var(--accent-cyan)] underline underline-offset-4"
                      >
                        Aufgabe zur Etappe hinzufügen
                      </Link>
                      <Link
                        href={`/projects/new?goal=${goalId}&goalMilestone=${currentMilestone.id}`}
                        className="text-[var(--accent-cyan)] underline underline-offset-4"
                      >
                        Projekt hinzufügen
                      </Link>
                    </div>
                    {eligibleTasks.length > 0 && (
                      <ManagementDisclosure label="Aufgabe zuordnen">
                        <OperationForm
                          operation="support.task.add"
                          label="Aufgabe verknüpfen"
                          closeOnSuccess
                        >
                          <Hidden name="goalId" value={goalId} />
                          <Hidden
                            name="goalMilestoneId"
                            value={currentMilestone.id}
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
                    {eligibleProjects.length > 0 && (
                      <ManagementDisclosure label="Projektkontext verknüpfen">
                        <OperationForm
                          operation="support.project.add"
                          label="Projekt verknüpfen"
                          closeOnSuccess
                        >
                          <Hidden name="goalId" value={goalId} />
                          <Hidden
                            name="goalMilestoneId"
                            value={currentMilestone.id}
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
                  </div>
                </GoalPlanningOnly>
              )}

              {currentMilestoneTasks.length > 0 ? (
                <ul
                  className="grid gap-0"
                  aria-label="Aufgaben der aktuellen Etappe"
                >
                  {currentMilestoneTasks.map((task) => {
                    if (!task) return null;
                    const dependency = taskDependencyContext(
                      data.dependencyGraph,
                      task.id,
                    );
                    const taskStatus =
                      task.status === "done" || task.status === "completed"
                        ? "abgeschlossen"
                        : task.status === "active"
                          ? "in Arbeit"
                          : task.status === "canceled"
                            ? "abgebrochen"
                            : task.status === "waiting"
                              ? "wartet"
                              : task.status === "inbox"
                                ? "Inbox"
                                : task.status === "someday"
                                  ? "irgendwann"
                                  : "geplant";
                    const taskCompleted = [
                      "done",
                      "completed",
                      "canceled",
                    ].includes(task.status);
                    const taskSupport = outcome.taskSupport.find(
                      (link) =>
                        link.targetId === task.id &&
                        link.goalMilestoneId === currentMilestone?.id,
                    );
                    return (
                      <li
                        key={task.id}
                        className={`grid gap-1 border-t border-[var(--border-subtle)] py-3 first:border-t-0 ${taskCompleted ? "opacity-60" : ""}`}
                        data-goal-current-task={task.id}
                        data-task-availability={dependency.availability.toLowerCase()}
                        data-goal-current-task-state={
                          taskCompleted
                            ? "completed"
                            : dependency.availability.toLowerCase()
                        }
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="break-words font-semibold text-[var(--accent-cyan)] underline underline-offset-4"
                          >
                            {task.title}
                          </Link>
                          <span
                            className={`rounded-md border px-2 py-1 text-xs ${dependency.availability === "BLOCKED" ? "border-[var(--accent-orange)] text-[var(--accent-orange)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"}`}
                          >
                            {taskCompleted
                              ? "Abgeschlossen"
                              : dependency.availability === "BLOCKED"
                                ? "Blockiert"
                                : dependency.availability === "READY"
                                  ? "Keine offene Voraussetzung"
                                  : "Verfügbarkeit unbekannt"}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)]">
                          {taskStatus}
                          {task.plannedDate
                            ? ` · geplant ${goalDateLabel(task.plannedDate)}`
                            : ""}
                          {task.dueAt
                            ? ` · fällig ${new Date(task.dueAt).toLocaleDateString("de-DE")}`
                            : ""}
                        </p>
                        {dependency.blockers.length > 0 && (
                          <p className="text-sm text-[var(--accent-orange)]">
                            Wartet auf:{" "}
                            {dependency.blockers
                              .map((item) =>
                                item.task ? (
                                  <Link
                                    key={item.edgeId}
                                    className="underline underline-offset-4"
                                    href={`/tasks/${item.task.id}`}
                                  >
                                    {item.task.title}
                                  </Link>
                                ) : (
                                  <span key={item.edgeId}>
                                    unbekannte Aufgabe
                                  </span>
                                ),
                              )
                              .reduce<ReactNode[]>((items, link, index) => {
                                if (index > 0) items.push(", ");
                                items.push(link);
                                return items;
                              }, [])}
                          </p>
                        )}
                        {canManage && taskSupport && (
                          <GoalPlanningOnly marker="current-task-association">
                            <OperationForm
                              operation="support.task.remove"
                              label="Etappen-Zuordnung lösen"
                              closeOnSuccess
                            >
                              <Hidden name="goalId" value={goalId} />
                              <Hidden name="supportId" value={taskSupport.id} />
                            </OperationForm>
                          </GoalPlanningOnly>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : currentMilestone ? (
                <p className="rounded-lg border border-dashed border-[var(--border-default)] p-4 text-sm text-[var(--text-muted)]">
                  Dieser Etappe ist noch keine Aufgabe zugeordnet. Der nächste
                  ausführbare Schritt wird erst als Aufgabe angelegt.
                </p>
              ) : (
                <p className="rounded-lg border border-dashed border-[var(--border-default)] p-4 text-sm text-[var(--text-muted)]">
                  Lege in der Planung eine aktuelle Etappe fest. Aufgaben
                  bleiben die ausführbaren und schedulbaren Arbeitseinheiten.
                </p>
              )}

              {currentMilestoneProjects.length > 0 && (
                <section
                  className="grid gap-2 border-t border-[var(--border-subtle)] pt-4"
                  aria-label="Projektkontext der aktuellen Etappe"
                >
                  <h3 className="text-sm font-semibold">Projektkontext</h3>
                  <ul className="grid gap-2">
                    {currentMilestoneProjects.map((project) => {
                      if (!project) return null;
                      const projectSupport = outcome.projectSupport.find(
                        (link) =>
                          link.targetId === project.id &&
                          link.goalMilestoneId === currentMilestone?.id,
                      );
                      return (
                        <li key={project.id} className="grid gap-2 text-sm">
                          <div>
                            <Link
                              href={`/projects/${project.id}`}
                              className="text-[var(--accent-cyan)] underline underline-offset-4"
                            >
                              {project.title}
                            </Link>
                            {project.nextStep && (
                              <span className="text-[var(--text-muted)]">
                                {" "}
                                · {project.nextStep}
                              </span>
                            )}
                          </div>
                          {canManage && projectSupport && (
                            <GoalPlanningOnly marker="current-project-association">
                              <OperationForm
                                operation="support.project.remove"
                                label="Projektkontext lösen"
                                closeOnSuccess
                              >
                                <Hidden name="goalId" value={goalId} />
                                <Hidden
                                  name="supportId"
                                  value={projectSupport.id}
                                />
                              </OperationForm>
                            </GoalPlanningOnly>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {outcome.tasks.some(
                (task) =>
                  !task.archivedAt &&
                  !task.projectId &&
                  !outcome.taskSupport.some(
                    (link) => link.targetId === task.id,
                  ),
              ) && (
                <details className="border-t border-[var(--border-subtle)] pt-3">
                  <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">
                    Direkt dem Ziel zugeordnete Aufgaben
                  </summary>
                  <p className="mb-2 text-sm text-[var(--text-muted)]">
                    Diese Aufgaben gehören nicht zur aktuellen Etappe und
                    bestimmen JETZT nicht.
                  </p>
                  <ul className="grid gap-2">
                    {outcome.tasks
                      .filter(
                        (task) =>
                          !task.archivedAt &&
                          !task.projectId &&
                          !outcome.taskSupport.some(
                            (link) => link.targetId === task.id,
                          ),
                      )
                      .map((task) => (
                        <li key={task.id}>
                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-sm text-[var(--accent-cyan)] underline underline-offset-4"
                          >
                            {task.title}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </details>
              )}
            </section>

            <section
              aria-label="Langfristige Goal Journey"
              className="grid min-w-0 content-start gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 md:p-6"
              data-goal-journey
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Journey
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  Der Weg zum Ergebnis
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Geordnete Zwischenresultate zeigen den geplanten Weg. Nur
                  Aufgaben-Voraussetzungen erzeugen Bereit oder Blockiert.
                </p>
              </div>
              <MilestoneProgression
                goalId={goalId}
                outcome={outcome}
                selectedId={selectedStage ?? currentMilestone?.id ?? null}
                canManage={canManage}
              />
              {canManage && (
                <GoalPlanningOnly marker="journey">
                  <div
                    className="grid gap-3 border-t border-[var(--border-subtle)] pt-4"
                    data-goal-journey-planning-controls
                  >
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
                        <p className="text-sm text-[var(--text-muted)]">
                          Neue Etappen starten geplant. Wähle danach eine Etappe
                          ausdrücklich als aktuelle Etappe.
                        </p>
                        <Hidden name="status" value="planned" />
                        <Hidden
                          name="sortOrder"
                          value={String(outcome.milestones.length)}
                        />
                      </OperationForm>
                    </ManagementDisclosure>
                  </div>
                </GoalPlanningOnly>
              )}
              <section
                className="grid gap-3 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-secondary)]"
                aria-label="Definition of Done"
                data-goal-definition-of-done
              >
                <div className="grid gap-1">
                  <h3 className="font-semibold">Definition of Done</h3>
                  <p>
                    {activeCriteria.length} finale Kriterien ·{" "}
                    {outcome.summary.metCriteriaCount} erfüllt
                  </p>
                  {hasSuccessDefinition && (
                    <p
                      className="text-[var(--text-muted)]"
                      data-goal-result-state={
                        outcome.summary.readyToAchieve ? "ready" : "open"
                      }
                    >
                      {outcome.summary.readyToAchieve
                        ? "Ergebnis bereit"
                        : "Ergebnis noch offen"}
                    </p>
                  )}
                </div>
                <GoalPlanningOnly
                  when="closed"
                  marker="definition-of-done-read"
                >
                  {activeCriteria.length > 0 ? (
                    <ul className="grid gap-1 text-[var(--text-secondary)]">
                      {activeCriteria.map((criterion) => (
                        <li key={criterion.id}>
                          {criterion.title} ·{" "}
                          {statusLabel(
                            criterionEvaluationState(
                              criterion,
                              criterion.latestEvaluation,
                            ),
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[var(--text-muted)]">
                      Noch keine Erfolgskriterien festgelegt.
                    </p>
                  )}
                </GoalPlanningOnly>
                <GoalPlanningOnly marker="definition-of-done">
                  <div data-goal-definition-of-done-controls>
                    <p className="mb-3 text-[var(--text-muted)]">
                      {successGuidance}
                    </p>
                    {outcome.summary.blockers.length > 0 && (
                      <ul
                        className="mb-3 grid gap-1 text-[var(--accent-orange)]"
                        aria-label="Was vor dem Goal Review noch fehlt"
                      >
                        {outcome.summary.blockers.map((blocker) => (
                          <li key={blocker}>{readableBlocker(blocker)}</li>
                        ))}
                      </ul>
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
                    ) : (
                      <p className="mb-3 text-[var(--text-muted)]">
                        Noch kein Erfolgskriterium festgelegt.
                      </p>
                    )}
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
                            <input
                              className={fieldClass}
                              name="title"
                              required
                            />
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
                  </div>
                </GoalPlanningOnly>
              </section>
              <div className="grid gap-2 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-secondary)]">
                <p>
                  {outcome.summary.achievedMilestoneCount} von{" "}
                  {outcome.summary.activeMilestoneCount} Etappen ausdrücklich
                  bestätigt
                </p>
                <Link
                  href={goalAreaHref(goalId, "verlauf")}
                  className="w-fit text-sm text-[var(--accent-cyan)] underline underline-offset-4"
                >
                  Verlauf ansehen
                </Link>
              </div>
            </section>
          </div>
        </div>

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
      </GoalPlanningMode>
    </EntityWorkbenchShell>
  );
}
