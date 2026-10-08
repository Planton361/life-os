"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/toast-provider";
import { saveTaskResource } from "@/features/real-data/actions/task-resource.actions";
import {
  ManagementDialog,
  useCloseManagementDisclosure,
} from "./management-disclosure";
import { fieldClass } from "./form-styles";
import styles from "./task-read-view.module.css";

type Result = Awaited<ReturnType<typeof saveTaskResource>>;

function ResourceForm({
  taskId,
  type,
  onResult,
}: {
  taskId: string;
  type: "note" | "link";
  onResult: (result: Result | null) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const requestId = useRef<string | null>(null);
  const submitting = useRef(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const close = useCloseManagementDisclosure();
  const router = useRouter();
  const { notify } = useToast();
  return (
    <form
      ref={formRef}
      aria-label={
        type === "note" ? "Task-Notiz speichern" : "Externen Link speichern"
      }
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true;
        requestId.current ??= crypto.randomUUID();
        const form = new FormData(event.currentTarget);
        form.set("taskId", taskId);
        form.set("type", type);
        form.set("requestId", requestId.current);
        start(async () => {
          try {
            const saved = await saveTaskResource(form);
            setResult(saved);
            onResult(saved);
            if (saved.status !== "success") {
              notify(saved.message, "error");
              return;
            }
            notify(saved.message);
            formRef.current?.reset();
            requestId.current = null;
            setResult(null);
            onResult(null);
            close?.();
            router.refresh();
          } catch {
            const failed: Result = {
              status: "error",
              message:
                "Speichern nicht bestätigt. Entwurf bleibt erhalten; bitte denselben Eintrag erneut versuchen.",
            };
            setResult(failed);
            onResult(failed);
            notify(failed.message, "error");
          } finally {
            submitting.current = false;
          }
        });
      }}
    >
      <fieldset disabled={pending} className="grid gap-4">
        {type === "note" ? (
          <label className="grid gap-1 text-sm">
            Notiz
            <textarea
              className={fieldClass}
              name="body"
              rows={3}
              maxLength={600}
              required
              readOnly={result?.status === "partial"}
              placeholder="Kurze Info oder Erkenntnis festhalten …"
            />
          </label>
        ) : (
          <>
            <label className="grid gap-1 text-sm">
              URL
              <input
                className={fieldClass}
                name="url"
                type="url"
                maxLength={2048}
                required
                readOnly={result?.status === "partial"}
                placeholder="https://github.com/…"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Titel (optional)
              <input
                className={fieldClass}
                name="title"
                maxLength={160}
                readOnly={result?.status === "partial"}
                placeholder="z. B. GitHub-Repository"
              />
            </label>
          </>
        )}
      </fieldset>
      {result && result.status !== "success" && (
        <p role="alert" className="text-sm text-[var(--text-secondary)]">
          {result.message}
          {result.resourceId && (
            <>
              {" "}
              <Link
                className="underline"
                href={`/resources/${result.resourceId}`}
              >
                Resource prüfen
              </Link>
            </>
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={styles.buttonSmall}>
          {pending
            ? "Speichert …"
            : result?.status === "partial"
              ? "Verknüpfung erneut versuchen"
              : "Speichern"}
        </button>
        <button
          type="button"
          disabled={pending}
          className={styles.quietSmall}
          onClick={() => {
            // Failed/uncertain writes retain both draft and retry identity on close.
            if (!result) {
              formRef.current?.reset();
              requestId.current = null;
            }
            close?.();
          }}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

export function TaskResourceComposer({
  taskId,
  type,
}: {
  taskId: string;
  type: "note" | "link";
}) {
  const [result, setResult] = useState<Result | null>(null);
  return (
    <>
      <ManagementDialog
        label={
          type === "note" ? "Task-Notiz hinzufügen" : "Externen Link hinzufügen"
        }
        triggerText={type === "note" ? "+ Notiz" : "+ Link"}
        triggerClassName={styles.resourceAdd}
        panelClassName={styles.resourceDialog}
      >
        <ResourceForm taskId={taskId} type={type} onResult={setResult} />
      </ManagementDialog>
      {result?.resourceId && result.status !== "success" && (
        <p role="alert" className={styles.resourceRecovery}>
          {result.message}{" "}
          <Link href={`/resources/${result.resourceId}`}>Resource prüfen</Link>
        </p>
      )}
    </>
  );
}
