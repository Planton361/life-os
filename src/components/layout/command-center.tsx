import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

const metrics = [
  {
    label: "Tasks",
    value: "12 / 18",
    detail: "67% complete",
    progress: 67,
    accent: "var(--accent-blue)",
  },
  {
    label: "Focus Time",
    value: "1h 40m",
    detail: "of 3h target",
    progress: 56,
    accent: "var(--accent-blue)",
  },
  {
    label: "Inbox",
    value: "5 open",
    detail: "3 need review",
    progress: 38,
    accent: "var(--accent-green)",
  },
  {
    label: "Nutrition",
    value: "1,720",
    detail: "of 2,200 kcal",
    progress: 78,
    accent: "var(--accent-yellow)",
  },
  {
    label: "Steps",
    value: "4,200",
    detail: "target 10,000",
    progress: 42,
    accent: "var(--accent-blue)",
  },
  {
    label: "Sleep",
    value: "6h 12m",
    detail: "target 8h",
    progress: 77,
    accent: "var(--accent-blue)",
  },
];

const queue = [
  {
    title: "Java/Hyperskill abschließen",
    meta: "Heute später · 30 min",
    tag: "Learn",
  },
  {
    title: "Daily Review ausfüllen",
    meta: "Abends · offen",
    tag: "Review",
  },
  {
    title: "Inbox triagieren",
    meta: "3 offen · 10 min",
    tag: "Inbox",
  },
];

const timeRows = [
  { label: "Year 2026", value: "44%", progress: 44 },
  { label: "Month June", value: "43%", progress: 43 },
  { label: "Week 24", value: "71%", progress: 71 },
];

function accentStyle(accent: string, progress?: number): CSSProperties {
  return {
    "--accent": accent,
    "--progress": `${progress ?? 0}%`,
  } as CSSProperties;
}

function ProgressBar({
  progress,
  accent,
  quiet = false,
}: Readonly<{
  progress: number;
  accent: string;
  quiet?: boolean;
}>) {
  return (
    <div className="h-1.5 rounded-full bg-[rgba(168,183,204,.11)]">
      <div
        aria-hidden="true"
        className={cn(
          "h-full w-[var(--progress)] rounded-full",
          quiet ? "bg-[color-mix(in_srgb,var(--accent)_42%,transparent)]" : "bg-[color-mix(in_srgb,var(--accent)_82%,transparent)]",
        )}
        style={accentStyle(accent, progress)}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  progress,
  accent,
}: Readonly<(typeof metrics)[number]>) {
  return (
    <article className="rounded-[13px] border border-[var(--border-subtle)] bg-[#101a2a] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium text-[var(--text-secondary)]">
            {label}
          </p>
          <p className="mt-1 text-[19px] font-semibold text-[var(--text-secondary)]">
            {value}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="mt-3 size-2.5 rounded-full shadow-[0_0_18px_color-mix(in_srgb,var(--accent)_60%,transparent)]"
          style={{ background: accent, "--accent": accent } as CSSProperties}
        />
      </div>
      <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">
        {detail}
      </p>
      <div className="mt-2">
        <ProgressBar accent={accent} progress={progress} />
      </div>
    </article>
  );
}

