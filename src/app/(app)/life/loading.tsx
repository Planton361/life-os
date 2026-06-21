function SkeletonLine({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-full bg-[rgba(23,34,53,.58)] ${className}`}
    />
  );
}

function SkeletonPanel({
  titleWidth = "w-48",
}: Readonly<{
  titleWidth?: string;
}>) {
  return (
    <section className="overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
        <SkeletonLine className={`h-5 ${titleWidth}`} />
        <SkeletonLine className="mt-2 h-3 w-64 max-w-full" />
      </div>
      <div className="grid gap-3 p-4">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-11/12" />
        <SkeletonLine className="h-4 w-9/12" />
        <SkeletonLine className="h-10 w-32 rounded-[12px]" />
      </div>
    </section>
  );
}

export default function LifeLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading life overview"
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6"
    >
      <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
        <div className="grid gap-3 bg-[linear-gradient(90deg,rgba(155,124,246,.07),transparent_48%)] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <SkeletonLine className="h-3 w-48" />
            <SkeletonLine className="mt-3 h-8 w-72 max-w-full" />
            <SkeletonLine className="mt-3 h-4 w-[min(520px,100%)]" />
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <SkeletonLine className="h-11 w-40 rounded-[12px]" />
            <SkeletonLine className="h-11 w-32 rounded-[12px]" />
            <SkeletonLine className="h-11 w-36 rounded-[12px]" />
          </div>
        </div>
      </header>

      <SkeletonPanel titleWidth="w-56" />

      <section className="grid gap-2 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.68)] p-2 sm:grid-cols-5">
        <SkeletonLine className="h-9 rounded-full" />
        <SkeletonLine className="h-9 rounded-full" />
        <SkeletonLine className="h-9 rounded-full" />
        <SkeletonLine className="h-9 rounded-full" />
        <SkeletonLine className="h-9 rounded-full" />
      </section>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonPanel titleWidth="w-28" />
        <SkeletonPanel titleWidth="w-24" />
        <SkeletonPanel titleWidth="w-36" />
        <SkeletonPanel titleWidth="w-32" />
      </div>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        <SkeletonPanel titleWidth="w-36" />
        <SkeletonPanel titleWidth="w-56" />
      </div>
    </div>
  );
}
