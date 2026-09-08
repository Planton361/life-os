"use client";
import {
  useId,
  useState,
  useTransition,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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
const subscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
export const fieldClass =
  "min-h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm outline-none focus:border-[var(--focus-ring)]";
export const actionClass =
  "min-h-10 rounded-lg border border-[var(--border-default)] bg-[rgba(95,200,215,.12)] px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50";
export function Choice({
  name,
  label,
  options,
  value,
  required = false,
}: {
  name: string;
  label: string;
  options: Option[];
  value?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className={fieldClass}
        defaultValue={value ?? ""}
        name={name}
        required={required}
      >
        <option value="">Keine Auswahl</option>
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
}: {
  name: string;
  label: string;
  values: FieldValues;
  type?: string;
  required?: boolean;
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
          min={type === "number" ? 1 : undefined}
          minLength={required ? (name === "name" ? 1 : 2) : undefined}
        />
      )}
    </label>
  );
}
const opts = (values: readonly string[]) =>
  values.map((id) => ({ id, title: id }));
export function EntityForm({
  kind,
  id,
  values,
  areas,
  projects,
  goals,
  archived = false,
  sourceOwned = false,
  projectContext,
}: {
  kind: WorkbenchKind;
  id?: string;
  projectContext?: string;
  values: FieldValues;
  areas: Option[];
  projects: Option[];
  goals: Option[];
  archived?: boolean;
  sourceOwned?: boolean;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
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
      aria-label={`${entityLabels[kind]} ${id ? "bearbeiten" : "erstellen"}`}
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        start(async () => {
          setError("");
          const r = await saveWorkbenchEntity(kind, id ?? null, form);
          if (r.status !== "success") {
            setError(r.message);
            return;
          }
          notify(r.message);
          if (!id && r.id)
            router.push(
              `${entityRoutes[kind]}/${r.id}${projectContext ? `?project=${projectContext}` : ""}`,
            );
          else router.refresh();
        });
      }}
    >
      <fieldset
        disabled={!hydrated || pending || archived}
        className="grid gap-6"
      >
        <section className="grid gap-4">
          <h2 className="text-lg text-[var(--accent-cyan)]">01 Grundlagen</h2>
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
          {kind === "project" && field("nextStep", "Next Step")}
          {kind === "goal" &&
            field("why", "Desired Outcome / Warum", "textarea")}
          {kind === "resource" && (
            <section aria-label="Externe Referenz" className="grid gap-4">
              <h3 className="text-sm font-semibold">
                Referenz & Klassifikation
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                Externe Dokumente, Repositories und andere Quellen bleiben an
                ihrem Speicherort. Hier hältst du Link und Kontext fest.
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
                    sourceOwned || values.status === "done" ? (
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
                  {choice("energy", "Energy", opts(["low", "medium", "high"]))}
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
                  {choice(
                    "status",
                    "Status",
                    opts(["idea", "active", "paused", "blocked", "completed"]),
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
                  {choice(
                    "status",
                    "Status",
                    opts(["draft", "active", "paused", "achieved"]),
                  )}
                  {choice(
                    "horizon",
                    "Horizon",
                    opts(["week", "month", "quarter", "year", "someday"]),
                  )}
                  {field("targetDate", "Target Date", "date")}
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
              {kind === "task" && choice("projectId", "Project", projects)}
              {choice("goalId", "Direktes Goal", goals)}
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Weitere Ressourcen und Practice-Beziehungen verwaltest du an der
              gespeicherten Entity.
            </p>
          </section>
        )}
        <div className="border-t border-[var(--border-subtle)] pt-5">
          <button className={actionClass} type="submit">
            {pending
              ? "Speichern …"
              : id
                ? "Änderungen speichern"
                : `${entityLabels[kind]} erstellen`}
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
export function OperationForm({
  operation,
  label,
  children,
  disabled = false,
}: {
  operation: string;
  label: string;
  children?: ReactNode;
  disabled?: boolean;
}) {
  const hydrated = useHydrated();
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
        const form = new FormData(event.currentTarget);
        start(async () => {
          setError("");
          const r = await workbenchOperation(operation, form);
          if (r.status === "success") {
            notify(r.message);
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
        <button className={actionClass} type="submit">
          {pending ? "Speichern …" : label}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-[var(--accent-red)]">
          {error}
        </p>
      )}
    </form>
  );
}
