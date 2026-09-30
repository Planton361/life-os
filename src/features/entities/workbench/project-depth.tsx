"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { projectDepthAction } from "@/features/real-data/actions/project-depth.actions";
import type { ProjectDepthRead } from "@/features/real-data/supabase/repositories/project-depth-repository";
import { actionClass, fieldClass } from "./forms";
import { ManagementDialog } from "./management-disclosure";

type Depth = ProjectDepthRead;
type Command = Parameters<typeof projectDepthAction>[0];
type CommandResult = Awaited<ReturnType<typeof projectDepthAction>>;
const amendmentLabel: Record<string, string> = {
  clarification: "Klarstellung",
  evidence_withdrawn: "Beleg zurückgezogen",
  marked_mistaken: "Review irrtümlich",
};
const assessmentLabel: Record<string, string> = {
  satisfied: "erfüllt",
  not_satisfied: "nicht erfüllt",
  not_assessed: "nicht bewertet",
  excluded: "aus Scope entfernt",
};

function CriterionEvaluation({
  criterion,
}: {
  criterion: Depth["context"]["criteria"][number];
}) {
  const [assessment, setAssessment] = useState("not_assessed");
  return (
    <div className="grid gap-2 border-l border-[var(--border-subtle)] pl-3">
      <p>{criterion.text}</p>
      <label className="grid gap-1">
        Bewertung für {criterion.text}
        <select
          name={`assessment-${criterion.id}`}
          value={assessment}
          onChange={(event) => setAssessment(event.target.value)}
          className={fieldClass}
        >
          <option value="not_assessed">Nicht bewertet</option>
          <option value="not_satisfied">Nicht erfüllt</option>
          <option value="satisfied">Erfüllt</option>
        </select>
      </label>
      <label className="grid gap-1">
        Begründung für {criterion.text}
        {assessment === "not_satisfied" ? " (erforderlich)" : " (optional)"}
        <input
          name={`note-${criterion.id}`}
          required={assessment === "not_satisfied"}
          maxLength={4000}
          className={fieldClass}
        />
      </label>
    </div>
  );
}

