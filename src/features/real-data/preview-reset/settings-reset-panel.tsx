"use client";
import { reloadPreviewDataset } from "./epoch-transport";
import { useId, useState, useTransition } from "react";
import {
  DashboardDialog,
  dashboardActionButtonClass,
  dashboardInputClass,
} from "@/components/dashboard/sections/dashboard-dialog";
import {
  preparePreviewResetAction,
  executePreviewResetAction,
  previewResetReceiptAction,
} from "../actions/preview-reset.actions";

type Challenge = {
  token: string;
  commandId: string;
  expires: number;
  epoch: string;
};
export function PreviewResetSettingsPanel() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const [pending, transition] = useTransition();
  const close = () => {
    if (!pending) {
      setOpen(false);
      setConfirmation("");
      setChallenge(null);
    }
  };
  function prepare() {
    setMessage("");
    setCompleted(false);
    setConfirmation("");
    setChallenge(null);
    setOpen(true);
    transition(async () => {
      try {
        const result = await preparePreviewResetAction();
        if (result.ok) setChallenge(result.challenge);
        else setMessage(result.message);
      } catch {
        setMessage("Vorbereitung fehlgeschlagen. Bitte erneut versuchen.");
      }
    });
  }
  function execute() {
    if (!challenge || confirmation !== "ZURÜCKSETZEN" || pending) return;
    transition(async () => {
      try {
        const result = await executePreviewResetAction({
          token: challenge.token,
          commandId: challenge.commandId,
          confirmation,
        });
        if (result.ok) {
          setCompleted(true);
          setMessage(
            "Testdaten zurückgesetzt. Bitte neu laden, bevor du neue Daten anlegst.",
          );
        } else setMessage(result.message);
      } catch {
        setMessage(
          "Antwort nicht angekommen. Bitte den Status prüfen; ein erneuter Aufruf mit dieser Bestätigung löscht nicht nochmals.",
        );
      }
    });
  }
  function receipt() {
    if (!challenge) return;
    transition(async () => {
      try {
        const result = await previewResetReceiptAction({
          commandId: challenge.commandId,
        });
        if (result.ok && result.receipt) {
          setCompleted(true);
          setMessage(
            "Testdaten zurückgesetzt. Bitte neu laden, bevor du neue Daten anlegst.",
          );
        } else
          setMessage(
            "Kein bestätigter Reset für diesen Aufruf. Bitte neu vorbereiten.",
          );
      } catch {
        setMessage(
          "Status aktuell nicht erreichbar. Bitte später erneut prüfen.",
        );
      }
    });
  }
  return (
    <section
      aria-labelledby={`${id}-panel`}
      className="mx-auto mt-3 w-full max-w-[2208px] rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4"
    >
      <h2 id={`${id}-panel`} className="text-sm font-semibold">
        Testbetrieb
      </h2>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Persönliche Preview · Alle manuellen Testdaten dieser Instanz entfernen.
      </p>
      <button
        type="button"
        className={`${dashboardActionButtonClass} mt-3 min-h-11`}
        onClick={prepare}
      >
        Testdaten zurücksetzen…
      </button>
      <DashboardDialog labelledBy={`${id}-title`} open={open} onClose={close}>
        <div className="p-5" aria-busy={pending}>
          <h2 id={`${id}-title`} className="text-base font-semibold">
            Alle Testdaten zurücksetzen?
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Entfernt alle manuellen Daten: Aufgaben, Inbox, Bereiche, Ziele und
            Projekte einschließlich Archive, Reviews, History, Belege und
            Receipts; Ressourcen und Notizen; Gewohnheiten, Health, Fitness und
            Ernährung; Journal, Coding, Education, Work, Shop, Challenges und
            Anti-Rot.
          </p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Erhalten bleiben dein Profil, Anmeldung und Preview-Betrieb sowie
            Demo-Daten, externe Dateien, Backups und Exports. Diese
            Datenlöschung lässt sich hier nicht rückgängig machen.
          </p>
          {!completed && (
            <label className="mt-4 block text-sm" htmlFor={`${id}-confirm`}>
              Zur Bestätigung exakt <strong>ZURÜCKSETZEN</strong> eingeben
              <input
                id={`${id}-confirm`}
                autoComplete="off"
                spellCheck={false}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={pending || !challenge}
                className={`${dashboardInputClass} min-h-11`}
              />
            </label>
          )}
          <p role="status" aria-live="polite" className="mt-3 text-sm">
            {pending ? "Wird geprüft und ausgeführt… Bitte warten." : message}
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {!completed && (
              <button
                type="button"
                className={`${dashboardActionButtonClass} min-h-11`}
                disabled={pending}
                onClick={close}
                autoFocus
              >
                Abbrechen
              </button>
            )}
            {!completed && message && (
              <button
                type="button"
                className={`${dashboardActionButtonClass} min-h-11`}
                disabled={pending}
                onClick={receipt}
              >
                Status prüfen
              </button>
            )}
            {!completed && message && (
              <button
                type="button"
                className={`${dashboardActionButtonClass} min-h-11`}
                disabled={pending}
                onClick={prepare}
              >
                Neu vorbereiten
              </button>
            )}
            {completed ? (
              <button
                type="button"
                className={`${dashboardActionButtonClass} min-h-11`}
                onClick={reloadPreviewDataset}
              >
                Neu laden
              </button>
            ) : (
              <button
                type="button"
                className={`${dashboardActionButtonClass} min-h-11 text-[var(--accent-red)]`}
                disabled={
                  pending || !challenge || confirmation !== "ZURÜCKSETZEN"
                }
                onClick={execute}
              >
                Alle Testdaten löschen
              </button>
            )}
          </div>
        </div>
      </DashboardDialog>
    </section>
  );
}
