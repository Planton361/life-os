function SkeletonLine({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-full bg-[rgba(23,34,53,.58)] ${className}`}
    />
  );
}

function SkeletonPanel() {
  return (
    <section className="overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.44)] px-4 py-3">
        <SkeletonLine className="h-5 w-44" />
        <SkeletonLine className="mt-2 h-3 w-64 max-w-full" />
      </div>
      <div className="grid gap-3 p-4">
        <SkeletonLine className="h-20 w-full rounded-[14px]" />
        <SkeletonLine className="h-20 w-full rounded-[14px]" />
        <SkeletonLine className="h-20 w-full rounded-[14px]" />
      </div>
    </section>
  );
}

export default function MealPlannerLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading meal planner"
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-3 pb-6"
    >
      <header className="overflow-hidden rounded-[18px] border border-[rgba(216,180,90,.18)] bg-[rgba(15,23,36,.80)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
        <div className="grid gap-4 bg-[rgba(217,146,79,.055)] px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <SkeletonLine className="h-3 w-52" />
            <SkeletonLine className="mt-3 h-8 w-72 max-w-full" />
            <SkeletonLine className="mt-3 h-4 w-[min(520px,100%)]" />
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <SkeletonLine className="h-11 w-36 rounded-[12px]" />
            <SkeletonLine className="h-11 w-32 rounded-[12px]" />
            <SkeletonLine className="h-11 w-28 rounded-[12px]" />
          </div>
        </div>
      </header>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] xl:items-start">
        <SkeletonPanel />
        <div className="grid gap-3">
          <SkeletonPanel />
          <SkeletonPanel />
        </div>
      </div>
    </div>
  );
}
