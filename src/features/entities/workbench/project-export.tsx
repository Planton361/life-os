"use client";
import { useState, useSyncExternalStore } from "react";
import { useToast } from "@/components/feedback/toast-provider";
const subscribe = () => () => {};
export function ProjectExport({ projectId }: { projectId: string }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [pending, setPending] = useState(false);
  const { notify } = useToast();
  async function download() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/obsidian`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const result = await response.json();
        notify(
          result.message ?? "Export konnte nicht erstellt werden.",
          "error",
        );
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const encodedName = response.headers
        .get("Content-Disposition")
        ?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      anchor.download = encodedName
        ? decodeURIComponent(encodedName)
        : "Life-OS-Project.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Obsidian-Export erstellt. Download gestartet.");
    } catch {
      notify(
        "Export konnte nicht geladen werden. Bitte erneut versuchen.",
        "error",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <button
      type="button"
      disabled={pending || !hydrated}
      aria-busy={pending}
      onClick={download}
      className="min-h-10 text-left text-sm text-[var(--text-secondary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-60"
    >
      {pending ? "Export wird erstellt …" : "Für Obsidian exportieren"}
    </button>
  );
}
