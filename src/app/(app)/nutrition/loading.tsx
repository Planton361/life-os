function SkeletonLine({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div
      className={`rounded-full bg-[rgba(23,34,53,.58)] ${className}`}
      aria-hidden="true"
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

export default function NutritionLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading nutrition overview"
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6"
    >
      <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
        <div className="grid gap-3 bg-[linear-gradient(90deg,rgba(217,146,79,.055),transparent_46%)] px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <SkeletonLine className="h-3 w-40" />
            <SkeletonLine className="mt-3 h-8 w-72 max-w-full" />
            <SkeletonLine className="mt-3 h-4 w-[min(520px,100%)]" />
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <SkeletonLine className="h-10 w-40 rounded-[12px]" />
            <SkeletonLine className="h-10 w-36 rounded-[12px]" />
            <SkeletonLine className="h-10 w-28 rounded-[12px]" />
          </div>
        </div>
      </header>

      <div className="grid gap-2 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SkeletonPanel titleWidth="w-56" />
        </div>
        <div className="xl:col-span-5">
          <SkeletonPanel titleWidth="w-40" />
        </div>
      </div>
      <div className="grid gap-2 xl:grid-cols-3">
        <SkeletonPanel />
        <SkeletonPanel />
        <SkeletonPanel />
      </div>
    </div>
  );
}
