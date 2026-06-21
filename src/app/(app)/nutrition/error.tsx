"use client";

export default function NutritionError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 rounded-[18px] border border-[rgba(221,107,95,.32)] bg-[rgba(15,23,36,.76)] p-5 shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-red)]">
          Nutrition / Error
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
          Nutrition overview could not load
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Loading failed before the local nutrition view could be prepared. No
          meal or hydration data was changed.
        </p>
      </div>
      <div className="rounded-[14px] border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.10)] p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          Critical load failure
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          {error.message || "Unexpected route error."}
        </p>
      </div>
      <button
        className="w-fit rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] px-4 py-2 text-[11px] font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        onClick={reset}
        type="button"
      >
        Retry
      </button>
    </div>
  );
}
