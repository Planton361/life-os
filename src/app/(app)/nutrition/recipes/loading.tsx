export default function RecipesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 pb-8">
      <div className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 shadow-[0_8px_22px_rgba(0,0,0,.12)]">
        <div className="h-3 w-44 rounded-full bg-[rgba(168,183,204,.10)]" />
        <div className="mt-4 h-8 w-48 rounded-full bg-[rgba(168,183,204,.12)]" />
        <div className="mt-3 h-4 max-w-2xl rounded-full bg-[rgba(168,183,204,.08)]" />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <div className="h-4 w-36 rounded-full bg-[rgba(168,183,204,.10)]" />
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                className="h-36 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)]"
                key={index}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <div className="h-4 w-40 rounded-full bg-[rgba(168,183,204,.10)]" />
          <div className="mt-4 h-72 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)]" />
        </div>
      </div>
    </div>
  );
}
