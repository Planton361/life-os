"use client";
import { fieldClass, actionClass } from "./form-styles";
export { fieldClass, actionClass } from "./form-styles";
import {
  useId,
  useRef,
  useState,
  useTransition,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { linkTaskSkillAction } from "@/features/real-data/actions/task.actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/toast-provider";
import {
  saveWorkbenchEntity,
  workbenchOperation,
} from "@/features/real-data/actions/entity-workbench.actions";
import {
  entityLabels,
  entityRoutes,
  type WorkbenchKind,
  type FieldValues,
  type Option,
} from "./types";
import {
  ManagementDisclosure,
  useCloseManagementDisclosure,
} from "./management-disclosure";
const subscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
export function Choice({
  name,
  label,
  options,
  value,
  required = false,
  onChange,
  allowEmpty = true,
}: {
  name: string;
  label: string;
  options: Option[];
  value?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  allowEmpty?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className={fieldClass}
        defaultValue={onChange ? undefined : (value ?? "")}
        value={onChange ? (value ?? "") : undefined}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        name={name}
        required={required}
      >
        {allowEmpty && <option value="">Keine Auswahl</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title}
          </option>
        ))}
      </select>
    </div>
  );
}
function Field({
  name,
  label,
  values,
  type = "text",
  required = false,
  placeholder,
  ariaLabel,
}: {
  name: string;
  label: string;
  values: FieldValues;
  type?: string;
  required?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      {type === "textarea" ? (
        <textarea
          className={fieldClass}
          defaultValue={values[name] ?? ""}
          name={name}
          rows={5}
        />
      ) : (
        <input
          className={fieldClass}
          defaultValue={values[name] ?? ""}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          aria-label={ariaLabel}
          min={type === "number" ? 1 : undefined}
          minLength={required ? (name === "name" ? 1 : 2) : undefined}
        />
      )}
    </label>
  );
}
const opts = (values: readonly string[]) =>
  values.map((id) => ({ id, title: id }));

const goalStatusOptions = [
  { id: "draft", title: "Entwurf" },
  { id: "active", title: "Aktiv" },
  { id: "paused", title: "Pausiert" },
];

const goalHorizonOptions = [
  { id: "week", title: "Woche" },
  { id: "month", title: "Monat" },
  { id: "quarter", title: "Quartal" },
  { id: "year", title: "Jahr" },
  { id: "someday", title: "Irgendwann" },
];

function visibleEntityLabel(kind: WorkbenchKind, goalMilestoneContext = false) {
  if (kind === "goal" || (goalMilestoneContext && kind === "project")) {
    return kind === "goal" ? "Ziel" : "Projekt";
  }
  return entityLabels[kind];
}

export function GoalCaptureForm({ areas }: { areas: Option[] }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const values: FieldValues = {};
  return (
    <form
      aria-label="Ziel erstellen"
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set("commandId", crypto.randomUUID());
        start(async () => {
          setError("");
          const result = await saveWorkbenchEntity("goal", null, form);
          if (result.status !== "success") {
            setError(result.message);
            return;
          }
          notify(result.message);
          if (result.id) router.push(`/goals/${result.id}`);
        });
      }}
    >
      <fieldset disabled={!hydrated || pending} className="grid gap-6">
        <section className="grid gap-4">
          <h2 className="text-lg text-[var(--accent-cyan)]">Ziel festhalten</h2>
          <Field name="title" label="Titel" values={values} required />
          <Field
            name="description"
            label="Was möchtest du erreichen?"
            values={values}
            type="textarea"
          />
          <p className="text-sm text-[var(--text-muted)]">
            Neue Ziele starten als Entwurf. Details kannst du später ergänzen.
          </p>
        </section>
        <ManagementDisclosure label="Weitere Angaben (optional)">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="why"
              label="Warum / welcher Nutzen?"
              values={values}
              type="textarea"
            />
            <Choice name="areaId" label="Area" options={areas} />
            <Choice
              name="horizon"
              label="Horizont"
              options={goalHorizonOptions}
            />
            <Field
              name="targetDate"
              label="Zieldatum"
              values={values}
              type="date"
            />
          </div>
        </ManagementDisclosure>
        <div className="border-t border-[var(--border-subtle)] pt-5">
          <button className={actionClass} type="submit">
            {pending ? "Speichern …" : "Ziel erstellen"}
          </button>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-[var(--accent-red)]">
          {error}
        </p>
      )}
    </form>
  );
}

