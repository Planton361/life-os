"use client";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { skillDevelopmentCommand } from "@/features/real-data/actions/skill-development.actions";
import type { SkillCommandOperation } from "@/features/real-data/schemas/skill-development.schema";
import { actionClass } from "./forms";
import { useToast } from "@/components/feedback/toast-provider";
export function SkillCommandForm({
  operation,
  skillId,
  revision,
  label,
  payload = {},
  children,
  preview,
}: {
  operation: SkillCommandOperation;
  skillId: string | null;
  revision: number | null;
  label: string;
  payload?: Record<string, unknown>;
  children?: ReactNode;
  preview?: ReactNode;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [prepared, setPrepared] = useState<{
    payload: Record<string, unknown>;
    revision: number | null;
    evidenceLabels: string[];
  } | null>(null);
  const key = useRef<{ request: string; id: string } | null>(null);
  function cancel(form: HTMLFormElement) {
    setPrepared(null);
    setMessage("");
    form.reset();
    const details = form.closest("details");
    if (details) {
      details.open = false;
      details.querySelector("summary")?.focus();
    }
  }
  function submit(data: Record<string, unknown>, expected: number | null) {
    const request = JSON.stringify({ operation, skillId, expected, data });
    if (key.current?.request !== request)
      key.current = { request, id: crypto.randomUUID() };
    const commandId = key.current.id;
    start(async () => {
      const result = await skillDevelopmentCommand({
        operation,
        commandId,
        skillId,
        expectedRevision: expected,
        payload: data,
      });
      setMessage(result.message);
      if (result.status === "success") {
        notify(result.message);
        setPrepared(null);
        if (operation === "skill.create" && result.result)
          router.push(`/skills/${result.result.skill_id}`);
        else router.refresh();
      }
    });
  }
  return (
    <form
      aria-label={label}
      className="grid min-w-0 gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (prepared) {
          submit(prepared.payload, prepared.revision);
          return;
        }
        const fd = new FormData(event.currentTarget);
        const data: Record<string, unknown> = { ...payload };
        for (const [name, value] of fd.entries())
          if (name !== "evidence")
            data[name] = typeof value === "string" ? value || null : value;
        if (operation.startsWith("evidence.")) {
          if (fd.has("sourceReference")) {
            const [type, id] = String(fd.get("sourceReference")).split(":");
            data.source_type = type;
            data.source_id = id || null;
            delete data.sourceReference;
          }
          if (fd.has("weight"))
            data.weight = fd.get("weight") ? Number(fd.get("weight")) : null;
        }
        if (operation === "review.submit") {
          data.open_milestones_acknowledged =
            fd.get("open_milestones_acknowledged") === "on";
          data.evidence = fd.getAll("evidence").map((v) => {
            const [id, version] = String(v).split(":");
            return { id, revision: Number(version) };
          });
          setPrepared({
            payload: data,
            revision,
            evidenceLabels: Array.from(
              event.currentTarget.querySelectorAll<HTMLInputElement>(
                'input[name="evidence"]:checked',
              ),
            ).map((e) => e.parentElement?.textContent?.trim() ?? ""),
          });
          return;
        }
        submit(data, revision);
      }}
    >
      {!prepared ? (
        <fieldset disabled={pending} className="grid min-w-0 gap-3">
          {children}
        </fieldset>
      ) : (
        <section
          aria-label="Review-Vorschau"
          className="grid gap-2 rounded-lg border border-[var(--border-subtle)] p-3"
        >
          <h4 className="font-semibold">Review prüfen</h4>
          {preview}
          <ul>
            {prepared.evidenceLabels.map((title, index) => (
              <li key={index}>{title}</li>
            ))}
          </ul>
          <p>
            Entscheidung:{" "}
            {prepared.payload.decision === "completed"
              ? "Abgeschlossen"
              : prepared.payload.decision === "retired"
                ? "Beendet"
                : "Weiterentwickeln"}
          </p>
          <p className="whitespace-pre-wrap break-words">
            {String(prepared.payload.note)}
          </p>
          <p>
            {(prepared.payload.evidence as unknown[]).length} ausdrücklich
            ausgewählte Evidence-Versionen. Ohne Auswahl wird ohne Evidence
            reviewed.
          </p>
          <p>Dieser Review verändert keine Tasks oder Goal-Erreichung.</p>
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={actionClass} disabled={pending}>
          {pending
            ? "Speichern …"
            : prepared
              ? "Review speichern"
              : operation === "review.submit"
                ? "Review prüfen"
                : label}
        </button>
        {children && (
          <button
            type="button"
            className="min-h-10 px-3 text-sm underline"
            disabled={pending}
            onClick={(event) => cancel(event.currentTarget.form!)}
          >
            Abbrechen
          </button>
        )}
      </div>
      {message && (
        <p role="status" aria-live="polite" className="break-words text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
