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
  type GoalJourneyAction,
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

function roadmapStatusLabel(status: GoalMilestone["status"]) {
  if (status === "active") return "Aktuell";
  if (status === "achieved") return "Erreicht";
  return "Geplant";
}

function guidanceHeading(action: GoalJourneyAction, taskTitle: string | null) {
  switch (action) {
    case "define_outcome":
      return "Woran erkennst du, dass es geschafft ist?";
    case "create_first_milestone":
    case "select_current_milestone":
      return "Was soll als Nächstes wahr sein?";
    case "create_next_task":
      return "Was kannst du konkret als Nächstes tun?";
    case "review_milestone":
      return "Ist das Zwischenziel erreicht?";
    case "review_goal":
      return "Ist dein Ziel erreicht?";
    case "open_ready_task":
      return taskTitle ?? "Nächste Aufgabe";
    case "resolve_blocker":
      return "Was hält den nächsten Schritt auf?";
    case "achieved":
      return "Erreichtes Ergebnis";
    case "archived":
      return "Archiviertes Ziel";
  }
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
  const milestones = outcome.milestones.filter(
    (item) => !item.archivedAt && item.status !== "archived",
  );
  if (milestones.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-muted)]">
        <span>Zwischenziel planen</span>
        <span aria-hidden="true">→</span>
        <span>Ziel prüfen</span>
      </div>
    );
  }
  return (
    <ol
      className={`grid min-w-0 gap-0 ${milestones.length === 1 ? "" : "border-l border-[var(--border-default)] pl-5"}`}
      aria-label="Zwischenziele in Reihenfolge"
      data-goal-progression
    >
      {milestones.map((milestone, index) => (
        <li
          key={milestone.id}
          className={`relative min-w-0 ${milestones.length === 1 ? "flex flex-wrap items-center gap-x-3 gap-y-2" : "grid gap-1 pb-5 last:pb-0"}`}
          data-goal-stage-status={milestone.status}
          data-goal-milestone-id={milestone.id}
        >
          {milestones.length > 1 && (
            <span
              aria-hidden="true"
              className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border ${milestone.status === "achieved" ? "border-[var(--text-muted)] bg-[var(--text-muted)]" : milestone.status === "active" ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]" : "border-[var(--border-default)] bg-[var(--surface-1)]"}`}
            />
          )}
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className={`text-xs font-semibold ${milestone.status === "active" ? "text-[var(--accent-cyan)]" : "text-[var(--text-muted)]"}`}
            >
              {roadmapStatusLabel(milestone.status)}
            </span>
            <Link
              href={goalAreaHref(goalId, "planung", milestone.id)}
              aria-current={
                selectedId === milestone.id ? "location" : undefined
              }
              className={`min-w-0 break-words font-semibold underline-offset-4 hover:underline focus-visible:underline ${selectedId === milestone.id ? "text-[var(--accent-cyan)]" : "text-[var(--text-primary)]"}`}
            >
              {milestone.title}
            </Link>
          </div>
          {milestones.length === 1 && (
            <span className="text-sm text-[var(--text-muted)]">
              Danach → Ziel prüfen
            </span>
          )}
          {canManage && (
            <GoalPlanningOnly marker="journey-milestone">
              <ManagementDisclosure label="Zwischenziel verwalten">
                <div className="grid gap-3" data-goal-milestone-controls>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    {milestone.status !== "active" && (
                      <OperationForm
                        operation="milestone.status"
                        label={
                          milestone.status === "achieved"
                            ? "Zwischenziel wieder öffnen"
                            : "Als aktuelles Zwischenziel festlegen"
                        }
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
                    )}
                    {milestone.status === "active" && (
                      <OperationForm
                        operation="milestone.status"
                        label="Zwischenziel zurückstellen"
                        closeOnSuccess
                      >
                        <Hidden name="goalId" value={goalId} />
                        <Hidden name="milestoneId" value={milestone.id} />
                        <Hidden name="status" value="planned" />
                      </OperationForm>
                    )}
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
                  </div>
                  <ManagementDisclosure label="Zwischenziel bearbeiten">
                    <OperationForm
                      operation="milestone.update"
                      label="Zwischenziel speichern"
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
                      label="Zwischenziel archivieren"
                      closeOnSuccess
                    >
                      <Hidden name="goalId" value={goalId} />
                      <Hidden name="milestoneId" value={milestone.id} />
                    </OperationForm>
                  </ManagementDisclosure>
                </div>
              </ManagementDisclosure>
            </GoalPlanningOnly>
          )}
        </li>
      ))}
      {milestones.length > 1 && (
        <li className="flex flex-wrap items-center gap-x-2 pt-1 text-sm text-[var(--text-muted)]">
          <span aria-hidden="true">→</span>
          <span>Ziel prüfen</span>
        </li>
      )}
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
  const guidanceTitle = guidanceHeading(
    journeyGuidance.action,
    journeyGuidance.task?.title ?? null,
  );
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

        {canManage && (
          <GoalPlanningOnly marker="goal-identity">
            <div className="border-t border-[var(--border-subtle)] pt-3">
              <ManagementDisclosure
                label="Was willst du erreichen?"
                initiallyOpen={!outcome.goalDescription?.trim()}
              >
                {edit}
              </ManagementDisclosure>
            </div>
          </GoalPlanningOnly>
        )}

        <div className="grid min-w-0 gap-5" data-goal-journey-layout>
          <section
            id="goal-current-work"
            aria-label="Aktuelle Arbeit"
            data-goal-now
            data-goal-current-workbench
            className="grid min-w-0 content-start gap-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] p-5 md:p-7"
          >
            <div className="grid min-w-0 gap-2" data-goal-current-result>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-cyan)]">
                Aktuell
              </p>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-muted)]">
                    Zwischenziel
                  </p>
                  <h3 className="mt-1 break-words text-xl font-semibold">
                    {currentMilestone?.title ??
                      "Noch kein aktuelles Zwischenziel"}
                  </h3>
                  {currentMilestone?.description && (
                    <p className="mt-2 max-w-[70ch] whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                      {currentMilestone.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <h2 className="max-w-4xl break-words text-2xl font-semibold tracking-tight md:text-3xl">
                {guidanceTitle}
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
                {journeyGuidance.action === "review_goal" &&
                !outcome.summary.readyToAchieve
                  ? "Prüfe deine Erfolgskriterien und plane weiter, falls noch etwas offen ist."
                  : journeyGuidance.reason}
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
              {journeyGuidance.action === "review_goal" && (
                <section
                  aria-label="Erreicht, wenn …"
                  data-goal-final-criteria
                  className="grid gap-2 border-t border-[var(--border-subtle)] pt-4"
                >
                  <h3 className="text-sm font-semibold">Erreicht, wenn …</h3>
                  {activeCriteria.length > 0 ? (
                    <ul className="grid gap-2 text-sm">
                      {activeCriteria.map((criterion) => (
                        <li
                          key={criterion.id}
                          className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1"
                        >
                          <span className="text-[var(--text-secondary)]">
                            {criterion.title}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {statusLabel(
                              criterionEvaluationState(
                                criterion,
                                criterion.latestEvaluation,
                              ),
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">
                      Lege zuerst ein Erfolgskriterium fest.
                    </p>
                  )}
                </section>
              )}
            </div>

            {journeyGuidance.action === "review_milestone" &&
              currentMilestone &&
              canManage && (
                <div className="grid justify-items-start gap-2">
                  <OperationForm
                    operation="milestone.status"
                    label="Zwischenziel erreicht"
                    confirmMessage="Hast du das Zwischenziel geprüft und möchtest es ausdrücklich als erreicht bestätigen?"
                    submitClassName="min-h-12 w-fit rounded-lg bg-[var(--accent-cyan)] px-5 py-3 text-sm font-semibold text-[var(--bg-app)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
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
                  <Link
                    href={`/tasks/new?goal=${goalId}&goalMilestone=${currentMilestone.id}`}
                    className="min-h-10 w-fit py-2 text-sm text-[var(--text-secondary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                  >
                    Weitere Aufgabe planen
                  </Link>
                </div>
              )}
            {journeyGuidance.action === "review_goal" &&
              outcome.summary.readyToAchieve &&
              canManage && (
                <OperationForm
                  operation="achieve"
                  label="Ziel erreicht bestätigen"
                  confirmMessage="Hast du das Ziel geprüft und möchtest es ausdrücklich als erreicht bestätigen?"
                  submitClassName="min-h-12 w-fit rounded-lg bg-[var(--accent-cyan)] px-5 py-3 text-sm font-semibold text-[var(--bg-app)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
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
                  Weiter planen
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
                  Nächste Aufgabe planen
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
                  {journeyGuidance.action === "define_outcome"
                    ? "Erfolgskriterium festlegen"
                    : journeyGuidance.action === "create_first_milestone"
                      ? "Zwischenziel planen"
                      : "Zwischenziel auswählen"}
                </Link>
              )}
            {journeyGuidance.action === "achieved" && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link
                  className="min-h-10 w-fit py-2 text-sm text-[var(--text-secondary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                  href={goalAreaHref(goalId, "verlauf")}
                >
                  Verlauf ansehen
                </Link>
                <OperationForm
                  operation="reopen"
                  label="Ziel wieder öffnen"
                  confirmMessage="Möchtest du das erreichte Ziel wieder öffnen und weiter daran arbeiten?"
                  submitClassName="min-h-10 w-fit rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                >
                  <Hidden name="goalId" value={goalId} />
                </OperationForm>
              </div>
            )}
            {journeyGuidance.action === "archived" && (
              <p role="status" className="text-sm text-[var(--text-muted)]">
                Archivierte Ziele sind schreibgeschützt.
              </p>
            )}
            {currentMilestone && canManage && (
              <GoalPlanningOnly marker="current-milestone">
                <div className="border-t border-[var(--border-subtle)] pt-3">
                  <ManagementDisclosure
                    label="Passt bereits etwas dazu?"
                    initiallyOpen={
                      journeyGuidance.action === "create_next_task"
                    }
                  >
                    <div
                      className="grid gap-3"
                      data-goal-current-planning-controls
                    >
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                        {journeyGuidance.action !== "create_next_task" && (
                          <Link
                            href={`/tasks/new?goal=${goalId}&goalMilestone=${currentMilestone.id}`}
                            className="text-[var(--accent-cyan)] underline underline-offset-4"
                          >
                            Aufgabe zum Zwischenziel hinzufügen
                          </Link>
                        )}
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
                  </ManagementDisclosure>
                </div>
              </GoalPlanningOnly>
            )}

            {currentMilestoneTasks.length > 0 ? (
              <ul className="grid gap-0" aria-label="Aufgaben am Zwischenziel">
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
                          <ManagementDisclosure label="Aufgabenzuordnung verwalten">
                            <OperationForm
                              operation="support.task.remove"
                              label="Zwischenziel-Zuordnung lösen"
                              closeOnSuccess
                            >
                              <Hidden name="goalId" value={goalId} />
                              <Hidden name="supportId" value={taskSupport.id} />
                            </OperationForm>
                          </ManagementDisclosure>
                        </GoalPlanningOnly>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : currentMilestone ? (
              <p className="text-sm text-[var(--text-muted)]">
                Noch keine Aufgaben.
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Noch kein Zwischenziel ausgewählt.
              </p>
            )}

            {currentMilestoneProjects.length > 0 && (
              <section
                className="grid gap-2 border-t border-[var(--border-subtle)] pt-4"
                aria-label="Projektkontext des aktuellen Zwischenziels"
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
                            <ManagementDisclosure label="Projektzuordnung verwalten">
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
                            </ManagementDisclosure>
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
                !outcome.taskSupport.some((link) => link.targetId === task.id),
            ) && (
              <GoalPlanningOnly marker="unassigned-tasks">
                <details className="border-t border-[var(--border-subtle)] pt-3">
                  <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">
                    Direkt dem Ziel zugeordnete Aufgaben
                  </summary>
                  <p className="mb-2 text-sm text-[var(--text-muted)]">
                    Diese Aufgaben gehören nicht zum aktuellen Zwischenziel.
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
              </GoalPlanningOnly>
            )}
          </section>

          <section
            aria-label="Dein Weg"
            className={`grid min-w-0 content-start gap-3 ${activeMilestones.length > 1 ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 md:p-6" : "px-1 py-1"}`}
            data-goal-journey
          >
            <h2 className="text-sm font-semibold text-[var(--text-muted)]">
              Dein Weg
            </h2>
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
                  <ManagementDisclosure
                    label="Was soll als Nächstes wahr sein?"
                    initiallyOpen={
                      journeyGuidance.action === "create_first_milestone" ||
                      journeyGuidance.action === "select_current_milestone"
                    }
                  >
                    <OperationForm
                      operation="milestone.create"
                      label="Zwischenziel erstellen"
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
                        Neue Zwischenziele starten geplant. Lege danach
                        ausdrücklich fest, woran du jetzt arbeitest.
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
            <GoalPlanningOnly marker="definition-of-done">
              <section
                className="grid gap-3 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-secondary)]"
                aria-label="Erfolgskriterien planen"
                data-goal-definition-of-done
              >
                <ManagementDisclosure
                  label="Woran erkennst du, dass es geschafft ist?"
                  initiallyOpen={journeyGuidance.action === "define_outcome"}
                >
                  <div data-goal-definition-of-done-controls>
                    <h3 className="mb-3 font-semibold">Erreicht, wenn …</h3>
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
                        Lege fest, woran du das erreichte Ziel erkennen wirst.
                      </p>
                    )}
                    {canManage && (
                      <ManagementDisclosure
                        label={
                          activeCriteria.length === 0
                            ? "Erfolgskriterium festlegen"
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
                            label="Zwischenziel (optional)"
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
                </ManagementDisclosure>
              </section>
            </GoalPlanningOnly>
          </section>
        </div>

        <div className="-mt-2">
          <Link
            href={goalAreaHref(goalId, "verlauf")}
            className="w-fit text-sm text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--text-secondary)]"
          >
            Verlauf ansehen
          </Link>
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
