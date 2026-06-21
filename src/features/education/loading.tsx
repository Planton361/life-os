function LoadingBlock({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div
      className={`animate-pulse rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.58)] ${className}`}
    />
  );
}

export function EducationSubpageLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-4 pb-8">
      <LoadingBlock className="min-h-[178px]" />
      <LoadingBlock className="min-h-[104px]" />
      <LoadingBlock className="min-h-[380px]" />
      <div className="grid gap-4 xl:grid-cols-2">
        <LoadingBlock className="min-h-[320px]" />
        <LoadingBlock className="min-h-[320px]" />
      </div>
    </div>
  );
}