function CommandForm({
  depth,
  operation,
  payload,
  children,
  label,
  disabled = false,
  onResult,
}: {
  depth: Depth;
  operation: string;
  payload: (data: FormData) => Record<string, unknown>;
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onResult?: (result: CommandResult) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [messageRole, setMessageRole] = useState<"status" | "alert">("status");
  const key = useRef<string | null>(null);
  return (
    <form
      aria-label={label}
      className="grid gap-2"
      onChange={() => {
        key.current = null;
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (!key.current) key.current = crypto.randomUUID();
        const input: Command = {
          projectId: depth.context.project_id,
          commandId: key.current,
          expectedRevision: depth.context.completion_revision,
          expectedCycle: depth.context.completion_cycle,
          operation,
          payload: payload(new FormData(event.currentTarget)),
        };
        start(async () => {
          const result = await projectDepthAction(input);
          if (onResult) onResult(result);
          else {
            setMessage(result.message);
            setMessageRole(result.status === "success" ? "status" : "alert");
          }
          if (result.status === "success") {
            key.current = null;
            router.refresh();
          }
        });
      }}
    >
      <fieldset disabled={pending || disabled} className="grid gap-2">
        {children}
        <button type="submit" className={actionClass}>
          {pending ? "Speichern …" : label}
        </button>
      </fieldset>
      {message && (
        <p role={messageRole} className="text-sm text-[var(--text-secondary)]">
          {message}
        </p>
      )}
    </form>
  );
}

export function ProjectDepthResult({ depth }: { depth: Depth }) {
  const { context } = depth;
  const [feedback, setFeedback] = useState("");
  const [feedbackRole, setFeedbackRole] = useState<"status" | "alert">(
    "status",
  );
  const editable = !context.archived_at && context.status !== "completed";
  const active = context.criteria.filter((c) => !c.archived_at);
  const archived = context.criteria.filter((c) => c.archived_at);
  const preview = active.slice(0, 3);
  const additional = active.slice(3);
  const hasReadContent = Boolean(context.desired_result || active.length > 0);
  const reportResult = (result: CommandResult) => {
    setFeedback(result.message);
    setFeedbackRole(result.status === "success" ? "status" : "alert");
  };
  return (
    <section
      aria-label="Project Ergebnis und Kriterien"
      className="mt-3 min-w-0 border-t border-[var(--border-subtle)] pt-3 text-sm"
      data-project-result-read-mode
    >
      {hasReadContent && (
        <div className="grid max-w-5xl gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,1fr)]">
          {context.desired_result && (
            <div className="min-w-0">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-purple)]">
                Gewünschtes Ergebnis
              </h2>
              <p className="mt-1 whitespace-pre-wrap break-words">
                {context.desired_result}
              </p>
            </div>
          )}
          {preview.length > 0 && (
            <div className="min-w-0">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-purple)]">
                Fertig, wenn …
              </h2>
              <ol className="mt-1 grid gap-1">
                {preview.map((criterion) => (
                  <li key={criterion.id} className="break-words">
                    {criterion.text}
                  </li>
                ))}
              </ol>
              {additional.length > 0 && (
                <details className="mt-1">
                  <summary className="min-h-10 cursor-pointer content-center text-[var(--text-secondary)] underline">
                    {additional.length} weitere
                  </summary>
                  <ol start={4} className="grid gap-1 pb-2">
                    {additional.map((criterion) => (
                      <li key={criterion.id} className="break-words">
                        {criterion.text}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          )}
        </div>
      )}
      {editable && (
        <div className={hasReadContent ? "mt-2" : ""}>
          <ManagementDialog
            label="Ergebnis und Kriterien verwalten"
            triggerText={
              hasReadContent
                ? "Ergebnis und Kriterien bearbeiten"
                : "Gewünschtes Ergebnis und Kriterien festlegen"
            }
          >
            <div className="grid gap-6">
              {feedback && <p role={feedbackRole}>{feedback}</p>}
              <CommandForm
                depth={depth}
                operation="result.set"
                label="Ergebnis speichern"
                onResult={reportResult}
                payload={(form) => ({
                  desired_result:
                    String(form.get("desiredResult") ?? "").trim() || null,
                })}
              >
                <label className="grid gap-1">
                  Gewünschtes Ergebnis
                  <textarea
                    name="desiredResult"
                    maxLength={8000}
                    rows={3}
                    defaultValue={context.desired_result ?? ""}
                    className={fieldClass}
                  />
                </label>
              </CommandForm>
              <section className="grid gap-4 border-t border-[var(--border-subtle)] pt-4">
                <h3 className="font-semibold">Fertig, wenn …</h3>
                {active.map((criterion) => (
                  <div
                    key={criterion.id}
                    role="group"
                    aria-label={`Kriterium: ${criterion.text}`}
                    className="grid gap-3 border-b border-[var(--border-subtle)] pb-4"
                  >
                    <CommandForm
                      depth={depth}
                      operation="criterion.edit"
                      label="Kriterium speichern"
                      onResult={reportResult}
                      payload={(form) => ({
                        criterion_id: criterion.id,
                        text: String(form.get("text") ?? "").trim(),
                      })}
                    >
                      <label className="grid gap-1">
                        Kriterium bearbeiten
                        <textarea
                          name="text"
                          required
                          maxLength={2000}
                          defaultValue={criterion.text}
                          className={fieldClass}
                        />
                      </label>
                    </CommandForm>
                    <CommandForm
                      depth={depth}
                      operation="criterion.reorder"
                      label="Reihenfolge speichern"
                      onResult={reportResult}
                      payload={(form) => ({
                        criterion_id: criterion.id,
                        sort_order: String(form.get("sortOrder")),
                      })}
                    >
                      <label className="grid gap-1">
                        Position
                        <input
                          name="sortOrder"
                          type="number"
                          min={0}
                          step={1}
                          required
                          defaultValue={criterion.sort_order}
                          className={fieldClass}
                        />
                      </label>
                    </CommandForm>
                    <CommandForm
                      depth={depth}
                      operation="criterion.archive"
                      label="Kriterium archivieren"
                      onResult={reportResult}
                      payload={(form) => ({
                        criterion_id: criterion.id,
                        reason: String(form.get("reason") ?? "").trim(),
                      })}
                    >
                      <label className="grid gap-1">
                        Grund für Scope-Entfernung
                        <textarea
                          name="reason"
                          required
                          maxLength={4000}
                          className={fieldClass}
                        />
                      </label>
                    </CommandForm>
                  </div>
                ))}
                <CommandForm
                  depth={depth}
                  operation="criterion.create"
                  label="Kriterium hinzufügen"
                  onResult={reportResult}
                  payload={(form) => ({
                    text: String(form.get("text") ?? "").trim(),
                    sort_order: active.length,
                  })}
                >
                  <label className="grid gap-1">
                    Neues Kriterium
                    <textarea
                      name="text"
                      required
                      maxLength={2000}
                      className={fieldClass}
                    />
                  </label>
                </CommandForm>
                {archived.length > 0 && (
                  <details>
                    <summary className="min-h-10 cursor-pointer content-center text-[var(--text-secondary)] underline">
                      In diesem Zyklus archiviert · {archived.length}
                    </summary>
                    <ul className="grid gap-2 py-2 pl-3">
                      {archived.map((criterion) => (
                        <li key={criterion.id}>
                          <span className="line-through">{criterion.text}</span>
                          <span className="block text-[var(--text-muted)]">
                            Grund: {criterion.archive_reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            </div>
          </ManagementDialog>
        </div>
      )}
    </section>
  );
}

export function ProjectDepthReview({ depth }: { depth: Depth }) {
  const { context } = depth;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [messageRole, setMessageRole] = useState<"status" | "alert">("status");
  const key = useRef<string | null>(null);
  const dialogId = "project-review-dialog";
  const dialogTitleId = "project-review-title";
  const active = context.criteria.filter((c) => !c.archived_at);
  const archived = context.criteria.filter((c) => c.archived_at);
  const resources = context.resources;
  const [decision, setDecision] = useState("continue");
  const openWork = context.work.filter(
    (w) =>
      !w.archived_at &&
      (w.type === "milestone"
        ? w.status !== "done"
        : !["done", "canceled", "archived"].includes(w.status)),
  );
  const completed = context.status === "completed";
  const completionReviewId = completed
    ? context.current_completion_review_id
    : null;
  const completionReview = completionReviewId
    ? depth.reviews.find((review) => review.id === completionReviewId)
    : null;
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      window.requestAnimationFrame(() => {
        element
          .querySelector<HTMLElement>("[data-dialog-initial-focus]")
          ?.focus();
      });
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  function closeReview() {
    setOpen(false);
    trigger.current?.focus();
  }

  if (context.archived_at) return null;
  return (
    <section
      aria-label="Project Abschluss"
      className="mt-1 grid gap-2 border-t border-[var(--border-subtle)] pt-3 text-sm"
    >
      {!open && message && <p role={messageRole}>{message}</p>}
      {completed ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Project abgeschlossen</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Zyklus {context.completion_cycle}
                {completionReview?.reviewed_at
                  ? ` · ${new Date(completionReview.reviewed_at).toLocaleDateString("de-DE")}`
                  : ""}
                {!completionReviewId ? " · Ohne gespeicherten Review" : ""}
              </p>
            </div>
            {completionReviewId && (
              <Link
                className="min-h-10 content-center text-[var(--accent-cyan)] underline"
                href={`/projects/${context.project_id}?historyBefore=${depth.completionReviewHistoryBefore}#project-review-${completionReviewId}`}
              >
                Abschluss-Review ansehen
              </Link>
            )}
          </div>
          <ManagementDialog
            label="Project-Abschluss verwalten"
            triggerText="Lifecycle verwalten"
          >
            <CommandForm
              depth={depth}
              operation="project.reopen"
              label="Project wieder öffnen"
              payload={() => ({})}
              onResult={(result) => {
                setMessage(result.message);
                setMessageRole(
                  result.status === "success" ? "status" : "alert",
                );
              }}
            >
              <p>
                Ein neuer Zyklus beginnt. Bisherige Reviews bleiben erhalten.
              </p>
            </CommandForm>
          </ManagementDialog>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--text-secondary)]">
              Review
            </h2>
            <button
              ref={trigger}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={dialogId}
              className="min-h-10 text-[var(--accent-cyan)] underline"
              onClick={() => setOpen(true)}
            >
              Abschluss prüfen
            </button>
          </div>
          <dialog
            ref={dialog}
            id={dialogId}
            aria-labelledby={dialogTitleId}
            className="w-[min(48rem,calc(100vw-2rem))] max-h-[min(84dvh,56rem)] overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/60"
            onCancel={(event) => {
              event.preventDefault();
              closeReview();
            }}
            onClose={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          >
            <div className="grid gap-4 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
                <h2 id={dialogTitleId} className="text-lg font-semibold">
                  Project Review
                </h2>
                <button
                  type="button"
                  aria-label="Review schließen"
                  className="min-h-10 shrink-0 text-sm text-[var(--text-secondary)] underline"
                  onClick={closeReview}
                >
                  Schließen
                </button>
              </div>
              <form
                aria-label="Project Review"
                className="grid gap-4"
                onChange={() => {
                  key.current = null;
                }}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  if (!key.current) key.current = crypto.randomUUID();
                  const input: Command = {
                    projectId: context.project_id,
                    commandId: key.current,
                    expectedRevision: context.completion_revision,
                    expectedCycle: context.completion_cycle,
                    operation: "review.submit",
                    payload: {
                      fingerprint: context.fingerprint,
                      decision: String(form.get("decision")),
                      result_accepted:
                        decision === "completed" &&
                        form.get("resultAccepted") === "on",
                      rationale: String(form.get("rationale") ?? "").trim(),
                      criteria: active.map((c) => ({
                        id: c.id,
                        assessment: String(
                          form.get(`assessment-${c.id}`) ?? "",
                        ),
                        note: String(form.get(`note-${c.id}`) ?? "").trim(),
                      })),
                      archived_ids: form.getAll("archivedId").map(String),
                      archived_notes: archived
                        .map((c) => ({
                          id: c.id,
                          note: String(
                            form.get(`archived-note-${c.id}`) ?? "",
                          ).trim(),
                        }))
                        .filter((c) => c.note),
                      archived_criteria_acknowledged:
                        archived.length > 0 &&
                        form.getAll("archivedId").length === archived.length,
                      evidence: resources.flatMap((r) =>
                        form
                          .getAll(`evidence-${r.relation_id}`)
                          .map((criterion) => ({
                            relation_id: r.relation_id,
                            criterion_id: String(criterion) || null,
                            token: r.token,
                            note: String(
                              form.get(`evidence-note-${r.relation_id}`) ?? "",
                            ).trim(),
                          })),
                      ),
                      open_work_acknowledged:
                        decision === "completed" &&
                        form.get("openWorkAcknowledged") === "on",
                      open_work_disposition:
                        decision === "completed"
                          ? String(form.get("openWorkDisposition") ?? "").trim()
                          : "",
                    },
                  };
                  start(async () => {
                    const result = await projectDepthAction(input);
                    setMessage(result.message);
                    setMessageRole(
                      result.status === "success" ? "status" : "alert",
                    );
                    if (result.status === "success") {
                      key.current = null;
                      setOpen(false);
                      trigger.current?.focus();
                      router.refresh();
                    }
                  });
                }}
              >
                <p>
                  <strong>Gewünschtes Ergebnis:</strong>{" "}
                  {context.desired_result ?? "Noch nicht festgelegt"}
                </p>
                {decision === "completed" && (
                  <label className="flex items-start gap-2">
                    <input type="checkbox" name="resultAccepted" required />
                    Ergebnis ausdrücklich bestätigen
                  </label>
                )}
                <label className="grid gap-1">
                  Entscheidung
                  <select
                    name="decision"
                    value={decision}
                    onChange={(event) => setDecision(event.target.value)}
                    data-dialog-initial-focus
                    className={fieldClass}
                  >
                    <option value="continue">Weiterführen</option>
                    <option value="completed">Abschließen</option>
                  </select>
                </label>
                <fieldset className="grid gap-3">
                  <legend className="font-medium">Aktive Kriterien</legend>
                  {active.length ? (
                    active.map((c) => (
                      <CriterionEvaluation key={c.id} criterion={c} />
                    ))
                  ) : (
                    <p>
                      Für einen positiven Abschluss ist mindestens ein aktives
                      Kriterium erforderlich.
                    </p>
                  )}
                </fieldset>
                {archived.length > 0 && (
                  <fieldset className="grid gap-2">
                    <legend className="font-medium">
                      Aus Scope archiviert
                    </legend>
                    {archived.map((c) => (
                      <div key={c.id} className="grid gap-2">
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            name="archivedId"
                            value={c.id}
                            required
                          />
                          {c.text} · Grund: {c.archive_reason}
                        </label>
                        <label className="grid gap-1">
                          Kommentar zu Scope-Entfernung: {c.text} (optional)
                          <input
                            name={`archived-note-${c.id}`}
                            maxLength={4000}
                            className={fieldClass}
                          />
                        </label>
                      </div>
                    ))}
                  </fieldset>
                )}
                <section aria-label="Offene Arbeit" className="grid gap-2">
                  <h4 className="font-medium">
                    Offene Tasks und Milestones
                    {openWork.length > 0 ? ` · ${openWork.length}` : ""}
                  </h4>
                  {openWork.length > 0 ? (
                    <>
                      <ul className="grid gap-1">
                        {openWork.map((w) => (
                          <li key={`${w.type}-${w.id}`}>
                            {w.type === "task" ? "Task" : "Milestone"}:{" "}
                            {w.title} · {w.status}
                          </li>
                        ))}
                      </ul>
                      {decision === "completed" && (
                        <>
                          <label className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              name="openWorkAcknowledged"
                              required
                            />
                            Offene Arbeit gesehen; sie bleibt unverändert.
                          </label>
                          <label className="grid gap-1">
                            Disposition der offenen Arbeit
                            <input
                              name="openWorkDisposition"
                              required
                              maxLength={4000}
                              className={fieldClass}
                            />
                          </label>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-[var(--text-secondary)]">
                      Keine offene Arbeit.
                    </p>
                  )}
                </section>
                {resources.length > 0 && (
                  <fieldset className="grid gap-2">
                    <legend className="font-medium">
                      Resource-Belege (optional)
                    </legend>
                    {resources.map((r) => (
                      <details key={r.relation_id}>
                        <summary className="min-h-10 cursor-pointer content-center">
                          {r.title} · {r.role} · {r.relation_type}
                        </summary>
                        <div className="grid gap-2 pl-3">
                          <label className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              name={`evidence-${r.relation_id}`}
                              value=""
                            />
                            {r.title} · gesamter Review
                          </label>
                          {active.map((c) => (
                            <label
                              key={c.id}
                              className="flex items-start gap-2"
                            >
                              <input
                                type="checkbox"
                                name={`evidence-${r.relation_id}`}
                                value={c.id}
                              />
                              {r.title} · Kriterium: {c.text}
                            </label>
                          ))}
                          <label className="grid gap-1">
                            Belegnotiz für {r.title} (optional)
                            <input
                              name={`evidence-note-${r.relation_id}`}
                              maxLength={4000}
                              className={fieldClass}
                            />
                          </label>
                        </div>
                      </details>
                    ))}
                  </fieldset>
                )}
                <label className="grid gap-1">
                  Begründung
                  <textarea
                    name="rationale"
                    required
                    maxLength={4000}
                    rows={3}
                    className={fieldClass}
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={pending}
                    className={actionClass}
                  >
                    {pending ? "Speichern …" : "Review speichern"}
                  </button>
                  <button
                    type="button"
                    className="min-h-10 text-[var(--text-secondary)] underline"
                    onClick={closeReview}
                  >
                    Abbrechen
                  </button>
                </div>
                {open && message && <p role={messageRole}>{message}</p>}
              </form>
            </div>
          </dialog>
        </>
      )}
    </section>
  );
}

export function ProjectDepthStatus({ depth }: { depth: Depth }) {
  const { context } = depth;
  if (context.archived_at || context.status === "completed") return null;
  return (
    <details className="grid gap-2 border-t border-[var(--border-subtle)] pt-3 text-sm">
      <summary className="min-h-10 cursor-pointer content-center text-[var(--text-secondary)] underline">
        Project-Status setzen
      </summary>
      <CommandForm
        depth={depth}
        operation="project.status.set"
        label="Status speichern"
        payload={(form) => ({ status: String(form.get("status")) })}
      >
        <label className="grid gap-1">
          Status
          <select
            name="status"
            defaultValue={context.status}
            className={fieldClass}
          >
            <option value="idea">Idee</option>
            <option value="active">Aktiv</option>
            <option value="paused">Pausiert</option>
            <option value="blocked">Blockiert</option>
          </select>
        </label>
      </CommandForm>
    </details>
  );
}

function ReviewAmendment({
  depth,
  review,
  resources,
}: {
  depth: Depth;
  review: Depth["reviews"][number];
  resources: Depth["resourceSnapshots"];
}) {
  const [kind, setKind] = useState("clarification");
  const reopens =
    depth.context.status === "completed" &&
    review.decision === "completed" &&
    review.completion_cycle === depth.context.completion_cycle &&
    review.id === depth.context.current_completion_review_id;
  return (
    <details>
      <summary className="min-h-10 cursor-pointer content-center text-[var(--accent-cyan)] underline">
        Ergänzung hinzufügen
      </summary>
      <CommandForm
        depth={depth}
        operation="review.amend"
        label="Ergänzung speichern"
        payload={(form) => ({
          review_id: review.id,
          kind: String(form.get("kind")),
          review_resource_id:
            String(form.get("reviewResourceId") ?? "") || null,
          reason: String(form.get("note") ?? "").trim(),
        })}
      >
        <label className="grid gap-1">
          Art der Ergänzung
          <select
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            aria-describedby={`amendment-help-${review.id}`}
            className={fieldClass}
          >
            <option value="clarification">Klarstellung</option>
            <option value="marked_mistaken">
              Review als irrtümlich markieren
            </option>
            <option value="evidence_withdrawn">Beleg zurückziehen</option>
          </select>
        </label>
        <p id={`amendment-help-${review.id}`}>
          {kind === "marked_mistaken"
            ? reopens
              ? "Dieser aktuelle Abschluss wird dadurch wieder geöffnet."
              : "Die Kennzeichnung ergänzt die History und ändert den aktuellen Project-Status nicht."
            : "Ergänzungen erhalten den ursprünglichen Review unverändert."}
        </p>
        <label className="grid gap-1">
          Beleg (nur bei Rückzug)
          <select name="reviewResourceId" className={fieldClass}>
            <option value="">Kein Beleg</option>
            {resources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title_snapshot}
                {s.criterion_id ? " · Kriterium" : " · Review"}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          Korrektur oder Kontext
          <textarea
            name="note"
            required
            maxLength={4000}
            className={fieldClass}
          />
        </label>
      </CommandForm>
    </details>
  );
}

function ProjectDepthHistoryContent({ depth }: { depth: Depth }) {
  const { context } = depth;
  const completedReview = depth.reviews.find(
    (r) =>
      r.decision === "completed" &&
      String(r.completion_cycle) === context.completion_cycle,
  );
  const legacy =
    context.status === "completed" && !context.current_completion_review_id;
  return (
    <section
      id="project-history"
      aria-label="Project Abschlussverlauf"
      className="min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 text-sm"
    >
      <h2 className="text-base font-semibold">Abschlussverlauf</h2>
      {legacy && (
        <p className="mt-2 text-[var(--text-secondary)]">
          Abgeschlossen ohne gespeicherten Review.
        </p>
      )}
      {!depth.historyItems.length && !legacy && (
        <p className="mt-2 text-[var(--text-muted)]">
          Noch kein Project Review gespeichert.
        </p>
      )}
      <div className="mt-3 grid gap-3">
        {depth.historyItems.map((item) => {
          if (item.kind === "lifecycle") {
            const e = depth.lifecycle.find((event) => event.id === item.id);
            return (
              e && (
                <p key={e.id}>
                  {new Date(e.recorded_at).toLocaleString("de-DE")} ·{" "}
                  {e.event_kind === "reopened"
                    ? "Wieder geöffnet"
                    : "Archiviert"}{" "}
                  · {e.prior_status} → {e.resulting_status} ·{" "}
                  {e.project_title_snapshot} · Zyklus {e.cycle_before} →{" "}
                  {e.cycle_after}
                  {e.prior_completion_kind === "legacy_without_review"
                    ? " · vorher ohne gespeicherten Review"
                    : ""}
                  {e.reason ? ` · ${e.reason}` : ""}
                </p>
              )
            );
          }
          if (item.kind === "amendment") {
            const a = depth.amendments.find(
              (amendment) => amendment.id === item.id,
            );
            return (
              a && (
                <p key={a.id}>
                  {new Date(a.recorded_at).toLocaleString("de-DE")} ·{" "}
                  {amendmentLabel[a.kind]} · {a.reason}
                </p>
              )
            );
          }
          const r = depth.reviews.find((review) => review.id === item.id);
          if (!r) return null;
          const criteria = depth.criteriaSnapshots
            .filter((c) => c.review_id === r.id)
            .sort((a, b) =>
              BigInt(a.sort_order_snapshot) < BigInt(b.sort_order_snapshot)
                ? -1
                : BigInt(a.sort_order_snapshot) > BigInt(b.sort_order_snapshot)
                  ? 1
                  : a.criterion_id.localeCompare(b.criterion_id),
            );
          const resources = depth.resourceSnapshots.filter(
            (s) => s.review_id === r.id,
          );
          const amendments = depth.amendments.filter(
            (a) => a.review_id === r.id,
          );
          return (
            <details
              key={r.id}
              id={`project-review-${r.id}`}
              className="min-w-0 rounded-lg border border-[var(--border-subtle)] p-3"
              open={r.id === completedReview?.id}
            >
              <summary className="min-h-10 cursor-pointer content-center font-medium">
                {r.decision === "completed" ? "Abgeschlossen" : "Weitergeführt"}{" "}
                · Zyklus {(BigInt(r.completion_cycle) + BigInt(1)).toString()} ·{" "}
                {new Date(r.reviewed_at).toLocaleString("de-DE")}
              </summary>
              <div className="grid gap-3 pt-2 text-[var(--text-secondary)]">
                <p>
                  <strong>Ergebnis zum Review:</strong>{" "}
                  {r.desired_result_snapshot ?? "Kein Ergebnis gespeichert"}
                </p>
                <p>
                  <strong>Begründung:</strong> {r.rationale}
                </p>
                <ul className="grid gap-1">
                  {criteria.map((c) => (
                    <li key={c.criterion_id}>
                      {c.text_snapshot} ·{" "}
                      {assessmentLabel[c.decision] ?? c.decision}
                      {c.archive_reason_snapshot
                        ? ` · Archivgrund: ${c.archive_reason_snapshot}`
                        : ""}
                      {c.rationale ? ` · ${c.rationale}` : ""}
                    </li>
                  ))}
                </ul>
                <p>
                  Arbeitskontext beobachtet am{" "}
                  {new Date(r.work_observed_at).toLocaleString("de-DE")}: Tasks{" "}
                  {r.open_task_count} offen / {r.done_task_count} erledigt /{" "}
                  {r.canceled_task_count} abgebrochen; Milestones{" "}
                  {r.open_milestone_count} offen / {r.done_milestone_count}{" "}
                  erledigt. Keine Einzel-Arbeitshistory gespeichert.
                </p>
                <p>
                  {r.project_title_snapshot}
                  {r.goal_title_snapshot
                    ? ` · Goal zum Review: ${r.goal_title_snapshot}`
                    : ""}{" "}
                  · Revision {r.revision_before} → {r.revision_after}
                </p>
                {r.open_work_acknowledged && (
                  <p>Offene Arbeit bestätigt: {r.open_work_disposition}</p>
                )}
                {resources.length > 0 && (
                  <div>
                    <h3 className="font-medium">Resource-Belege</h3>
                    <ul>
                      {resources.map((s) => {
                        const available = depth.availableResourceIds.includes(
                          s.resource_id,
                        );
                        const current = depth.resourceStates.find(
                          (resource) => resource.id === s.resource_id,
                        );
                        const withdrawn = depth.amendments.some(
                          (amendment) =>
                            amendment.kind === "evidence_withdrawn" &&
                            amendment.review_resource_id === s.id,
                        );
                        return (
                          <li key={s.id}>
                            {s.title_snapshot}
                            {withdrawn ? " · Beleg zurückgezogen" : ""}
                            {current?.title !== s.title_snapshot && current
                              ? " · aktuell umbenannt"
                              : ""}
                            {current?.archived ? " · aktuell archiviert" : ""}
                            {current &&
                            !current.relationIds.includes(
                              s.relation_id_snapshot,
                            )
                              ? " · nicht mehr verknüpft"
                              : ""}{" "}
                            · {s.resource_type_snapshot} ·{" "}
                            {s.project_role_snapshot}
                            {s.criterion_id
                              ? ` · Kriterium: ${criteria.find((c) => c.criterion_id === s.criterion_id)?.text_snapshot}`
                              : " · gesamter Review"}
                            {s.note ? ` · ${s.note}` : ""}
                            {s.safe_url_snapshot
                              ? ` · ${s.safe_url_snapshot}`
                              : ""}
                            {available ? (
                              <Link
                                className="ml-2 text-[var(--accent-cyan)] underline"
                                href={`/resources?selected=${s.resource_id}`}
                              >
                                Aktuelle Resource öffnen
                              </Link>
                            ) : (
                              <span className="ml-2">
                                Aktuelle Resource nicht verfügbar
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {amendments.length > 0 && (
                  <div>
                    <h3 className="font-medium">Ergänzungen</h3>
                    <ul>
                      {amendments.map((a) => (
                        <li key={a.id}>
                          {new Date(a.recorded_at).toLocaleString("de-DE")} ·{" "}
                          {amendmentLabel[a.kind]} · {a.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ReviewAmendment
                  depth={depth}
                  review={r}
                  resources={resources}
                />
              </div>
            </details>
          );
        })}
      </div>
      {depth.nextRevision && (
        <Link
          className="mt-3 inline-block min-h-10 content-center text-[var(--accent-cyan)] underline"
          href={`/projects/${context.project_id}?historyBefore=${depth.nextRevision}#project-history`}
        >
          Ältere History
        </Link>
      )}
      <Link
        className="ml-3 inline-block min-h-10 content-center text-[var(--accent-cyan)] underline"
        href={`/projects/${context.project_id}#project-history`}
      >
        Aktuelle History
      </Link>
    </section>
  );
}

export function ProjectDepthHistory({ depth }: { depth: Depth }) {
  const { context } = depth;
  const legacy =
    context.status === "completed" && !context.current_completion_review_id;
  const hasHistory = depth.historyItems.length > 0 || legacy;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogId = "project-history-dialog";
  const titleId = "project-history-title";

  useEffect(() => {
    const openFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash === "project-history" || hash.startsWith("project-review-")) {
        window.requestAnimationFrame(() => setOpen(true));
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [depth]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      window.requestAnimationFrame(() => {
        const id = window.location.hash.slice(1);
        const target = id && document.getElementById(id);
        if (target) target.scrollIntoView({ block: "start" });
        else element.querySelector<HTMLElement>("button")?.focus();
      });
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  function closeHistory() {
    setOpen(false);
    trigger.current?.focus();
  }

  if (!hasHistory) return null;
  return (
    <div className="flex justify-end">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        className="min-h-10 text-sm text-[var(--text-secondary)] underline"
        onClick={() => setOpen(true)}
      >
        Abschlussverlauf ansehen
      </button>
      <dialog
        ref={dialog}
        id={dialogId}
        aria-labelledby={titleId}
        className="w-[min(64rem,calc(100vw-2rem))] max-h-[min(88dvh,64rem)] overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/60"
        onCancel={(event) => {
          event.preventDefault();
          closeHistory();
        }}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
      >
        <div className="grid gap-4 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
            <h2 id={titleId} className="text-lg font-semibold">
              Abschlussverlauf
            </h2>
            <button
              type="button"
              aria-label="Abschlussverlauf schließen"
              className="min-h-10 shrink-0 text-sm text-[var(--text-secondary)] underline"
              onClick={closeHistory}
            >
              Schließen
            </button>
          </div>
          {open && <ProjectDepthHistoryContent depth={depth} />}
        </div>
      </dialog>
    </div>
  );
}
