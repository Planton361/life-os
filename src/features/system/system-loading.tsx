export function SystemLoadingPage({
  title,
}: Readonly<{
  title: string;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-3 pb-8">
      <div className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.78)] p-4">
        <div className="h-3 w-24 rounded-full bg-[rgba(168,183,204,.12)]" />
        <div className="mt-3 h-8 w-44 rounded-full bg-[rgba(168,183,204,.14)]" />
        <p className="sr-only">Loading {title}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]">
        <div className="h-72 rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.68)]" />
        <div className="h-72 rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.58)]" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {["one", "two", "three"].map((item) => (
          <div
            className="h-40 rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.52)]"
            key={item}
          />
        ))}
      </div>
    </div>
  );
}

