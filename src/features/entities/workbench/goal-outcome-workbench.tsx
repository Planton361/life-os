import type { ReactNode } from "react";
import {
  criterionEvaluationState,
  type GoalOutcome,
  type GoalOutcomeCriterion,
} from "@/features/real-data/domain/goal-outcome";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import {
  OperationForm,
  Choice,
  fieldClass,
} from "./forms";
import type { Option } from "./types";
import { EntityWorkbenchShell } from "./pages";

function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={`${title}-heading`}
      className="grid content-start gap-4 rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,36,.6)] p-5"
    >
      <h2 id={`${title}-heading`} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function statusLabel(status: string) {
  if (status === "met") return "erfüllt";
  if (status === "not_met") return "nicht erfüllt";
  return "unbewertet";
}

function criterionDescription(criterion: GoalOutcomeCriterion) {
  if (criterion.criterionType === "boolean") return "Boolean · true/false";
  return `${criterion.direction} ${criterion.target} ${criterion.unit}`;
}

function milestoneOptions(outcome: GoalOutcome): Option[] {
  return outcome.milestones
    .filter((milestone) => !milestone.archivedAt)
    .map((milestone) => ({ id: milestone.id, title: milestone.title }));
}

function SupportSelect({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Option[];
}) {
  return <Choice label={label} name={name} options={options} required />;
}