function QuickThought() {
  return (
    <section
      aria-labelledby="quick-thought-title"
      className="flex min-h-[clamp(232px,21vh,265px)] flex-col rounded-[var(--panel-radius)] border border-[rgba(91,124,250,.22)] bg-[rgba(15,26,43,.90)] p-3 shadow-[0_8px_22px_rgba(0,0,0,.12)]"
    >
      <div className="flex items-center justify-between">
        <h2
          className="text-[13px] font-semibold text-[var(--text-primary)]"
          id="quick-thought-title"
        >
          Quick Thought
        </h2>
        <span className="text-[11px] font-semibold text-[var(--text-primary)]">
          Inbox
        </span>
      </div>
      <div className="mt-2 flex flex-1 flex-col rounded-[18px] border border-[rgba(91,124,250,.23)] bg-[rgba(15,26,43,.90)] p-3">
        <div className="border-l-4 border-[rgba(91,124,250,.82)] pl-3">
          <p className="text-[10px] font-medium text-[var(--text-secondary)]">
            Write a thought, task or instruction...
          </p>
          <p className="mt-2 text-[9px] font-medium text-[var(--text-faint)]">
            Task · Note · Question · Loop
          </p>
        </div>
        <div className="mt-4 space-y-2" aria-hidden="true">
          <div className="h-[3px] w-20 rounded-full bg-[rgba(91,124,250,.26)]" />
          <div className="h-[3px] w-14 rounded-full bg-[rgba(91,124,250,.18)]" />
        </div>
        <div className="mt-auto flex justify-center">
          <span className="rounded-full border border-[rgba(91,124,250,.34)] bg-[rgba(91,124,250,.16)] px-8 py-2 text-[10px] font-medium text-[var(--text-secondary)]">
            Capture
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["Task", "Note", "Question", "Loop"].map((type) => (
          <span
            className="rounded-full border border-[rgba(91,124,250,.20)] bg-[rgba(91,124,250,.09)] px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)]"
            key={type}
          >
            {type}
          </span>
        ))}
      </div>
    </section>
  );
}

