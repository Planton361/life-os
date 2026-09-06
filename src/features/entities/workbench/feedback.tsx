"use client";
export function WorkbenchError({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="mx-auto grid max-w-xl gap-4 p-6">
      <h1 className="text-xl font-semibold">
        Entity konnte nicht geladen werden
      </h1>
      <p>
        Die lokale Verbindung ist derzeit nicht verfügbar. Deine gespeicherten
        Daten bleiben erhalten.
      </p>
      <button
        onClick={reset}
        className="rounded-lg border border-[var(--border-default)] px-4 py-2"
      >
        Erneut versuchen
      </button>
    </section>
  );
}
export function WorkbenchLoading() {
  return (
    <p role="status" className="p-6 text-[var(--text-muted)]">
      Entity wird geladen …
    </p>
  );
}
