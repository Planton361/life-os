function SkeletonLine({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-full bg-[rgba(23,34,53,.58)] ${className}`}
    />
  );
}

function SkeletonPanel({
  rows = 3,
}: Readonly<{
  rows?: number;
}>) {
  return (
    <section className="overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.44)] px-4 py-3">
        <SkeletonLine className="h-5 w-44" />
        <SkeletonLine className="mt-2 h-3 w-64 max-w-full" />
      </div>
      <div className="grid gap-3 p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonLine className="h-20 w-full rounded-[14px]" key={index} />
        ))}
      </div>
    </section>
  );
}

export default function GroceryLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading grocery workflow"
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-3 pb-6"
    >
      <header className="overflow-hidden rounded-[18px] border border-[rgba(216,180,90,.18)] bg-[rgba(15,23,36,.80)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
        <div className="grid gap-4 bg-[rgba(216,180,90,.052)] px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <SkeletonLine className="h-3 w-48" />
            <SkeletonLine className="mt-3 h-8 w-64 max-w-full" />
            <SkeletonLine className="mt-3 h-4 w-[min(560px,100%)]" />
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <SkeletonLine className="h-11 w-36 rounded-[12px]" />
            <SkeletonLine className="h-11 w-32 rounded-[12px]" />
            <SkeletonLine className="h-11 w-32 rounded-[12px]" />
          </div>
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonLine className="h-16 rounded-[16px]" key={index} />
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)] xl:items-start">
        <SkeletonPanel rows={5} />
        <div className="grid gap-3">
          <SkeletonPanel rows={4} />
          <SkeletonPanel rows={2} />
          <SkeletonPanel rows={3} />
        </div>
      </div>
    </div>
  );
}
