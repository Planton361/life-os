import Link from "next/link";

export function PreparedEmptyLifeSurface({
  description,
  title,
}: Readonly<{
  description: string;
  title: string;
}>) {
  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6"
      data-life-empty-state="prepared"
    >
      <header className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-purple)]">
          Life OS / Life
        </p>
        <h1 className="mt-1 text-[24px] font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
          {description}
        </p>
      </header>

      <section className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.84)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Prepared / Empty
        </p>
        <h2 className="mt-1 text-[18px] font-semibold text-[var(--text-primary)]">
          Keine lokalen Entwürfe im Empty-Profil
        </h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[var(--text-muted)]">
          Diese Fläche zeigt keine Demo-Daten und erzeugt weder Session- noch Browserzustand. Echte Journal-, Notiz-, Inventory- und Wishlist-Writes benötigen ein authentifiziertes Manual-Profil.
        </p>
        <Link
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          href="/settings"
        >
          Manual-Profil und Auth öffnen
        </Link>
      </section>
    </div>
  );
}
