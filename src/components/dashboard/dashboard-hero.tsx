import type { DashboardHeroData } from "@/features/dashboard/types";

interface DashboardHeroProps {
  hero: DashboardHeroData;
}

export function DashboardHero({ hero }: DashboardHeroProps) {
  const meta = [
    { label: "Tagesfokus", value: hero.dayFocus },
    { label: "Review", value: hero.review },
    { label: "Woche", value: hero.week },
  ];

  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-[var(--shadow-soft)] md:p-5">
      <div className="max-w-2xl">
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
          Life OS Dashboard
        </p>
        <h1 className="text-2xl font-semibold leading-8 text-foreground md:text-[2rem] md:leading-10">
          {hero.title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
          {hero.text}
        </p>
      </div>
      <dl className="mt-4 grid gap-2 md:grid-cols-3">
        {meta.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border/70 bg-[var(--life-surface-subtle)] p-2.5"
          >
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              {item.label}
            </dt>
            <dd className="mt-1 text-sm font-medium leading-5 text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