function DailyControl() {
  return (
    <section
      aria-labelledby="daily-control-title"
      className="grid min-h-[clamp(232px,21vh,265px)] gap-3 overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(91,124,250,.30)] bg-[#15243a] p-4 shadow-[0_16px_40px_rgba(0,0,0,.24)] lg:grid-cols-[224px_minmax(0,1fr)]"
    >
      <div className="lg:col-span-2">
        <div className="flex items-center gap-3">
          <h2
            className="text-sm font-semibold text-[var(--text-primary)]"
            id="daily-control-title"
          >
            Daily Control
          </h2>
          <p className="text-[10px] font-medium text-[var(--text-muted)]">
            Current task + next queue
          </p>
        </div>
      </div>

      <article className="rounded-[18px] border border-[rgba(91,124,250,.28)] bg-[rgba(21,36,58,.98)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase text-[var(--text-secondary)]">
              Current Task
            </p>
            <p className="mt-1 text-[10px] font-medium text-[var(--text-secondary)]">
              18:32 · 25 min left
            </p>
          </div>
          <span className="rounded-full border border-[rgba(91,124,250,.24)] bg-[rgba(17,28,46,.96)] px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
            Active Now
          </span>
        </div>
        <p className="mt-3 text-[21px] font-semibold leading-[1.18] text-[var(--text-primary)]">
          Literaturstruktur überarbeiten
        </p>
        <p className="mt-3 text-[11px] font-medium text-[var(--text-secondary)]">
          Masterarbeit · hoher Fokus
        </p>
        <div className="mt-3">
          <ProgressBar accent="var(--accent-blue)" progress={34} />
        </div>
        <span className="mt-3 flex min-h-[24px] items-center justify-center rounded-full border border-[rgba(91,124,250,.36)] bg-[rgba(91,124,250,.18)] text-[10px] font-medium text-[var(--text-secondary)]">
          Continue current task
        </span>
      </article>

      <section aria-label="Up Next" className="min-w-0 rounded-[13px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Up Next
            </h3>
            <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
              Nächste Schritte, priorisiert
            </p>
          </div>
          <span className="rounded-full border border-[rgba(91,124,250,.24)] bg-[rgba(17,28,46,.96)] px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
            3 queued
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {queue.map((item) => (
            <article
                className="grid min-h-11 grid-cols-[4px_8px_minmax(0,1fr)_76px_10px] items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[#111c2e] pr-2"
              key={item.title}
            >
              <span className="h-full rounded-full bg-[rgba(91,124,250,.72)]" />
              <span className="size-2 rounded-full bg-[var(--accent-blue)]" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[var(--text-secondary)]">
                  {item.title}
                </p>
                <p className="mt-0.5 truncate text-[10px] font-medium text-[var(--text-secondary)]">
                  {item.meta}
                </p>
              </div>
              <span className="rounded-full border border-[rgba(91,124,250,.24)] px-2 py-1 text-center text-[10px] font-medium text-[var(--text-secondary)]">
                {item.tag}
              </span>
              <span aria-hidden="true" className="text-base text-[var(--text-secondary)]">
                ›
              </span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function TimeProgress() {
  return (
    <section
      aria-labelledby="time-progress-title"
      className="rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[#0d1625] p-4 shadow-[0_10px_26px_rgba(0,0,0,.14)]"
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_104px]">
        <div>
          <h2
            className="text-xs font-medium text-[var(--text-secondary)]"
            id="time-progress-title"
          >
            Time Progress
          </h2>
          <div className="mt-3 space-y-2.5">
            {timeRows.map((row) => (
              <div
                className="grid grid-cols-[78px_minmax(0,1fr)_36px] items-center gap-3"
                key={row.label}
              >
                <p className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
                  {row.label}
                </p>
                <ProgressBar
                  accent="var(--accent-blue)"
                  progress={row.progress}
                  quiet
                />
                <p className="text-[10px] font-medium text-[var(--text-muted)]">
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[20px] border border-[rgba(168,183,204,.10)] bg-[rgba(168,183,204,.07)] p-2.5 text-center">
          <div aria-hidden="true" className="mx-auto mt-1 h-7 w-14 rounded-full bg-[rgba(168,183,204,.30)]" />
          <p className="mt-2 text-[10px] font-medium text-[var(--text-muted)]">
            18°C cloudy
          </p>
          <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">
            Evening
          </p>
        </div>
      </div>
    </section>
  );
}

function MoodBoard() {
  return (
    <section
      aria-labelledby="mood-title"
      className="rounded-[var(--panel-radius)] border border-[rgba(95,200,215,.14)] bg-[#0d1625] p-4 shadow-[0_10px_26px_rgba(0,0,0,.14)]"
    >
      <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
        <div>
          <p className="text-[10px] font-semibold uppercase text-[rgba(95,200,215,.72)]">
            Wellbeing
          </p>
          <h2
            className="mt-2 text-lg font-semibold text-[var(--text-primary)]"
            id="mood-title"
          >
            Mood
          </h2>
          <p className="mt-2 text-[10px] font-medium text-[var(--text-muted)]">
            How do you feel right now?
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grid size-8 place-items-center rounded-full bg-[rgba(95,200,215,.12)] text-base">
                :)
              </span>
              <div>
                <p className="text-xl font-semibold text-[var(--text-primary)]">
                  Content
                </p>
                <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">
                  stabil · fokusfähig · Stress im Blick
                </p>
              </div>
            </div>
            <p className="text-[10px] font-semibold text-[rgba(95,200,215,.72)]">
              7.6 / 10
            </p>
          </div>
          <div className="mt-3">
            <ProgressBar accent="var(--accent-cyan)" progress={76} quiet />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Happy", "Anxious", "Angry", "Tired", "Sad", "Stressed"].map(
              (mood, index) => (
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-[10px] font-medium",
                    index === 0
                      ? "border-[rgba(95,200,215,.24)] bg-[rgba(95,200,215,.12)] text-[var(--text-secondary)]"
                      : "border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] text-[var(--text-muted)]",
                  )}
                  key={mood}
                >
                  {mood}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CommandCenter() {
  return (
    <header className="px-3 pt-3">
      <div className="rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[rgba(12,20,34,.94)] p-3 shadow-[0_10px_26px_rgba(0,0,0,.14)]">
        <div className="grid min-h-[var(--top-zone-height)] gap-3 2xl:grid-cols-[551px_257px_minmax(620px,730px)_minmax(420px,596px)]">
          <section aria-label="Command Center Stats" className="p-1">
            <p className="text-3xl font-semibold text-[var(--text-secondary)]">
              Good evening, Anton
            </p>
            <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">
              Tuesday, 09 June · Work / Study Day
            </p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>
          </section>

          <QuickThought />
          <DailyControl />

          <div className="grid gap-3">
            <TimeProgress />
            <MoodBoard />
          </div>
        </div>
      </div>
    </header>
  );
}
