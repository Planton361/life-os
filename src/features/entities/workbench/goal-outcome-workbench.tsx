import Link from "next/link";
import type { ReactNode } from "react";
import {
  criterionEvaluationState,
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
      options.push({ id: `task:${task.id}`, title: `Task · ${task.title}` });
    }
  }
  if (allowed.includes("project")) {
    for (const project of outcome.projects.filter((item) => !item.archivedAt)) {
      options.push({
        id: `project:${project.id}`,
        title: `Project · ${project.title}`,
      });
    }
  }
  if (allowed.includes("project_milestone")) {
    for (const milestone of data.milestones.filter(
      (item) => !item.archived_at,
    )) {
      options.push({
        id: `project_milestone:${milestone.id}`,
        title: `Project-Milestone · ${milestone.title}`,
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
  if (sourceType === "project_milestone") return "Project-Milestone";
  if (sourceType === "review_record") return "Review";
  if (sourceType === "goal_criterion_evaluation") return "Kriterium";
  return sourceType === "task" ? "Task" : "Project";
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
  return `${basis.criterionTitleSnapshot ?? "Kriterium unbekannt"} · ${basis.evaluationStateSnapshot ?? "unbekannt"}${target}`;
}

function milestoneBasisLabel(
  basis: GoalAchievementEvent["milestoneBasis"][number],
) {
  return `${basis.milestoneTitleSnapshot ?? "Etappe unbekannt"} · ${basis.resultingStatusSnapshot ?? "Status unbekannt"}${basis.achievementEpisodeId ? ` · Episode ${basis.achievementEpisodeId.slice(0, 8)}` : ""}`;
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

function isOpenMilestoneEpisode(
  event: GoalMilestoneAchievementEvent,
  history: readonly GoalMilestoneAchievementEvent[],
) {
  if (event.resultingStatus !== "achieved") return false;
  return !history.some(
    (candidate) =>
      candidate.episodeId === event.episodeId &&
      candidate.eventType === "reopened" &&
      candidate.recordedAt >= event.recordedAt,
  );
}

function currentMilestoneEvent(
  milestoneId: string,
  history: readonly GoalMilestoneAchievementEvent[],
) {
  return history.find(
    (event) =>
      event.milestoneId === milestoneId &&
      isOpenMilestoneEpisode(event, history),
  );
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
              : " · Goal-weit"}
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
  const event = currentMilestoneEvent(milestone.id, outcome.milestoneHistory);
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
                  Project ·{" "}
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
                  Task ·{" "}
                  {taskById.get(link.targetId)?.title ?? link.targetTitle}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--text-muted)]">
            Noch kein Project- oder Task-Kontext.
          </p>
        )}
      </div>
      {!isArchived && (
        <div className="flex flex-wrap gap-3">
          <Link
            className="text-sm text-[var(--accent-cyan)]"
            href={`/projects/new?goal=${goalId}&goalMilestone=${milestone.id}`}
          >
            Project aus Etappe erstellen
          </Link>
          <Link
            className="text-sm text-[var(--accent-cyan)]"
            href={`/tasks/new?goal=${goalId}&goalMilestone=${milestone.id}`}
          >
            Task aus Etappe erstellen
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
    <ManagementDisclosure label="Goal-Verlauf verwalten">
      <OperationForm
        operation="goal.amend"
        label="Goal-Verlauf ergänzen"
        closeOnSuccess
      >
        <Hidden name="goalId" value={goalId} />
        <EventAmendmentFields event={event} kind="goal" />
      </OperationForm>
      {event.resultingStatus === "achieved" && (
        <OperationForm
          operation="goal.evidence"
          label="Goal-Belegverlauf ändern"
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
      {event.eventType === "achieved" && (
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
        <ManagementDisclosure label="Etappen-Verlauf verwalten">
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
  const latestAchievement = outcome.achievementHistory.find(
    (event) =>
      (event.eventType === "achieved" || event.eventType === "amended") &&
      event.resultingStatus === "achieved",
  );
  return (
    <EntityWorkbenchShell kind="goal" title={outcome.goalTitle}>
      <div
        data-goal-outcome="workbench"
        data-goal-read-first="true"
        className="grid content-start gap-6"
      >
        <header className="grid gap-3" data-goal-default-surface>
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--accent-blue)]">
            {outcome.goalStatus === "achieved" ? "Erreichtes Ergebnis" : "Ziel"}
          </p>
          <p className="text-sm text-[var(--text-muted)]" data-goal-status>
            Stand: {goalStatusLabel(outcome.goalStatus)}
          </p>
          {outcome.goalStatus === "achieved" ? (
            <div className="grid gap-2">
              <p className="text-base font-semibold text-[var(--accent-cyan)]">
                Ergebnis akzeptiert
                {outcome.achievedAt
                  ? ` am ${outcome.achievedAt.slice(0, 10)}`
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
              <p className="text-sm text-[var(--text-muted)]">
                Die akzeptierte Kriterien- und Etappenbasis steht im Goal
                Review.
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer text-[var(--text-muted)]">
                  Aktuelle Zielidentität anzeigen
                </summary>
                <div className="mt-2 grid gap-2">
                  <p className="max-w-4xl whitespace-pre-wrap text-[var(--text-secondary)]">
                    {outcome.goalDescription ||
                      "Keine Beschreibung hinterlegt."}
                  </p>
                  {outcome.goalWhy && (
                    <p className="max-w-4xl whitespace-pre-wrap text-[var(--text-secondary)]">
                      <span className="font-semibold">Warum:</span>{" "}
                      {outcome.goalWhy}
                    </p>
                  )}
                </div>
              </details>
            </div>
          ) : (
            <div className="grid gap-2">
              <p className="max-w-4xl whitespace-pre-wrap text-base text-[var(--text-secondary)]">
                {outcome.goalDescription ||
                  "Noch keine Beschreibung. Das Ziel bleibt bewusst leichtgewichtig."}
              </p>
              {outcome.goalWhy && (
                <p className="max-w-4xl whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold">Warum:</span>{" "}
                  {outcome.goalWhy}
                </p>
              )}
              <p className="text-sm text-[var(--text-muted)]">
                {outcome.goalHorizon
                  ? `Horizont: ${outcome.goalHorizon}`
                  : "Horizont offen"}
                {outcome.targetDate
                  ? ` · Zieltermin ${outcome.targetDate}`
                  : ""}
              </p>
            </div>
          )}
          {archived && (
            <p role="status" className="text-sm text-[var(--text-secondary)]">
              Dieses archivierte Ziel ist schreibgeschützt. Verlauf und Belege
              bleiben sichtbar.
            </p>
          )}
        </header>

        <Panel id="naechster-schritt" title="Nächster Schritt">
          <div className="grid gap-2">
            <p className="text-base font-semibold">{outcome.nextStep.title}</p>
            <p className="text-sm text-[var(--text-muted)]">
              {outcome.nextStep.reason}
            </p>
            {outcome.nextStep.href && (
              <Link
                className="text-sm text-[var(--accent-cyan)]"
                href={outcome.nextStep.href}
              >
                Kontext öffnen
              </Link>
            )}
            {canManage && (
              <div className="flex flex-wrap gap-3 border-t border-[var(--border-subtle)] pt-3">
                <Link
                  className="text-sm text-[var(--accent-cyan)]"
                  href={`/tasks/new?goal=${goalId}`}
                >
                  Task aus Ziel erstellen
                </Link>
                <Link
                  className="text-sm text-[var(--accent-cyan)]"
                  href={`/projects/new?goal=${goalId}`}
                >
                  Project aus Ziel erstellen
                </Link>
              </div>
            )}
          </div>
        </Panel>

        <ManagementDisclosureGroup className="grid gap-6">
          <Panel id="weg-zum-ziel" title="Weg zum Ziel">
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
                      (activeMilestone) => activeMilestone.id === milestone.id,
                    )}
                    activeCount={activeMilestones.length}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Noch keine Etappe definiert.
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
          </Panel>

          <Panel id="erfolg-erkennen" title="Erfolg erkennen">
            <p className="text-sm text-[var(--text-muted)]">
              Erfolgskriterien machen die bewusste Review-Entscheidung
              verständlich. Ein Ziel erreicht sich nicht automatisch.
            </p>
            <div className="grid gap-2 text-sm text-[var(--text-secondary)] md:grid-cols-3">
              <p>
                {outcome.summary.metCriteriaCount} von{" "}
                {outcome.summary.activeCriteriaCount} Kriterien erfüllt
              </p>
              <p>{outcome.summary.deferredCriteriaCount} später zu prüfen</p>
              <p>
                {outcome.summary.achievedMilestoneCount} von{" "}
                {outcome.summary.activeMilestoneCount} Etappen erreicht
              </p>
            </div>
            {outcome.goalStatus !== "achieved" &&
              outcome.summary.blockers.length > 0 && (
                <ul
                  className="grid gap-1 text-sm text-[var(--accent-orange)]"
                  aria-label="Achievement-Blocker"
                >
                  {outcome.summary.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
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
              <p className="text-sm text-[var(--text-muted)]">
                Noch kein aktives Erfolgskriterium. Mindestens eines ist für
                eine Zielerreichung erforderlich.
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
          </Panel>

          <Panel id="goal-review" title="Goal Review">
            {outcome.goalStatus === "achieved" ? (
              <div className="grid gap-3">
                <p className="text-base font-semibold text-[var(--accent-cyan)]">
                  Zielergebnis erreicht
                  {outcome.achievedAt
                    ? ` am ${outcome.achievedAt.slice(0, 10)}`
                    : ""}
                  .
                </p>
                {outcome.achievementNote && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    {outcome.achievementNote}
                  </p>
                )}
                <p className="text-sm text-[var(--text-secondary)]">
                  Die Ansicht zeigt die akzeptierte Kriterien- und Etappenbasis
                  des Ergebnisses; ein erneutes Öffnen bleibt eine bewusste
                  Entscheidung.
                </p>
                {latestAchievement && (
                  <p className="text-sm text-[var(--text-muted)]">
                    Basis: {latestAchievement.criterionBasis.length} Kriterien ·{" "}
                    {latestAchievement.milestoneBasis.length} Etappen ·{" "}
                    {latestAchievement.evidence.length} aktive Belege
                  </p>
                )}
                {!archived && latestAchievement && (
                  <ManagementDisclosure label="Outcome verwalten">
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
              <div className="grid gap-3">
                <p className="text-sm font-semibold" data-goal-readiness>
                  Review-Bereitschaft:{" "}
                  {outcome.summary.readyToAchieve ? "bereit" : "offen"}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {outcome.summary.readyToAchieve
                    ? "Die Voraussetzungen sind erfüllt. Die Zielerreichung bleibt eine bewusste Review-Entscheidung."
                    : "Das Ziel ist noch nicht bereit für die Erreichung."}
                </p>
                <ul className="grid gap-1 text-sm text-[var(--text-muted)]">
                  <li>
                    Aktive Kriterien: {outcome.summary.activeCriteriaCount};
                    erfüllt: {outcome.summary.metCriteriaCount}.
                  </li>
                  <li>
                    Nicht archivierte Etappen:{" "}
                    {outcome.summary.activeMilestoneCount}; erreicht:{" "}
                    {outcome.summary.achievedMilestoneCount}.
                  </li>
                  <li>
                    Die Entscheidung speichert die exakte aktuelle Erfolgsbasis
                    als unveränderliche Historie.
                  </li>
                </ul>
                {canManage && (
                  <ManagementDisclosure label="Review verwalten">
                    <OperationForm
                      operation="achieve"
                      label="Ziel explizit erreichen"
                      disabled={!outcome.summary.readyToAchieve}
                      confirmMessage="Ziel als erreicht markieren? Dieser Schritt speichert die exakte aktuelle Erfolgsbasis."
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
              </div>
            )}
          </Panel>

          <Panel id="verlauf-belege" title="Verlauf & Belege">
            <p className="text-sm text-[var(--text-muted)]">
              Der Verlauf zeigt die jüngsten Goal-, Etappen- und
              Kriterienentscheidungen. Task- und Project-Abschlüsse bleiben in
              ihren eigenen Verläufen.
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
            <p className="text-xs text-[var(--text-muted)]">
              Skill Evidence ist kein Beleg für eine Goal-Entscheidung.
            </p>
          </Panel>

          {canManage && (
            <Panel title="Weitere Verwaltung">
              <div className="grid gap-3">
                <ManagementDisclosure label="Ziel bearbeiten">
                  {edit}
                </ManagementDisclosure>
                <ManagementDisclosure label="Support-Kontext verwalten">
                  <p className="text-sm text-[var(--text-muted)]">
                    Support verbindet bestehenden Kontext mit einer Etappe; er
                    erfüllt kein Erfolgskriterium automatisch.
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
                        label="Project verknüpfen"
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
                          label="Project"
                          name="projectId"
                          options={eligibleProjects}
                          required
                        />
                      </OperationForm>
                    )}
                  {activeMilestones.length > 0 && eligibleTasks.length > 0 && (
                    <OperationForm
                      operation="support.task.add"
                      label="Task verknüpfen"
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
                        label="Task"
                        name="taskId"
                        options={eligibleTasks}
                        required
                      />
                    </OperationForm>
                  )}
                  {eligibleProjects.length === 0 &&
                    eligibleTasks.length === 0 && (
                      <p className="text-sm text-[var(--text-muted)]">
                        Keine passenden aktiven Project-/Task-Kontexte
                        verfügbar.
                      </p>
                    )}
                </ManagementDisclosure>
                <ManagementDisclosure label="Lifecycle verwalten">
                  <OperationForm
                    operation="goal.archive"
                    label="Ziel archivieren"
                    closeOnSuccess
                  >
                    <Hidden name="goalId" value={goalId} />
                  </OperationForm>
                </ManagementDisclosure>
              </div>
            </Panel>
          )}
        </ManagementDisclosureGroup>
      </div>
    </EntityWorkbenchShell>
  );
}
