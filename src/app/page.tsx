import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg-app)] px-6 text-[var(--text-primary)]">
      <div className="w-full max-w-sm rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-1)] p-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Command Center
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
          Life OS
        </h1>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition hover:border-[var(--accent-cyan)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
          href="/dashboard"
        >
          Dashboard öffnen
        </Link>
      </div>
    </main>
  );
}
