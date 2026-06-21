function LoadingBlock({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div
      className={`animate-pulse rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] ${className}`}
    />
  );
}

export default function WorkWikiLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-4 pb-8">
      <LoadingBlock className="min-h-[170px]" />
      <LoadingBlock className="min-h-[128px]" />
      <LoadingBlock className="min-h-[240px]" />
      <LoadingBlock className="min-h-[220px]" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <LoadingBlock className="min-h-[520px]" />
        <div className="grid gap-4">
          <LoadingBlock className="min-h-[300px]" />
          <LoadingBlock className="min-h-[220px]" />
        </div>
      </div>
    </div>
  );
}