export function EntityForm({
  kind,
  id,
  values,
  areas,
  projects,
  goals,
  archived = false,
  sourceOwned = false,
  taskEditDialog = false,
  projectContext,
  skillOrigin,
  goalContext,
  goalMilestoneContext,
  milestones = [],
}: {
  kind: WorkbenchKind;
  id?: string;
  projectContext?: string;
  skillOrigin?: { id: string; name: string };
  goalMilestoneContext?: {
    goalId: string;
    milestoneId: string;
    goalTitle: string;
    milestoneTitle: string;
    projects: Option[];
  };
  milestones?: (Option & { projectId: string })[];
  values: FieldValues;
  areas: Option[];
  projects: Option[];
  goals: Option[];
  archived?: boolean;
  sourceOwned?: boolean;
  taskEditDialog?: boolean;
  goalContext?: string;
}) {
  const [selectedProject, setSelectedProject] = useState(
    String(values.projectId ?? ""),
  );
  const [selectedGoal, setSelectedGoal] = useState(
    String(values.goalId ?? goalContext ?? ""),
  );
  const hydrated = useHydrated();
  const router = useRouter();
  const { notify } = useToast();
  const closeDisclosure = useCloseManagementDisclosure();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [withoutSkill, setWithoutSkill] = useState(false);
  const [unclearCreate, setUnclearCreate] = useState(false);
  const submitting = useRef(false);
  const formEntityLabel = visibleEntityLabel(
    kind,
    Boolean(goalMilestoneContext),
  );
  const taskCapture = kind === "task" && !id;
  const goalMilestoneTaskCapture = taskCapture && Boolean(goalMilestoneContext);
  const taskCancelHref = skillOrigin
    ? `/skills/${skillOrigin.id}`
    : goalMilestoneContext
      ? `/goals/${goalMilestoneContext.goalId}?goalMilestone=${goalMilestoneContext.milestoneId}`
      : projectContext
        ? `/projects/${projectContext}`
        : goalContext
          ? `/goals/${goalContext}`
          : "/tasks";
  const field = (
    name: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <Field
      name={name}
      label={label}
      values={values}
      type={type}
      required={required}
    />
  );
  const choice = (name: string, label: string, options: Option[]) => (
    <Choice
      name={name}
      label={label}
      options={
        name === "status" && values.status === "archived"
          ? [...options, { id: "archived", title: "archived" }]
          : options
      }
      value={String(values[name] ?? "")}
    />
  );
  return (
    <form
      aria-label={`${formEntityLabel} ${id ? "bearbeiten" : "erstellen"}`}
      data-goal-milestone-task-capture={
        goalMilestoneTaskCapture ? "title-first" : undefined
      }
      data-task-capture-title-first={taskCapture ? "true" : undefined}
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current || unclearCreate) return;
        const form = new FormData(event.currentTarget);
        if (!form.get("commandId")) form.set("commandId", crypto.randomUUID());
        const selectedProjectId = String(form.get("projectId") ?? "").trim();
        if (taskCapture && projectContext && !selectedProjectId) {
          setError("Bitte wähle ein Project aus.");
          return;
        }
        submitting.current = true;
        start(async () => {
          setError("");
          let r;
          try {
            r = await saveWorkbenchEntity(kind, id ?? null, form);
          } catch {
            submitting.current = false;
            if (taskCapture && skillOrigin) {
              setUnclearCreate(true);
              setError("Speicherergebnis unklar — Aufgaben prüfen");
            } else
              setError(
                "Speichern fehlgeschlagen. Bitte prüfe den gespeicherten Stand.",
              );
            return;
          }

          if (r.status !== "success") {
            submitting.current = false;
            setError(r.message);
            return;
          }
          if (taskCapture && skillOrigin) {
            if (!r.id) {
              setUnclearCreate(true);
              setError("Speicherergebnis unklar — Aufgaben prüfen");
              submitting.current = false;
              return;
            }
            // Preserve the known ID before any link attempt. Reload verifies the
            // actual relation, including after an ambiguous link response.
            const href = `/tasks/${r.id}${withoutSkill ? "" : `?skill=${skillOrigin.id}`}`;
            window.history.replaceState(window.history.state, "", href);
            if (!withoutSkill) {
              const link = new FormData();
              link.set("taskId", r.id);
              link.set("skillId", skillOrigin.id);
              try {
                await linkTaskSkillAction(link);
              } catch {
                /* canonical readback owns recovery */
              }
            } else notify("Aufgabe erstellt.");
            window.location.assign(href);
            return;
          }
          submitting.current = false;
          notify(r.message);
          closeDisclosure?.();
          if (!id && r.id)
            router.push(
              goalMilestoneContext
                ? `/goals/${goalMilestoneContext.goalId}?created=${kind}&goalMilestone=${goalMilestoneContext.milestoneId}`
                : projectContext
                  ? kind === "task"
                    ? `/projects/${selectedProjectId || projectContext}`
                    : `/projects/${projectContext}?resource=${r.id}`
                  : goalContext
                    ? `/goals/${goalContext}?created=${kind}`
                    : `${entityRoutes[kind]}/${r.id}`,
            );
          else router.refresh();
        });
      }}
    >
      <fieldset
        disabled={!hydrated || pending || archived || unclearCreate}
        className="grid gap-6"
      >
        {taskCapture ? (
          <>
            <section
              className="grid gap-4"
              aria-label="Task zuerst erfassen"
              data-task-capture-default
              data-goal-milestone-task-default={
                goalMilestoneTaskCapture ? "true" : undefined
              }
            >
              <p data-task-capture-kicker>ERFASSEN</p>
              <Field
                name="title"
                label="Task-Titel · erforderlich"
                ariaLabel="Titel"
                placeholder="Was ist konkret zu tun?"
                values={values}
                required
              />
              {skillOrigin && (
                <div className="grid min-w-0 gap-2">
                  <p className="break-words text-sm">
                    Für Skill: {skillOrigin.name}
                  </p>
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={withoutSkill}
                      onChange={(event) =>
                        setWithoutSkill(event.target.checked)
                      }
                    />
                    Ohne Skill-Verbindung erstellen
                  </label>
                </div>
              )}
              <p className="text-sm text-[var(--text-muted)]">
                Du kannst die Task mit dem Titel speichern und Details später
                ergänzen. Neue Tasks starten geplant.
              </p>
            </section>
            <ManagementDisclosure label="Arbeitsinhalt (optional)">
              <section className="grid gap-4 md:grid-cols-2">
                {field("description", "Beschreibung / Purpose", "textarea")}
                {field("nextAction", "Arbeitsnotiz / nächste Aktion")}
              </section>
            </ManagementDisclosure>
            <ManagementDisclosure label="Planung (optional)">
              <section className="grid gap-4 md:grid-cols-2">
                {choice(
                  "priority",
                  "Priority",
                  opts(["P0", "P1", "P2", "P3", "none"]),
                )}
                {choice("energy", "Energy", opts(["low", "medium", "high"]))}
                {field("durationMinutes", "Duration (min)", "number")}
                {field("dueAt", "Deadline", "date")}
                {field("plannedDate", "Geplantes Datum", "date")}
              </section>
            </ManagementDisclosure>
            <ManagementDisclosure label="Zuordnung (optional)">
              <section className="grid gap-4 md:grid-cols-2">
                {choice("areaId", "Area", areas)}
                {goalMilestoneContext ? (
                  <>
                    <Choice
                      name="projectId"
                      label="Project-Kontext (optional)"
                      options={goalMilestoneContext.projects}
                      value={selectedProject}
                      onChange={setSelectedProject}
                    />
                    <input
                      type="hidden"
                      name="goalId"
                      value={goalMilestoneContext.goalId}
                    />
                    <input
                      type="hidden"
                      name="goalMilestoneId"
                      value={goalMilestoneContext.milestoneId}
                    />
                  </>
                ) : (
                  <>
                    <Choice
                      name="projectId"
                      label="Project"
                      options={projects}
                      value={selectedProject}
                      onChange={(projectId) => {
                        setSelectedProject(projectId);
                        setSelectedGoal("");
                      }}
                      required={Boolean(projectContext)}
                      allowEmpty={!projectContext}
                    />
                    <Choice
                      key={selectedProject}
                      name="milestoneId"
                      label="Project Milestone"
                      value={
                        selectedProject === values.projectId
                          ? String(values.milestoneId ?? "")
                          : ""
                      }
                      options={milestones
                        .filter(
                          (milestone) =>
                            milestone.projectId === selectedProject,
                        )
                        .map(({ id: milestoneId, title }) => ({
                          id: milestoneId,
                          title,
                        }))}
                    />
                    <Choice
                      name="goalId"
                      label="Goal-Kontext"
                      options={goals}
                      value={selectedGoal}
                      onChange={setSelectedGoal}
                    />
                  </>
                )}
              </section>
            </ManagementDisclosure>
          </>
        ) : (
          <>
            <section className="grid gap-4">
              <h2 className="text-lg text-[var(--accent-cyan)]">
                01 Grundlagen
              </h2>
              {field(
                kind === "skill" ? "name" : "title",
                kind === "skill" ? "Name" : "Titel",
                "text",
                true,
              )}
              {field(
                kind === "skill"
                  ? "summary"
                  : kind === "resource"
                    ? "body"
                    : "description",
                "Beschreibung / Kontext",
                "textarea",
              )}
              {kind === "task" && field("nextAction", "Next Action")}
              {kind === "project" && field("nextStep", "Project-Fokus")}
              {kind === "goal" &&
                field("why", "Desired Outcome / Warum", "textarea")}
              {kind === "resource" && (
                <section aria-label="Externe Referenz" className="grid gap-4">
                  <h3 className="text-sm font-semibold">
                    Referenz & Klassifikation
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Externe Dokumente, Repositories und andere Quellen bleiben
                    an ihrem Speicherort. Hier hältst du Link und Kontext fest.
                  </p>
                  {choice(
                    "type",
                    "Typ",
                    opts([
                      "note",
                      "learning",
                      "prompt",
                      "research",
                      "link",
                      "source",
                      "snippet",
                      "decision",
                    ]),
                  )}
                  {field("url", "URL", "url")}
                </section>
              )}
            </section>
            {kind !== "resource" && (
              <section className="grid gap-4 border-t border-[var(--border-subtle)] pt-5">
                <h2 className="text-lg text-[var(--accent-orange)]">
                  02 Zustand & Planung
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {kind === "task" && (
                    <>
                      {id ? (
                        sourceOwned ||
                        taskEditDialog ||
                        values.status === "done" ? (
                          <p>
                            Status: {values.status}
                            <input
                              type="hidden"
                              name="status"
                              value={String(values.status)}
                            />
                          </p>
                        ) : (
                          choice(
                            "status",
                            "Status",
                            opts([
                              "inbox",
                              "planned",
                              "active",
                              "waiting",
                              "canceled",
                              "someday",
                            ]),
                          )
                        )
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">
                          Neue Tasks starten als planned.
                        </p>
                      )}
                      {choice(
                        "priority",
                        "Priority",
                        opts(["P0", "P1", "P2", "P3", "none"]),
                      )}
                      {choice(
                        "energy",
                        "Energy",
                        opts(["low", "medium", "high"]),
                      )}
                      {sourceOwned ? (
                        <input
                          type="hidden"
                          name="durationMinutes"
                          value={values.durationMinutes ?? ""}
                        />
                      ) : (
                        field("durationMinutes", "Duration (min)", "number")
                      )}
                      {field("dueAt", "Deadline", "date")}
                      {sourceOwned ? (
                        <p>
                          Planung über die verantwortliche Quelle
                          <input
                            type="hidden"
                            name="plannedDate"
                            value={values.plannedDate ?? ""}
                          />
                        </p>
                      ) : (
                        field("plannedDate", "Geplantes Datum", "date")
                      )}
                    </>
                  )}
                  {kind === "project" && (
                    <>
                      {id ? (
                        <p className="text-sm text-[var(--text-secondary)]">
                          Status: {values.status} · unter Project verwalten
                          ändern
                        </p>
                      ) : (
                        choice(
                          "status",
                          "Status",
                          opts(["idea", "active", "paused", "blocked"]),
                        )
                      )}
                      {choice(
                        "priority",
                        "Priority",
                        opts(["P0", "P1", "P2", "P3", "none"]),
                      )}
                      {field("deadline", "Deadline", "date")}
                    </>
                  )}
                  {kind === "goal" && (
                    <>
                      {values.status === "achieved" ? (
                        <p className="text-sm">
                          Status: Erreicht · über „Wieder öffnen“ im
                          Ergebnisbereich wieder öffnen.
                        </p>
                      ) : (
                        choice("status", "Status", goalStatusOptions)
                      )}
                      {choice("horizon", "Horizont", goalHorizonOptions)}
                      {field("targetDate", "Zieldatum", "date")}
                    </>
                  )}
                  {kind === "skill" && (
                    <>
                      {choice("status", "Status", opts(["active", "paused"]))}
                      {field("category", "Kategorie")}
                    </>
                  )}
                  {choice("areaId", "Area", areas)}
                </div>
              </section>
            )}
            {(kind === "task" || kind === "project") && (
              <section className="grid gap-4 border-t border-[var(--border-subtle)] pt-5">
                <h2 className="text-lg text-[var(--accent-purple)]">
                  03 Beziehungen
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {kind === "task" &&
                    (id ? (
                      choice("projectId", "Project", projects)
                    ) : goalMilestoneContext ? (
                      <Choice
                        name="projectId"
                        label="Project-Kontext (optional)"
                        options={goalMilestoneContext.projects}
                        value={selectedProject}
                        onChange={setSelectedProject}
                      />
                    ) : (
                      <>
                        <Choice
                          name="projectId"
                          label="Project"
                          options={projects}
                          value={selectedProject}
                          onChange={setSelectedProject}
                          required={Boolean(projectContext)}
                          allowEmpty={!projectContext}
                        />
                        <Choice
                          key={selectedProject}
                          name="milestoneId"
                          label="Milestone (keine Auswahl = Ohne Milestone)"
                          value={
                            selectedProject === values.projectId
                              ? String(values.milestoneId ?? "")
                              : ""
                          }
                          options={milestones.filter(
                            (m) => m.projectId === selectedProject,
                          )}
                        />
                      </>
                    ))}
                  {goalMilestoneContext ? (
                    <div className="grid gap-2 text-sm">
                      <span>Ziel / Etappe</span>
                      <p className="text-[var(--text-secondary)]">
                        {goalMilestoneContext.goalTitle} ·{" "}
                        {goalMilestoneContext.milestoneTitle}
                      </p>
                      <input
                        type="hidden"
                        name="goalId"
                        value={goalMilestoneContext.goalId}
                      />
                      <input
                        type="hidden"
                        name="goalMilestoneId"
                        value={goalMilestoneContext.milestoneId}
                      />
                    </div>
                  ) : (
                    choice("goalId", "Direktes Goal", goals)
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  Weitere Ressourcen und Practice-Beziehungen verwaltest du an
                  der gespeicherten Entity.
                </p>
              </section>
            )}
          </>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-5">
          <button className={actionClass} type="submit">
            {pending
              ? "Speichern …"
              : id
                ? "Änderungen speichern"
                : skillOrigin
                  ? withoutSkill
                    ? "Aufgabe erstellen"
                    : "Übungsaufgabe erstellen"
                  : `${formEntityLabel} erstellen`}
          </button>
          {taskCapture && (
            <Link
              href={taskCancelHref}
              aria-disabled={skillOrigin && pending ? true : undefined}
              onClick={(event) => {
                if (skillOrigin && pending) event.preventDefault();
              }}
              className="min-h-10 content-center px-2 text-sm text-[var(--text-secondary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
            >
              Abbrechen
            </Link>
          )}
        </div>
      </fieldset>
      {unclearCreate && (
        <Link href="/tasks" className={actionClass}>
          Aufgaben prüfen
        </Link>
      )}
      {error && (
        <p role="alert" className="text-sm text-[var(--accent-red)]">
          {error}
        </p>
      )}
    </form>
  );
}
export function OperationForm({
  operation,
  label,
  children,
  disabled = false,
  closeOnSuccess = false,
  confirmMessage,
  submitClassName = actionClass,
  checkboxChecked,
  checkboxId,
}: {
  operation: string;
  label: string;
  children?: ReactNode;
  disabled?: boolean;
  closeOnSuccess?: boolean;
  confirmMessage?: string;
  submitClassName?: string;
  checkboxChecked?: boolean;
  checkboxId?: string;
}) {
  const hydrated = useHydrated();
  const closeDisclosure = useCloseManagementDisclosure();
  const { notify } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <form
      aria-label={label}
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        const form = new FormData(event.currentTarget);
        if (!form.get("commandId")) form.set("commandId", crypto.randomUUID());
        start(async () => {
          setError("");
          const r = await workbenchOperation(operation, form);
          if (r.status === "success") {
            notify(r.message);
            if (closeOnSuccess) closeDisclosure?.();
            router.refresh();
          } else setError(r.message);
        });
      }}
    >
      <fieldset
        disabled={!hydrated || pending || disabled}
        className="grid gap-3"
      >
        {children}
        {checkboxChecked === undefined ? (
          <button className={submitClassName} type="submit">
            {pending ? "Speichern …" : label}
          </button>
        ) : (
          <label className={submitClassName}>
            <input
              type="checkbox"
              id={checkboxId}
              aria-busy={pending}
              aria-label={label}
              checked={checkboxChecked}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            />
          </label>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-[var(--accent-red)]">
          {error}
        </p>
      )}
    </form>
  );
}
