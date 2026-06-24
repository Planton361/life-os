import { accentStyle } from "@/components/layout/route-page-primitives";
import type { MentalHealthViewModel } from "../types";
import {
  ActionLink,
  DotRhythm,
  HealthPanel,
  SectionEmptyState,
  barHeightStyle,
} from "./health-overview-primitives";

export function MentalHealthPanel({
  data,
}: Readonly<{
  data: MentalHealthViewModel;
}>) {
  return (
    <HealthPanel
      accent="var(--accent-purple)"
      badge={data.badge}
      subtitle={data.subtitle}
      title={data.title}
    >
      <div className="grid min-h-0 gap-3 xl:flex xl:flex-1 xl:flex-col min-[1900px]:justify-between min-[1900px]:gap-4">
        <section
          aria-labelledby="mood-directions-heading"
            className="rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-3 min-[1900px]:p-4"
        >
          <h3
            className="text-[11px] font-semibold text-[var(--text-secondary)]"
            id="mood-directions-heading"
          >
            {data.moodTitle}
          </h3>
          {data.moodDirections.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3 min-[1900px]:gap-3">
              {data.moodDirections.map((mood, index) => (
              <article
                className="grid min-w-0 grid-cols-[24px_minmax(0,1fr)] gap-2 rounded-[10px] border border-[rgba(148,163,184,.08)] bg-[rgba(15,23,36,.56)] px-2.5 py-2"
                key={`mental-mood-${index}`}
                style={accentStyle(mood.accent)}
              >
                <span
                  aria-hidden="true"
                  className="grid size-6 place-items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[10px] font-semibold text-[var(--accent)]"
                >
                  {mood.mark}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
                      {mood.label}
                    </p>
                    <p className="shrink-0 text-[10px] text-[var(--text-muted)]">
                      {mood.daysLabel}
                    </p>
                  </div>
                  <div className="mt-2">
                    <DotRhythm
                      accent={mood.accent}
                      dense
                      label={`${mood.label} mood rhythm, ${mood.daysLabel}`}
                      pattern={mood.pattern}
                    />
                  </div>
                </div>
              </article>
              ))}
            </div>
          ) : (
            <SectionEmptyState
              className="mt-3"
              description="Check-ins erscheinen hier, sobald du sie lokal erfasst."
              title="Noch keine Check-ins"
            />
          )}
        </section>

        <div className="grid gap-3 md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] xl:flex-1 min-[1900px]:min-h-[190px]">
          <section
            aria-labelledby="sleep-summary-heading"
            className="rounded-[13px] border border-[rgba(91,124,250,.16)] bg-[rgba(91,124,250,.06)] p-3 min-[1900px]:flex min-[1900px]:flex-col min-[1900px]:justify-center min-[1900px]:p-4"
          >
            <h3
              className="text-[10px] font-semibold text-[var(--text-muted)]"
              id="sleep-summary-heading"
            >
              {data.sleep.label}
            </h3>
            <p className="mt-1 text-[26px] font-semibold leading-none text-[var(--text-primary)] xl:text-[22px]">
              {data.sleep.value}
            </p>
            <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-secondary)]">
              {data.sleep.detail}
            </p>
          </section>

          <section
            aria-label="Sleep rhythm for the last 7 days"
            className="flex min-h-[112px] items-end gap-2 rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] px-3 py-3 min-[1900px]:min-h-[190px] min-[1900px]:gap-3 min-[1900px]:px-4 min-[1900px]:py-4"
          >
            {data.sleep.bars.length > 0 ? (
              data.sleep.bars.map((bar, index) => (
              <div
                aria-label={`${bar.day}: ${bar.label}`}
                className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1"
                key={`mental-sleep-bar-${index}`}
                role="img"
              >
                <div className="flex h-16 items-end rounded-full bg-[rgba(82,97,120,.18)] min-[1900px]:h-28">
                  <span
                    aria-hidden="true"
                    className="block h-[var(--bar-height)] w-full rounded-full bg-[rgba(91,124,250,.72)]"
                    style={barHeightStyle(bar.value)}
                  />
                </div>
                <span className="truncate text-center text-[9px] text-[var(--text-muted)]">
                  {bar.day}
                </span>
              </div>
              ))
            ) : (
              <SectionEmptyState
                className="w-full self-stretch"
                description="Schlafsignale erscheinen nach dem ersten lokalen Eintrag."
                title="Noch keine Schlafdaten"
              />
            )}
          </section>
        </div>

        <section
          aria-labelledby="journal-reflection-heading"
          className="mt-auto flex flex-col gap-3 rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-3 sm:flex-row sm:items-center sm:justify-between min-[1900px]:p-4"
        >
          <div className="min-w-0">
            <h3
              className="text-[10px] font-semibold text-[var(--text-muted)]"
              id="journal-reflection-heading"
            >
              {data.journal.label}
            </h3>
            <p className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">
              {data.journal.value}
            </p>
            {data.journal.pattern.length > 0 ? (
              <div className="mt-2">
                <DotRhythm
                  accent="var(--accent-purple)"
                  label={`${data.journal.label}: ${data.journal.value}`}
                  pattern={data.journal.pattern}
                />
              </div>
            ) : (
              <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
                Noch keine Reflexionen erfasst.
              </p>
            )}
          </div>
          <ActionLink accent="var(--accent-purple)" href={data.journal.href}>
            {data.journal.actionLabel}
          </ActionLink>
        </section>
      </div>
    </HealthPanel>
  );
}
