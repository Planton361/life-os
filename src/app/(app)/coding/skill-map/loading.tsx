function SkeletonLine({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-full bg-[rgba(23,34,53,.58)] ${className}`}
    />
  );
}

function SkeletonPanel({
  className = "",
  rows = 3,
}: Readonly<{
  className?: string;
  rows?: number;
}>) {
  return (
    <section
      className={`overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)] ${className}`}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
        <SkeletonLine className="h-5 w-48" />
        <SkeletonLine className="mt-2 h-3 w-64 max-w-full" />
      </div>
      <div className="grid gap-3 p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonLine
            className={index === rows - 1 ? "h-12 rounded-[12px]" : "h-4 w-full"}
            key={index}
          />
        ))}
      </div>
    </section>
  );
}

export default function SkillMapLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading skill map"
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6"
    >
      <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
        <div className="grid gap-3 bg-[linear-gradient(90deg,rgba(91,124,250,.055),rgba(95,200,215,.045)_50%,transparent_74%)] px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <SkeletonLine className="h-3 w-28" />
            <SkeletonLine className="mt-3 h-8 w-48 max-w-full" />
            <SkeletonLine className="mt-3 h-4 w-[min(560px,100%)]" />
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <SkeletonLine className="h-11 w-28 rounded-[12px]" />
            <SkeletonLine className="h-11 w-32 rounded-[12px]" />
            <SkeletonLine className="h-11 w-36 rounded-[12px]" />
          </div>
        </div>
      </header>

      <section className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.2fr)_repeat(4,minmax(140px,.75fr))_minmax(160px,.75fr)]">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonLine className="h-11 rounded-[12px]" key={index} />
          ))}
        </div>
      </section>

      <div className="grid gap-2 xl:grid-cols-12">
        <SkeletonPanel className="xl:col-span-8" rows={7} />
        <SkeletonPanel className="xl:col-span-4" rows={6} />
        <SkeletonPanel className="xl:col-span-4" rows={5} />
        <SkeletonPanel className="xl:col-span-8" rows={5} />
        <SkeletonPanel className="xl:col-span-4" rows={4} />
        <SkeletonPanel className="xl:col-span-4" rows={4} />
      </div>
    </div>
  );
}
