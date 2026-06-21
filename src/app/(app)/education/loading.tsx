function LoadingBlock({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div
      className={`animate-pulse rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] ${className}`}
    />
  );
}

export default function EducationLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-4 pb-8">
      <LoadingBlock className="min-h-[180px]" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <LoadingBlock className="min-h-[84px]" />
        <LoadingBlock className="min-h-[84px]" />
        <LoadingBlock className="min-h-[84px]" />
        <LoadingBlock className="min-h-[84px]" />
      </div>
      <LoadingBlock className="min-h-[360px]" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
        <LoadingBlock className="min-h-[520px]" />
        <LoadingBlock className="min-h-[520px]" />
      </div>
    </div>
  );
}
