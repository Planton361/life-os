import Link from "next/link";
import type { ReactNode } from "react";
import {
  criterionEvaluationState,
  type GoalAchievementCriterionBasis,
  type GoalAchievementMilestoneBasis,
  type GoalEvidenceReference,
  type GoalOutcome,
  type GoalOutcomeCriterion,
  type GoalMilestone,
} from "@/features/real-data/domain/goal-outcome";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import { EntityWorkbenchShell } from "./pages";
import { Choice, fieldClass, OperationForm } from "./forms";

function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

function Panel({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id ?? title}-heading`} className="grid content-start gap-4 rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,36,.6)] p-5">
      <h2 id={`${id ?? title}-heading`} className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function statusLabel(status: string) {
  if (status === "met") return "erfüllt";
  if (status === "not_met") return "nicht erfüllt";
  if (status === "deferred") return "Später prüfen";
  return "Noch nicht geprüft";
}

function milestoneStatusLabel(status: string) {
  if (status === "achieved") return "erreicht";
  if (status === "active") return "aktiv";
  if (status === "planned") return "geplant";
  return "archiviert";
}

function criterionDescription(criterion: GoalOutcomeCriterion) {
  if (criterion.criterionType === "boolean") return "Ja/Nein · explizite Entscheidung erforderlich";
  const direction = criterion.direction === "at_least" ? "mindestens" : criterion.direction === "at_most" ? "höchstens" : "genau";
  return `${direction} ${criterion.target} ${criterion.unit} · ${criterion.direction} ${criterion.target} ${criterion.unit}`;
}

function milestoneOptions(outcome: GoalOutcome) {
  return outcome.milestones.filter((milestone) => !milestone.archivedAt).map((milestone) => ({ id: milestone.id, title: milestone.title }));
}

function sourceOptions(data: WorkbenchData, outcome: GoalOutcome, allowed: readonly string[]) {
  const options: { id: string; title: string }[] = [];
  if (allowed.includes("task")) for (const task of outcome.tasks.filter((item) => !item.archivedAt)) options.push({ id: `task:${task.id}`, title: `Task · ${task.title}` });
  if (allowed.includes("project")) for (const project of outcome.projects.filter((item) => !item.archivedAt)) options.push({ id: `project:${project.id}`, title: `Project · ${project.title}` });
  if (allowed.includes("project_milestone")) for (const milestone of data.milestones.filter((item) => !item.archived_at)) options.push({ id: `project_milestone:${milestone.id}`, title: `Project-Milestone · ${milestone.title}` });
  if (allowed.includes("resource")) for (const resource of data.resources.filter((item) => !item.archived_at)) options.push({ id: `resource:${resource.id}`, title: `Resource · ${resource.title}` });
  if (allowed.includes("review_record")) for (const review of data.reviewRecords.filter((item) => !item.archived_at)) options.push({ id: `review_record:${review.id}`, title: `Review · ${review.kind} · ${review.period_start}` });
  if (allowed.includes("goal_criterion_evaluation")) for (const criterion of outcome.criteria) for (const evaluation of criterion.evaluations) options.push({ id: `goal_criterion_evaluation:${evaluation.id}`, title: `Kriterium · ${criterion.title} · ${evaluation.id.slice(0, 8)}` });
  return options;
}

function EvidenceFields({ data, outcome, allowed }: { data: WorkbenchData; outcome: GoalOutcome; allowed: readonly string[] }) {
  const options = sourceOptions(data, outcome, allowed);
  return options.length > 0 ? <Choice name="sourceReference" label="Entscheidungsbeleg (optional)" options={options} /> : <p className="text-xs text-[var(--text-muted)]">Noch keine zulässige aktive Belegquelle vorhanden.</p>;
}

function latestEvaluationText(criterion: GoalOutcomeCriterion) {
  const evaluation = criterion.latestEvaluation;
  if (!evaluation) return "Noch nicht geprüft.";
  if (evaluation.retracted) return "Bewertung zurückgenommen · Entscheidung wieder offen.";
  if (evaluation.deferred) return "deferred · Später prüfen · noch keine Entscheidung.";
  if (criterion.criterionType === "boolean") return evaluation.booleanValue ? "true · Ja · erfüllt." : "false · Nein · noch nicht erfüllt.";
  return `${evaluation.numericValue} ${evaluation.unit ?? criterion.unit ?? ""}`;
}

function evidenceLabel(evidence: readonly GoalEvidenceReference[]) {
  return evidence
    .map((reference) => `${reference.action === "withdrawn" ? "zurückgenommen: " : ""}${reference.sourceTitle}`)
    .join(", ");
}

function criterionBasisLabel(basis: GoalAchievementCriterionBasis) {
  const target = basis.targetSnapshot === null
    ? ""
    : ` · ${basis.directionSnapshot ?? "Ziel"} ${basis.targetSnapshot}${basis.unitSnapshot ? ` ${basis.unitSnapshot}` : ""}`;
  return `${basis.criterionTitleSnapshot ?? "Kriterium"} · ${basis.evaluationStateSnapshot ?? "unbekannt"}${target}`;
}

function milestoneBasisLabel(basis: GoalAchievementMilestoneBasis) {
  return `${basis.milestoneTitleSnapshot ?? "Etappe"} · ${basis.resultingStatusSnapshot ?? "Status unbekannt"}${basis.achievementEpisodeId ? ` · Episode ${basis.achievementEpisodeId.slice(0, 8)}` : ""}`;
}

function CriterionRow({ criterion, data, goalId, outcome, milestoneTitles, readOnly }: { criterion: GoalOutcomeCriterion; data: WorkbenchData; goalId: string; outcome: GoalOutcome; milestoneTitles: ReadonlyMap<string, string>; readOnly: boolean }) {
  const state = criterionEvaluationState(criterion, criterion.latestEvaluation);
  return (
    <article className="grid gap-3 border-t border-[var(--border-subtle)] pt-4" data-goal-criterion-id={criterion.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-semibold">{criterion.title}</h3><p className="text-sm text-[var(--text-muted)]">{criterionDescription(criterion)}{criterion.goalMilestoneId ? ` · ${milestoneTitles.get(criterion.goalMilestoneId) ?? "Etappe"}` : " · Goal-weit"}</p></div>
        <span className="rounded-full border border-[var(--border-default)] px-2 py-1 text-xs">{statusLabel(state)}</span>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">Letzte Bewertung: {latestEvaluationText(criterion)}{criterion.latestEvaluation?.note ? ` · ${criterion.latestEvaluation.note}` : ""}</p>
      {!readOnly && <OperationForm operation="criterion.evaluate" label="Bewertung speichern">
        <Hidden name="goalId" value={goalId} /><Hidden name="criterionId" value={criterion.id} /><Hidden name="criterionType" value={criterion.criterionType} /><Hidden name="expectedLatestEvaluationId" value={criterion.latestEvaluation?.id ?? ""} />
        <Choice name="evaluationState" label="Bewertungsstatus" options={[{ id: "value", title: "Wert bewerten" }, { id: "deferred", title: "Später prüfen" }]} required />
        {criterion.criterionType === "boolean" ? <Choice name="booleanValue" label="Wert" options={[{ id: "true", title: "true · Ja / erfüllt" }, { id: "false", title: "false · Nein / nicht erfüllt" }]} /> : <><label className="grid gap-1 text-sm">Aktueller Wert<input className={fieldClass} name="numericValue" type="number" step="any" /></label><input type="hidden" name="unit" value={criterion.unit ?? ""} /><p className="text-sm text-[var(--text-muted)]">Einheit: {criterion.unit}</p></>}
        <label className="grid gap-1 text-sm">Notiz (optional)<input className={fieldClass} name="note" /></label>
        <p className="text-xs text-[var(--text-muted)]">Jede Bewertung bleibt unveränderlich im Verlauf. Korrekturen erzeugen eine neue Revision; Zurücknehmen macht die Entscheidung wieder offen.</p>
      </OperationForm>}
      {criterion.latestEvaluation && !readOnly && <OperationForm operation="criterion.evidence" label="Beleg an Bewertung hängen"><Hidden name="goalId" value={goalId} /><Hidden name="evaluationId" value={criterion.latestEvaluation.id} /><EvidenceFields data={data} outcome={outcome} allowed={["task", "project", "project_milestone", "resource", "review_record"]} /><label className="grid gap-1 text-sm">Belegnotiz (optional)<input className={fieldClass} name="referenceReason" /></label></OperationForm>}
      {criterion.evaluations.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-[var(--text-muted)]">Verlauf anzeigen ({criterion.evaluations.length})</summary><ul className="mt-2 grid gap-2 text-[var(--text-secondary)]">{criterion.evaluations.map((evaluation) => <li key={evaluation.id}>{new Date(evaluation.evaluatedAt).toLocaleString("de-DE")} · {evaluation.revisionKind ?? "evaluation"} · {evaluation.retracted ? "zurückgenommen" : evaluation.deferred ? "Später prüfen" : criterion.criterionType === "boolean" ? evaluation.booleanValue ? "Ja" : "Nein" : `${evaluation.numericValue} ${evaluation.unit ?? ""}`}{evaluation.correctionReason ? ` · ${evaluation.correctionReason}` : ""}{evaluation.evidence && evaluation.evidence.length > 0 ? ` · ${evaluation.evidence.length} Beleg(e): ${evidenceLabel(evaluation.evidence)}` : ""}</li>)}</ul></details>}
      {!readOnly && criterion.latestEvaluation && <div className="flex flex-wrap gap-3">
        <OperationForm operation="criterion.correct" label="Letzte Bewertung korrigieren"><Hidden name="goalId" value={goalId} /><Hidden name="criterionId" value={criterion.id} /><Hidden name="criterionType" value={criterion.criterionType} /><Hidden name="expectedLatestEvaluationId" value={criterion.latestEvaluation.id} />{criterion.criterionType === "boolean" ? <Choice name="booleanValue" label="Korrekturwert" options={[{ id: "true", title: "true · Ja" }, { id: "false", title: "false · Nein" }]} required /> : <><label className="grid gap-1 text-sm">Korrekturwert<input className={fieldClass} name="numericValue" type="number" step="any" required /></label><input type="hidden" name="unit" value={criterion.unit ?? ""} /></>}<label className="grid gap-1 text-sm">Korrekturgrund<input className={fieldClass} name="correctionReason" required /></label></OperationForm>
        <OperationForm operation="criterion.retract" label="Bewertung zurücknehmen"><Hidden name="goalId" value={goalId} /><Hidden name="criterionId" value={criterion.id} /><Hidden name="criterionType" value={criterion.criterionType} /><Hidden name="expectedLatestEvaluationId" value={criterion.latestEvaluation.id} /><label className="grid gap-1 text-sm">Grund<input className={fieldClass} name="correctionReason" required /></label></OperationForm>
      </div>}
      {!readOnly && <OperationForm operation="criterion.archive" label="Kriterium archivieren"><Hidden name="goalId" value={goalId} /><Hidden name="criterionId" value={criterion.id} /></OperationForm>}
    </article>
  );
}

function MilestoneCard({ data, goalId, milestone, outcome, milestoneTitles, projectById, taskById, readOnly, index, activeCount }: { data: WorkbenchData; goalId: string; milestone: GoalMilestone; outcome: GoalOutcome; milestoneTitles: ReadonlyMap<string, string>; projectById: ReadonlyMap<string, { id: string; title: string }>; taskById: ReadonlyMap<string, { id: string; title: string }>; readOnly: boolean; index: number; activeCount: number }) {
  const projectLinks = outcome.projectSupport.filter((link) => link.goalMilestoneId === milestone.id);
  const taskLinks = outcome.taskSupport.filter((link) => link.goalMilestoneId === milestone.id);
  const event = outcome.milestoneHistory.find((candidate) => candidate.milestoneId === milestone.id && candidate.eventType === "achieved" && candidate.resultingStatus === "achieved");
  return (
    <article className="grid gap-3 border-t border-[var(--border-subtle)] pt-4" data-goal-milestone-id={milestone.id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{milestone.title}</h3><p className="text-sm text-[var(--text-muted)]">{milestoneStatusLabel(milestone.status)} · {milestone.status}{milestone.targetDate ? ` · Ziel ${milestone.targetDate}` : ""}{milestone.archivedAt ? " · archiviert" : ""}</p></div>{!milestone.archivedAt && <div className="flex flex-wrap gap-2 text-xs">
        <OperationForm operation="milestone.status" label={milestone.status === "achieved" ? "Wieder aktivieren" : "Aktivieren"} disabled={milestone.status === "active"}><Hidden name="goalId" value={goalId} /><Hidden name="milestoneId" value={milestone.id} /><Hidden name="status" value="active" /><Hidden name="expectedUpdatedAt" value={milestone.updatedAt} /></OperationForm>
        <OperationForm operation="milestone.status" label="Planen" disabled={milestone.status !== "active"}><Hidden name="goalId" value={goalId} /><Hidden name="milestoneId" value={milestone.id} /><Hidden name="status" value="planned" /></OperationForm>
        <OperationForm operation="milestone.status" label="Erreicht" disabled={milestone.status !== "active"}><Hidden name="goalId" value={goalId} /><Hidden name="milestoneId" value={milestone.id} /><Hidden name="status" value="achieved" /><Hidden name="expectedUpdatedAt" value={milestone.updatedAt} /><label className="grid gap-1 text-sm">Notiz (optional)<input className={fieldClass} name="note" /></label></OperationForm>
      </div>}</div>
      {milestone.description && <p className="text-sm text-[var(--text-secondary)]">{milestone.description}</p>}
      <div className="grid gap-2 text-sm"><p className="font-semibold">Kanonischer Kontext</p>{projectLinks.length > 0 || taskLinks.length > 0 ? <ul className="grid gap-1 text-[var(--text-secondary)]">{projectLinks.map((link) => <li key={link.id}><Link className="text-[var(--accent-cyan)]" href={`/projects/${link.targetId}`}>Project · {projectById.get(link.targetId)?.title ?? link.targetTitle}</Link></li>)}{taskLinks.map((link) => <li key={link.id}><Link className="text-[var(--accent-cyan)]" href={`/tasks/${link.targetId}`}>Task · {taskById.get(link.targetId)?.title ?? link.targetTitle}</Link></li>)}</ul> : <p className="text-[var(--text-muted)]">Noch kein Project- oder Task-Kontext.</p>}</div>
      {!milestone.archivedAt && <div className="flex flex-wrap gap-3"><Link className="text-sm text-[var(--accent-cyan)]" href={`/projects/new?goal=${goalId}&goalMilestone=${milestone.id}`}>Project aus Etappe erstellen</Link><Link className="text-sm text-[var(--accent-cyan)]" href={`/tasks/new?goal=${goalId}&goalMilestone=${milestone.id}`}>Task aus Etappe erstellen</Link></div>}
      {event && !readOnly && !milestone.archivedAt && milestone.status === "achieved" && <OperationForm operation="milestone.evidence" label="Beleg an Etappenentscheidung hängen"><Hidden name="goalId" value={goalId} /><Hidden name="milestoneId" value={milestone.id} /><EvidenceFields data={data} outcome={outcome} allowed={["goal_criterion_evaluation", "project", "project_milestone", "task", "resource", "review_record"]} /><label className="grid gap-1 text-sm">Belegnotiz (optional)<input className={fieldClass} name="referenceReason" /></label></OperationForm>}
      {!milestone.archivedAt && <><OperationForm operation="milestone.update" label="Milestone speichern"><Hidden name="goalId" value={goalId} /><Hidden name="milestoneId" value={milestone.id} /><label className="grid gap-1 text-sm">Titel<input className={fieldClass} name="title" defaultValue={milestone.title} required /></label><label className="grid gap-1 text-sm">Beschreibung<textarea className={fieldClass} name="description" defaultValue={milestone.description ?? ""} rows={3} /></label><label className="grid gap-1 text-sm">Zieldatum<input className={fieldClass} name="targetDate" type="date" defaultValue={milestone.targetDate ?? ""} /></label></OperationForm>{!readOnly && <div className="flex flex-wrap gap-3"><OperationForm operation="milestone.reorder" label="Nach oben" disabled={index === 0}><Hidden name="goalId" value={goalId} /><Hidden name="milestoneId" value={milestone.id} /><Hidden name="direction" value="up" /></OperationForm><OperationForm operation="milestone.reorder" label="Nach unten" disabled={index === activeCount - 1}><Hidden name="goalId" value={goalId} /><Hidden name="milestoneId" value={milestone.id} /><Hidden name="direction" value="down" /></OperationForm><OperationForm operation="milestone.archive" label="Milestone archivieren"><Hidden name="goalId" value={goalId} /><Hidden name="milestoneId" value={milestone.id} /></OperationForm></div>}</>}
      {milestoneTitles.size === 0 && null}
    </article>
  );
}

export function GoalOutcomeWorkbench({ data, goalId, edit, outcome }: { data: WorkbenchData; goalId: string; edit: ReactNode; outcome: GoalOutcome }) {
  const milestoneTitles = new Map(outcome.milestones.map((milestone) => [milestone.id, milestone.title]));
  const activeMilestones = outcome.milestones.filter((milestone) => !milestone.archivedAt);
  const activeCriteria = outcome.criteria.filter((criterion) => !criterion.archivedAt);
  const projectSupportIds = new Set(outcome.projectSupport.map((link) => link.targetId));
  const taskSupportIds = new Set(outcome.taskSupport.map((link) => link.targetId));
  const readOnly = outcome.goalStatus === "archived";
  const projectById = new Map(outcome.projects.map((project) => [project.id, project]));
  const taskById = new Map(outcome.tasks.map((task) => [task.id, task]));
  const eligibleProjects = outcome.projects.filter((project) => !project.archivedAt && !projectSupportIds.has(project.id)).map((project) => ({ id: project.id, title: project.title }));
  const eligibleTasks = outcome.tasks.filter((task) => !task.archivedAt && !taskSupportIds.has(task.id)).map((task) => ({ id: task.id, title: task.title }));
  return (
    <EntityWorkbenchShell kind="goal" title={outcome.goalTitle}>
      <fieldset data-goal-outcome="workbench" disabled={readOnly} className="grid gap-6 border-0 p-0">
        <header className="grid gap-3"><p className="text-sm text-[var(--text-muted)]">Goal Outcome Workbench · {outcome.goalStatus}</p><div className="grid gap-2"><p className="text-sm text-[var(--text-secondary)]">{outcome.goalDescription || "Noch keine Beschreibung. Das Goal bleibt bewusst leichtgewichtig."}</p>{outcome.goalWhy && <p className="text-sm text-[var(--text-secondary)]"><span className="font-semibold">Warum:</span> {outcome.goalWhy}</p>}<p className="text-sm text-[var(--text-muted)]">{outcome.goalHorizon ? `Horizont: ${outcome.goalHorizon}` : "Horizont offen"}{outcome.targetDate ? ` · Zieltermin ${outcome.targetDate}` : ""}{outcome.goalStatus === "achieved" && outcome.achievedAt ? ` · erreicht ${outcome.achievedAt.slice(0, 10)}` : ""}</p></div>{readOnly && <p role="status" className="text-sm text-[var(--text-secondary)]">Dieses archivierte Goal ist schreibgeschützt. Verlauf und Legacy-Marker bleiben sichtbar.</p>}<p className="max-w-4xl text-xs text-[var(--text-muted)]">Legacy progress and generic percentages are not used here.</p></header>
        <Panel id="naechster-schritt" title="Nächster Schritt"><div className="grid gap-2"><p className="text-base font-semibold">{outcome.nextStep.title}</p><p className="text-sm text-[var(--text-muted)]">{outcome.nextStep.reason}</p>{outcome.nextStep.href && <Link className="text-sm text-[var(--accent-cyan)]" href={outcome.nextStep.href}>Kontext öffnen</Link>}{!readOnly && <div className="flex flex-wrap gap-3 border-t border-[var(--border-subtle)] pt-3"><Link className="text-sm text-[var(--accent-cyan)]" href={`/tasks/new?goal=${goalId}`}>Task aus Goal erstellen</Link><Link className="text-sm text-[var(--accent-cyan)]" href={`/projects/new?goal=${goalId}`}>Project aus Goal erstellen</Link></div>}</div></Panel>
        <Panel id="weg-zum-ziel" title="Weg zum Ziel"><p className="text-sm text-[var(--text-muted)]">Etappen machen den Weg sichtbar. Ihre Reihenfolge ist Darstellung, keine automatische Planung.</p>{outcome.milestones.length > 0 ? <div className="grid gap-5">{outcome.milestones.map((milestone) => <MilestoneCard key={milestone.id} data={data} goalId={goalId} milestone={milestone} outcome={outcome} milestoneTitles={milestoneTitles} projectById={projectById} taskById={taskById} readOnly={readOnly} index={activeMilestones.findIndex((activeMilestone) => activeMilestone.id === milestone.id)} activeCount={activeMilestones.length} />)}</div> : <p className="text-sm text-[var(--text-muted)]">Noch keine Etappe definiert.</p>}{!readOnly && <details className="rounded-lg border border-[var(--border-subtle)] p-4"><summary className="cursor-pointer font-semibold">Milestone definieren</summary><OperationForm operation="milestone.create" label="Milestone erstellen"><Hidden name="goalId" value={goalId} /><label className="grid gap-1 text-sm">Titel<input className={fieldClass} name="title" required /></label><label className="grid gap-1 text-sm">Beschreibung<textarea className={fieldClass} name="description" rows={3} /></label><label className="grid gap-1 text-sm">Zieldatum<input className={fieldClass} name="targetDate" type="date" /></label><Choice name="status" label="Startstatus" options={[{ id: "planned", title: "planned" }, { id: "active", title: "active" }]} required /><Hidden name="sortOrder" value={String(outcome.milestones.length)} /></OperationForm></details>}</Panel>
        <Panel id="erfolg-erkennen" title="Erfolg erkennen · Criteria & Evaluation"><p className="text-sm text-[var(--text-muted)]">Erfolgskriterien sind menschenlesbare Aussagen. Ja/Nein-Entscheidungen und Messwerte bleiben explizit; ein Goal erreicht sich nicht automatisch.</p><div className="grid gap-2 text-sm text-[var(--text-secondary)] md:grid-cols-3"><p>{outcome.summary.metCriteriaCount} von {outcome.summary.activeCriteriaCount} Kriterien erfüllt</p><p>Deferred: {outcome.summary.deferredCriteriaCount} · {outcome.summary.deferredCriteriaCount} später zu prüfen</p><p>{outcome.summary.achievedMilestoneCount} von {outcome.summary.activeMilestoneCount} Etappen erreicht</p></div>{outcome.summary.blockers.length > 0 && <ul className="grid gap-1 text-sm text-[var(--accent-orange)]" aria-label="Achievement-Blocker">{outcome.summary.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}{activeCriteria.length > 0 ? <div className="grid gap-5">{activeCriteria.map((criterion) => <CriterionRow key={criterion.id} criterion={criterion} data={data} goalId={goalId} outcome={outcome} milestoneTitles={milestoneTitles} readOnly={readOnly} />)}</div> : <p className="text-sm text-[var(--text-muted)]">Noch kein aktives Erfolgskriterium. Mindestens eines ist für eine Goal-Erreichung erforderlich.</p>}{!readOnly && <details className="rounded-lg border border-[var(--border-subtle)] p-4"><summary className="cursor-pointer font-semibold">Kriterium definieren</summary><OperationForm operation="criterion.create" label="Kriterium erstellen"><Hidden name="goalId" value={goalId} /><label className="grid gap-1 text-sm">Titel<input className={fieldClass} name="title" required /></label><Choice name="criterionType" label="Typ" options={[{ id: "boolean", title: "Boolean / Ja-Nein" }, { id: "numeric", title: "Numeric / Messwert" }]} required /><Choice label="Milestone (optional)" name="goalMilestoneId" options={milestoneOptions(outcome)} /><div className="grid gap-3 md:grid-cols-3"><label className="grid gap-1 text-sm">Einheit (numeric)<input className={fieldClass} name="unit" placeholder="z. B. Stunden" /></label><label className="grid gap-1 text-sm">Ziel (numeric)<input className={fieldClass} name="target" type="number" step="any" /></label><Choice name="direction" label="Richtung (numeric)" options={[{ id: "at_least", title: "mindestens" }, { id: "at_most", title: "höchstens" }, { id: "exact", title: "genau" }]} /></div></OperationForm></details>}</Panel>
        <Panel id="goal-review" title="Goal Review"><p className="text-sm text-[var(--text-secondary)]">{outcome.summary.readyToAchieve ? "Die kanonische Bereitschaft ist erfüllt · Readiness: bereit. Die Erreichung bleibt eine bewusste Review-Entscheidung." : "Das Goal ist noch nicht bereit für die Erreichung · Readiness: offen."}</p><ul className="grid gap-1 text-sm text-[var(--text-muted)]"><li>Aktive Kriterien: {outcome.summary.activeCriteriaCount}; erfüllt: {outcome.summary.metCriteriaCount}.</li><li>Nicht archivierte Etappen: {outcome.summary.activeMilestoneCount}; erreicht: {outcome.summary.achievedMilestoneCount}.</li><li>Die Entscheidung speichert die exakten Criterion- und Etappen-Basen als unveränderliche Historie.</li></ul>{outcome.goalStatus === "achieved" ? <><p className="text-sm font-semibold text-[var(--accent-cyan)]">Outcome erreicht{outcome.achievedAt ? ` am ${outcome.achievedAt.slice(0, 10)}` : ""}.</p>{outcome.achievementNote && <p className="text-sm text-[var(--text-secondary)]">{outcome.achievementNote}</p>}<OperationForm operation="reopen" label="Goal wieder öffnen"><Hidden name="goalId" value={goalId} /><Hidden name="expectedUpdatedAt" value={outcome.updatedAt} /></OperationForm></> : <OperationForm operation="achieve" label="Goal explizit erreichen" disabled={!outcome.summary.readyToAchieve} confirmMessage="Goal als erreicht markieren? Dieser Schritt speichert die exakte aktuelle Erfolgsbasis."><Hidden name="goalId" value={goalId} /><Hidden name="expectedUpdatedAt" value={outcome.updatedAt} /><label className="grid gap-1 text-sm">Erfolgsnotiz (optional)<input className={fieldClass} name="note" /></label><EvidenceFields data={data} outcome={outcome} allowed={["project", "project_milestone", "task", "resource", "review_record"]} /></OperationForm>}</Panel>
        <Panel id="verlauf-belege" title="Verlauf & Belege"><p className="text-sm text-[var(--text-muted)]">Slice 1 zeigt nur Goal-, Etappen- und Kriteriumshistorie. Task- und Project-Abschluss-Episoden gehören ausdrücklich zu Slice 2.</p>{outcome.achievementHistory.length === 0 && outcome.milestoneHistory.length === 0 && activeCriteria.every((criterion) => criterion.evaluations.length === 0) ? <p className="text-sm text-[var(--text-muted)]">Noch kein Verlauf.</p> : <div className="grid gap-4">{outcome.achievementHistory.map((event) => <article className="border-t border-[var(--border-subtle)] pt-3" key={event.id}><p className="font-semibold">Goal {event.eventType === "achieved" ? "erreicht" : event.eventType === "reopened" ? "wieder geöffnet" : "korrigiert"}</p><p className="text-sm text-[var(--text-muted)]">{event.occurredAt ? new Date(event.occurredAt).toLocaleString("de-DE") : "Zeitpunkt unbekannt"} · Episode {event.episodeId.slice(0, 8)}</p>{event.legacyState && <p className="text-xs text-[var(--accent-orange)]">Legacy-Marker: ursprüngliche Basis nicht rekonstruierbar.</p>}<p className="text-sm">{event.criterionBasis.length} Kriterien-Basen · {event.milestoneBasis.length} Etappen-Basen · {event.evidence.length} Belege</p>{event.criterionBasis.length > 0 && <p className="text-sm text-[var(--text-secondary)]">Kriterium-Basis: {event.criterionBasis.map(criterionBasisLabel).join(" · ")}</p>}{event.milestoneBasis.length > 0 && <p className="text-sm text-[var(--text-secondary)]">Etappen-Basis: {event.milestoneBasis.map(milestoneBasisLabel).join(" · ")}</p>}{event.evidence.length > 0 && <p className="text-sm text-[var(--text-secondary)]">Entscheidungsbelege: {evidenceLabel(event.evidence)}</p>}</article>)}{outcome.milestoneHistory.map((event) => <article className="border-t border-[var(--border-subtle)] pt-3" key={event.id}><p className="font-semibold">Etappe {event.eventType === "achieved" ? "erreicht" : event.eventType === "reopened" ? "wieder geöffnet" : "korrigiert"}: {event.milestoneTitleSnapshot}</p><p className="text-sm text-[var(--text-muted)]">{event.occurredAt ? new Date(event.occurredAt).toLocaleString("de-DE") : "Zeitpunkt unbekannt"} · Episode {event.episodeId.slice(0, 8)} · {event.evidence.length} Belege</p>{event.evidence.length > 0 && <p className="text-sm text-[var(--text-secondary)]">Entscheidungsbelege: {evidenceLabel(event.evidence)}</p>}{event.legacyState && <p className="text-xs text-[var(--accent-orange)]">Legacy-Marker: ursprünglicher Übergang nicht rekonstruierbar.</p>}</article>)}</div>}<p className="text-xs text-[var(--text-muted)]">Skill Evidence ist in Slice 1 kein Goal-Entscheidungsbeleg.</p></Panel>
        <Panel title="Support-Kontext"><p className="text-sm text-[var(--text-muted)]">Direkt am Goal oder Project verknüpfte Tasks und Projects bleiben kanonischer Kontext. Support verknüpft einen Kontext mit einer Etappe; er erfüllt kein Kriterium automatisch.</p><div className="grid gap-4">{[...outcome.projectSupport, ...outcome.taskSupport].map((link) => <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3" key={link.id}><p className="text-sm">{link.targetTitle} · {milestoneTitles.get(link.goalMilestoneId) ?? "Etappe"}</p><OperationForm operation={outcome.projectSupport.some((item) => item.id === link.id) ? "support.project.remove" : "support.task.remove"} label="Support lösen"><Hidden name="goalId" value={goalId} /><Hidden name="supportId" value={link.id} /></OperationForm></div>)}</div>{!readOnly && activeMilestones.length > 0 && eligibleProjects.length > 0 && <OperationForm operation="support.project.add" label="Project verknüpfen"><Hidden name="goalId" value={goalId} /><Choice label="Milestone" name="goalMilestoneId" options={milestoneOptions(outcome)} required /><Choice label="Project" name="projectId" options={eligibleProjects} required /></OperationForm>}{!readOnly && activeMilestones.length > 0 && eligibleTasks.length > 0 && <OperationForm operation="support.task.add" label="Task verknüpfen"><Hidden name="goalId" value={goalId} /><Choice label="Milestone" name="goalMilestoneId" options={milestoneOptions(outcome)} required /><Choice label="Task" name="taskId" options={eligibleTasks} required /></OperationForm>}{!readOnly && eligibleProjects.length === 0 && eligibleTasks.length === 0 && <p className="text-sm text-[var(--text-muted)]">Keine passenden aktiven Project-/Task-Kontexte verfügbar.</p>}</Panel>
        <Panel title="Informationen bearbeiten">{edit}</Panel>
        <Panel title="Lifecycle">{readOnly ? <p className="text-sm text-[var(--text-secondary)]">Archiviert · keine weiteren Lifecycle-Änderungen.</p> : <OperationForm operation="goal.archive" label="Goal archivieren"><Hidden name="goalId" value={goalId} /></OperationForm>}</Panel>
      </fieldset>
    </EntityWorkbenchShell>
  );
}