function CriterionRow({
  criterion,
  goalId,
  milestoneTitles,
}: {
  criterion: GoalOutcomeCriterion;
  goalId: string;
  milestoneTitles: ReadonlyMap<string, string>;
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
              ? ` · ${milestoneTitles.get(criterion.goalMilestoneId) ?? "Milestone"}`
              : " · Goal-weit"}
          </p>
        </div>
        <span className="rounded-full border border-[var(--border-default)] px-2 py-1 text-xs">
          {statusLabel(state)}
        </span>
      </div>
      {criterion.latestEvaluation && (
        <p className="text-sm text-[var(--text-secondary)]">
          Letzte Bewertung: {criterion.criterionType === "boolean"
            ? criterion.latestEvaluation.booleanValue
              ? "true"
              : "false"
            : `${criterion.latestEvaluation.numericValue} ${criterion.latestEvaluation.unit}`}
          {criterion.latestEvaluation.note
            ? ` · ${criterion.latestEvaluation.note}`
            : ""}
        </p>
      )}
      <OperationForm operation="criterion.evaluate" label="Bewertung speichern">
        <Hidden name="goalId" value={goalId} />
        <Hidden name="criterionId" value={criterion.id} />
        <Hidden name="criterionType" value={criterion.criterionType} />
        {criterion.criterionType === "boolean" ? (
          <Choice
            name="booleanValue"
            label="Wert"
            options={[
              { id: "true", title: "true · erfüllt" },
              { id: "false", title: "false · nicht erfüllt" },
            ]}
            required
          />
        ) : (
          <>
            <label className="grid gap-1 text-sm">
              Aktueller Wert
              <input
                className={fieldClass}
                name="numericValue"
                type="number"
                step="any"
                required
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
      {criterion.evaluations.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-[var(--text-muted)]">
            Verlauf anzeigen ({criterion.evaluations.length})
          </summary>
          <ul className="mt-2 grid gap-2 text-[var(--text-secondary)]">
            {criterion.evaluations.map((evaluation) => (
              <li key={evaluation.id}>
                {new Date(evaluation.evaluatedAt).toLocaleString("de-DE")} ·{" "}
                {criterion.criterionType === "boolean"
                  ? evaluation.booleanValue
                    ? "true"
                    : "false"
                  : `${evaluation.numericValue} ${evaluation.unit}`}
                {evaluation.note ? ` · ${evaluation.note}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
      <OperationForm operation="criterion.archive" label="Kriterium archivieren">
        <Hidden name="goalId" value={goalId} />
        <Hidden name="criterionId" value={criterion.id} />
      </OperationForm>
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
  const activeCriteria = outcome.criteria.filter((criterion) => !criterion.archivedAt);
  const projectSupportIds = new Set(outcome.projectSupport.map((link) => link.targetId));
  const taskSupportIds = new Set(outcome.taskSupport.map((link) => link.targetId));
  const readOnly = outcome.goalStatus === "archived";
  const projectById = new Map(data.projects.map((project) => [project.id, project]));
  const eligibleProjects = data.projects
    .filter((project) => !project.archived_at && project.goal_id === goalId && !projectSupportIds.has(project.id))
    .map((project) => ({ id: project.id, title: project.title }));
  const eligibleTasks = data.tasks
    .filter((task) => {
      if (task.archived_at || taskSupportIds.has(task.id)) return false;
      const inheritedGoal = task.project_id ? projectById.get(task.project_id)?.goal_id : null;
      return (task.goal_id === goalId || inheritedGoal === goalId) &&
        !(task.goal_id && inheritedGoal && task.goal_id !== inheritedGoal);
    })
    .map((task) => ({ id: task.id, title: task.title }));
  const allActiveCriteriaMet = outcome.summary.readyToAchieve;

  return (
    <EntityWorkbenchShell kind="goal" title={outcome.goalTitle}>
      <fieldset
        data-goal-outcome="workbench"
        disabled={readOnly}
        className="grid gap-6 border-0 p-0"
      >
        <header className="grid gap-2">
          <p className="text-sm text-[var(--text-muted)]">
            Goal Outcome Workbench · {outcome.goalStatus}
          </p>
          {readOnly && (
            <p role="status" className="text-sm text-[var(--text-secondary)]">
              Dieses archivierte Goal ist schreibgeschützt. Outcome-Daten bleiben
              als Historie sichtbar.
            </p>
          )}
          <p className="max-w-4xl text-sm leading-6 text-[var(--text-secondary)]">
            Outcome truth lives in typed criteria, append-only evaluations and
            explicit milestones. Legacy progress and generic percentages are
            not used here.
          </p>
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
          <Panel title="Outcome">
            <div className="grid gap-4">
              <div className="grid gap-2 text-sm text-[var(--text-secondary)] md:grid-cols-3">
                <p>Criteria: {outcome.summary.metCriteriaCount} / {outcome.summary.activeCriteriaCount} erfüllt</p>
                <p>Milestones: {outcome.summary.achievedMilestoneCount} / {outcome.summary.activeMilestoneCount} erreicht</p>
                <p>Readiness: {allActiveCriteriaMet ? "bereit" : "blockiert"}</p>
              </div>
              {outcome.summary.blockers.length > 0 && (
                <ul className="grid gap-1 text-sm text-[var(--accent-orange)]" aria-label="Achievement-Blocker">
                  {outcome.summary.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                </ul>
              )}
              {outcome.goalStatus === "achieved" && (
                <OperationForm operation="reopen" label="Goal wieder öffnen">
                  <Hidden name="goalId" value={goalId} />
                </OperationForm>
              )}
              {outcome.goalStatus !== "achieved" && !readOnly && (
                <OperationForm
                  operation="achieve"
                  label="Goal explizit erreichen"
                  disabled={!allActiveCriteriaMet}
                  confirmMessage="Goal als erreicht markieren? Dieser Schritt setzt den Goal-Lifecycle explizit auf achieved."
                >
                  <Hidden name="goalId" value={goalId} />
                  <label className="grid gap-1 text-sm">
                    Achievement-Notiz (optional)
                    <input className={fieldClass} name="note" />
                  </label>
                </OperationForm>
              )}
            </div>
          </Panel>

          <Panel title="Informationen bearbeiten">
            {edit}
          </Panel>
        </div>

        <Panel title="Criteria & Evaluation">
          <p className="text-sm text-[var(--text-muted)]">
            Boolean-Kriterien werden mit true/false bewertet. Numeric-Kriterien
            behalten Ziel, Richtung und Einheit unverändert; jede Bewertung
            bleibt im Verlauf erhalten.
          </p>
          {activeCriteria.length > 0 ? (
            <div className="grid gap-5">
              {activeCriteria.map((criterion) => (
                <CriterionRow
                  criterion={criterion}
                  goalId={goalId}
                  key={criterion.id}
                  milestoneTitles={milestoneTitles}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Noch keine aktiven Kriterien.</p>
          )}
          {!readOnly && <details className="rounded-lg border border-[var(--border-subtle)] p-4">
            <summary className="cursor-pointer font-semibold">Kriterium definieren</summary>
            <OperationForm operation="criterion.create" label="Kriterium erstellen">
              <Hidden name="goalId" value={goalId} />
              <label className="grid gap-1 text-sm">
                Titel
                <input className={fieldClass} name="title" required />
              </label>
              <Choice
                name="criterionType"
                label="Typ"
                options={[
                  { id: "boolean", title: "Boolean" },
                  { id: "numeric", title: "Numeric" },
                ]}
                required
              />
              <SupportSelect
                label="Milestone (optional)"
                name="goalMilestoneId"
                options={milestoneOptions(outcome)}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  Einheit (numeric)
                  <input className={fieldClass} name="unit" placeholder="z. B. Stunden" />
                </label>
                <label className="grid gap-1 text-sm">
                  Ziel (numeric)
                  <input className={fieldClass} name="target" type="number" step="any" />
                </label>
                <Choice
                  name="direction"
                  label="Richtung (numeric)"
                  options={[
                    { id: "at_least", title: "at least" },
                    { id: "at_most", title: "at most" },
                    { id: "exact", title: "exact" },
                  ]}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Boolean-Kriterien lassen Numeric-Felder leer. Numeric-Ziele dürfen
                null, negativ oder dezimal sein, aber nicht unendlich.
              </p>
            </OperationForm>
          </details>}
        </Panel>

        <Panel title="Milestones">
          <p className="text-sm text-[var(--text-muted)]">
            Milestones sind Goal-spezifisch. Mehrere aktive Milestones sind
            möglich; die Reihenfolge ist reine Darstellung und erzeugt keine
            Abhängigkeit.
          </p>
          <div className="grid gap-5">
            {outcome.milestones.map((milestone, index) => (
              <article
                className="grid gap-3 border-t border-[var(--border-subtle)] pt-4"
                data-goal-milestone-id={milestone.id}
                key={milestone.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{milestone.title}</h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      {milestone.status}
                      {milestone.targetDate ? ` · Ziel ${milestone.targetDate}` : ""}
                      {milestone.archivedAt ? " · archiviert" : ""}
                    </p>
                  </div>
                  {!milestone.archivedAt && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <OperationForm operation="milestone.status" label="Aktivieren" disabled={milestone.status === "active" || milestone.status === "achieved"}>
                        <Hidden name="goalId" value={goalId} />
                        <Hidden name="milestoneId" value={milestone.id} />
                        <Hidden name="status" value="active" />
                      </OperationForm>
                      <OperationForm operation="milestone.status" label="Erreicht" disabled={milestone.status === "achieved"}>
                        <Hidden name="goalId" value={goalId} />
                        <Hidden name="milestoneId" value={milestone.id} />
                        <Hidden name="status" value="achieved" />
                      </OperationForm>
                    </div>
                  )}
                </div>
                {milestone.description && <p className="text-sm text-[var(--text-secondary)]">{milestone.description}</p>}
                {!milestone.archivedAt && (
                  <>
                    <OperationForm operation="milestone.update" label="Milestone speichern">
                      <Hidden name="goalId" value={goalId} />
                      <Hidden name="milestoneId" value={milestone.id} />
                      <label className="grid gap-1 text-sm">Titel<input className={fieldClass} name="title" defaultValue={milestone.title} required /></label>
                      <label className="grid gap-1 text-sm">Beschreibung<textarea className={fieldClass} name="description" defaultValue={milestone.description ?? ""} rows={3} /></label>
                      <label className="grid gap-1 text-sm">Zieldatum<input className={fieldClass} name="targetDate" type="date" defaultValue={milestone.targetDate ?? ""} /></label>
                    </OperationForm>
                    <div className="flex flex-wrap gap-3">
                      <OperationForm operation="milestone.reorder" label="Nach oben" disabled={index === 0}>
                        <Hidden name="goalId" value={goalId} /><Hidden name="milestoneId" value={milestone.id} /><Hidden name="direction" value="up" />
                      </OperationForm>
                      <OperationForm operation="milestone.reorder" label="Nach unten" disabled={index === activeMilestones.length - 1}>
                        <Hidden name="goalId" value={goalId} /><Hidden name="milestoneId" value={milestone.id} /><Hidden name="direction" value="down" />
                      </OperationForm>
                      <OperationForm operation="milestone.archive" label="Milestone archivieren">
                        <Hidden name="goalId" value={goalId} /><Hidden name="milestoneId" value={milestone.id} />
                      </OperationForm>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
          {!readOnly && <details className="rounded-lg border border-[var(--border-subtle)] p-4">
            <summary className="cursor-pointer font-semibold">Milestone definieren</summary>
            <OperationForm operation="milestone.create" label="Milestone erstellen">
              <Hidden name="goalId" value={goalId} />
              <label className="grid gap-1 text-sm">Titel<input className={fieldClass} name="title" required /></label>
              <label className="grid gap-1 text-sm">Beschreibung<textarea className={fieldClass} name="description" rows={3} /></label>
              <label className="grid gap-1 text-sm">Zieldatum<input className={fieldClass} name="targetDate" type="date" /></label>
              <Choice name="status" label="Startstatus" options={[{ id: "planned", title: "planned" }, { id: "active", title: "active" }]} required />
              <Hidden name="sortOrder" value={String(outcome.milestones.length)} />
            </OperationForm>
          </details>}
        </Panel>

        <Panel title="Support-Kontext">
          <p className="text-sm text-[var(--text-muted)]">
            Projects und Tasks geben Kontext zu einem Milestone. Sie erfüllen
            kein Kriterium und erreichen das Goal nicht automatisch.
          </p>
          <div className="grid gap-4">
            {[...outcome.projectSupport, ...outcome.taskSupport].map((link) => (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3" key={link.id}>
                <p className="text-sm">
                  {link.targetTitle} · {link.goalMilestoneId ? milestoneTitles.get(link.goalMilestoneId) : "Milestone"}
                </p>
                <OperationForm operation={outcome.projectSupport.some((item) => item.id === link.id) ? "support.project.remove" : "support.task.remove"} label="Support lösen">
                  <Hidden name="goalId" value={goalId} /><Hidden name="supportId" value={link.id} />
                </OperationForm>
              </div>
            ))}
          </div>
          {!readOnly && activeMilestones.length > 0 && eligibleProjects.length > 0 && (
            <OperationForm operation="support.project.add" label="Project verknüpfen">
              <Hidden name="goalId" value={goalId} />
              <SupportSelect label="Milestone" name="goalMilestoneId" options={milestoneOptions(outcome)} />
              <SupportSelect label="Project" name="projectId" options={eligibleProjects} />
            </OperationForm>
          )}
          {!readOnly && activeMilestones.length > 0 && eligibleTasks.length > 0 && (
            <OperationForm operation="support.task.add" label="Task verknüpfen">
              <Hidden name="goalId" value={goalId} />
              <SupportSelect label="Milestone" name="goalMilestoneId" options={milestoneOptions(outcome)} />
              <SupportSelect label="Task" name="taskId" options={eligibleTasks} />
            </OperationForm>
          )}
          {!readOnly && eligibleProjects.length === 0 && eligibleTasks.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">Keine passenden aktiven Project-/Task-Kontexte verfügbar.</p>
          )}
        </Panel>

        <Panel title="Lifecycle">
          {outcome.goalStatus === "achieved" ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Erreicht{outcome.achievedAt ? ` am ${outcome.achievedAt.slice(0, 10)}` : ""}.
              {outcome.achievementNote ? ` ${outcome.achievementNote}` : ""}
            </p>
          ) : readOnly ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Archiviert · keine weiteren Lifecycle-Änderungen.
            </p>
          ) : (
            <OperationForm operation="goal.archive" label="Goal archivieren">
              <Hidden name="goalId" value={goalId} />
            </OperationForm>
          )}
        </Panel>
      </fieldset>
    </EntityWorkbenchShell>
  );
}
