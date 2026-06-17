import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type AccentStyle = CSSProperties & {
  "--accent"?: string;
  "--progress"?: string;
};

function styleFor(accent: string, progress?: number): AccentStyle {
  return {
    "--accent": accent,
    "--progress": `${progress ?? 0}%`,
  };
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
    <div className="h-1.5 rounded-full bg-[rgba(168,183,204,.15)]">
      <div
        aria-hidden="true"
        className={cn(
          "h-full w-[var(--progress)] rounded-full",
          quiet
            ? "bg-[color-mix(in_srgb,var(--accent)_46%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--accent)_64%,transparent)]",
        )}
        style={styleFor(accent, progress)}
      />
    </div>
  );
}

function Pill({
  children,
  accent = "var(--accent-blue)",
  quiet = false,
}: Readonly<{
  children: ReactNode;
  accent?: string;
  quiet?: boolean;
}>) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[10px] font-medium",
        quiet
          ? "border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] text-[var(--text-muted)]"
          : "border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--text-secondary)]",
      )}
      style={styleFor(accent)}
    >
      {children}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className,
  titleClassName,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
}>) {
  return (
    <section
      aria-labelledby={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`}
      className={cn(
        "overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.72)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              className={cn(
                "font-semibold text-[var(--text-primary)]",
                titleClassName ?? "text-lg",
              )}
              id={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

const meals = [
  {
    type: "Breakfast",
    name: "Overnight Oats",
    kcal: "310 kcal",
    macros: ["P 8g", "C 38g", "F 6g"],
  },
  {
    type: "Lunch",
    name: "Steak Salad",
    kcal: "400 kcal",
    macros: ["P 58g", "C 10g", "F 20g"],
  },
  {
    type: "Dinner",
    name: "Protein Bowl",
    kcal: "690 kcal",
    macros: ["P 48g", "C 62g", "F 18g"],
  },
];

const runStats = [
  { label: "Distance", value: "6.2 km", delta: "+0.8 km" },
  { label: "Pace", value: "5:42 / km", delta: "better" },
  { label: "Time", value: "35m 20s", delta: "+31s" },
];

const agendaEvents = [
  {
    title: "Morning Routine",
    time: "06:30-07:15 · 45 min",
    note: "Start baseline",
    accent: "var(--accent-blue)",
  },
  {
    title: "Deep Work: Masterarbeit",
    time: "08:00-10:00 · 120 min",
    note: "Literature extraction · source notes",
    tags: ["Focus", "high"],
    accent: "var(--accent-blue)",
    tall: true,
  },
  {
    title: "Team Standup",
    time: "10:15-10:45 · 30 min",
    note: "Sync + blockers",
    accent: "var(--accent-blue)",
  },
  {
    title: "Lunch & Walk",
    time: "12:00-13:00 · 60 min",
    note: "Reset + movement",
    tags: ["Health", "low"],
    accent: "var(--accent-red)",
  },
  {
    title: "Open Focus Buffer",
    time: "13:30-14:30 · 60 min",
    note: "Free slot",
    tags: ["Free", "medium"],
    accent: "var(--accent-blue)",
  },
  {
    title: "Skill Practice: Figma",
    time: "15:30-16:30 · 60 min",
    note: "Life OS layout refinement",
    tags: ["Skill", "medium"],
    accent: "var(--accent-purple)",
    active: true,
  },
  {
    title: "Workout / Run",
    time: "17:00-18:00 · 60 min",
    note: "Training planned",
    tags: ["Health", "medium"],
    accent: "var(--accent-red)",
    strong: true,
  },
  {
    title: "Dinner: Protein Bowl",
    time: "19:00-19:30 · 30 min",
    note: "Nutrition target",
    accent: "var(--accent-yellow)",
  },
  {
    title: "Journal & Plan Tomorrow",
    time: "21:30-22:00 · 30 min",
    note: "Daily review closeout",
    accent: "var(--accent-purple)",
  },
];

const habits = [
  { marker: "W", label: "Water", value: "1100 / 2200", done: 3 },
  { marker: "C", label: "Coffee", value: "2 / 4", done: 4 },
  { marker: "E", label: "Exercise", value: "3 / 6", done: 4 },
  { marker: "M", label: "Morning", value: "1 / 1", done: 5 },
  { marker: "S", label: "Study", value: "2h / 3h", done: 3 },
  { marker: "B", label: "Mindful", value: "8 / 10 min", done: 4 },
  { marker: "P", label: "Meal Prep", value: "2 / 3", done: 4 },
];

const projects = [
  {
    title: "Life OS App",
    label: "Coding",
    next: "Project view finalisieren",
    meta: "18 / 42 tasks",
    progress: 56,
    accent: "var(--accent-orange)",
  },
  {
    title: "Masterarbeit",
    label: "Education",
    next: "Literaturquelle eintragen",
    meta: "27 / 60 sources",
    progress: 68,
    accent: "var(--accent-blue)",
  },
  {
    title: "Java / Hyperskill",
    label: "Skill",
    next: "Modul abschließen",
    meta: "9 / 22 lessons",
    progress: 41,
    accent: "var(--accent-purple)",
  },
  {
    title: "Finanzinformatik",
    label: "Work",
    next: "Notizen für FI aufbereiten",
    meta: "3 / 9 items",
    progress: 33,
    accent: "var(--accent-green)",
  },
];

const antiRot = [
  {
    title: "10-minute walk",
    type: "Focus",
    bad: "Instagram refresh",
    reset: "Walk outside, no phone",
    effort: "Easy",
    time: "10 min",
    accent: "var(--accent-red)",
  },
  {
    title: "Read 10 pages",
    type: "Reset",
    bad: "TikTok / Shorts",
    reset: "Book on desk, timer on",
    effort: "Medium",
    time: "20 min",
    accent: "var(--accent-purple)",
  },
  {
    title: "Do 1 priority task",
    type: "Discipline",
    bad: "Avoiding priority",
    reset: "One tiny first step",
    effort: "Medium",
    time: "30 min",
    accent: "var(--accent-purple)",
  },
  {
    title: "Cold water on face",
    type: "Health",
    bad: "Gaming instead of start",
    reset: "Reset body state",
    effort: "Easy",
    time: "5 min",
    accent: "var(--accent-red)",
  },
  {
    title: "5-minute desk clean",
    type: "Environment",
    bad: "Messy desk loop",
    reset: "Clear visible surface",
    effort: "Easy",
    time: "5 min",
    accent: "var(--accent-purple)",
  },
];

const challenges = [
  {
    title: "No Shorts after 18:00",
    type: "Rule",
    status: "Safe so far",
    footer: "mark at day end",
    progress: 0,
  },
  {
    title: "Run 2 km easy",
    type: "Health",
    status: "small win",
    footer: "mark done",
    progress: 65,
  },
  {
    title: "Study block 45 min",
    type: "Deep focus",
    status: "small win",
    footer: "mark done",
    progress: 55,
  },
];

export function MealsToday() {
  return (
    <Panel className="border-[rgba(217,146,79,.18)] bg-[#101720]" title="Meals Today">
      <div className="space-y-3 p-4">
        {meals.map((meal) => (
          <article
            className="grid min-h-[84px] grid-cols-[64px_minmax(0,1fr)] gap-4 rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-3"
            key={meal.type}
          >
            <div className="rounded-[14px] border border-[rgba(217,146,79,.12)] bg-[rgba(217,146,79,.14)]" />
            <div className="min-w-0 py-1">
              <div className="flex flex-wrap items-center gap-3">
                <Pill accent="var(--accent-yellow)">{meal.type}</Pill>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
                  {meal.name}
                </h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-medium text-[var(--text-secondary)]">
                <span>{meal.kcal}</span>
                {meal.macros.map((macro) => (
                  <span key={macro}>{macro}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

export function RunningTracker() {
  return (
    <Panel
      className="border-[rgba(221,107,95,.18)] bg-[#101720]"
      subtitle="Health view switch · current run state"
      title="Running Tracker"
    >
      <div className="p-4">
        <div className="mb-3 ml-auto flex w-full max-w-[294px] rounded-full border border-[var(--border-subtle)] bg-[#0b1422] p-1 text-center text-[10px] font-semibold text-[var(--text-primary)]">
          {["Running", "Muscle", "Recovery"].map((view, index) => (
            <span
              className={cn(
                "flex-1 rounded-full px-3 py-1.5",
                index === 0 && "border border-[var(--border-subtle)]",
              )}
              key={view}
            >
              {view}
            </span>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {runStats.map((stat) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-3"
              key={stat.label}
            >
              <p className="text-[10px] font-medium text-[var(--text-muted)]">
                {stat.label}
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {stat.value}
                </p>
                <p className="text-[10px] font-medium text-[var(--text-secondary)]">
                  {stat.delta}
                </p>
              </div>
            </article>
          ))}
        </div>
        <article className="mt-3 grid gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-3 sm:grid-cols-[minmax(0,1fr)_150px_56px] sm:items-center">
          <div>
            <p className="text-[10px] font-semibold text-[var(--text-primary)]">
              Today is above your 7-day rhythm
            </p>
            <p className="mt-2 text-[10px] font-semibold text-[var(--text-primary)]">
              6.2 km today · 4.9 km avg
            </p>
          </div>
          <ProgressBar accent="var(--accent-red)" progress={78} quiet />
          <Pill accent="var(--accent-red)">better</Pill>
        </article>
      </div>
    </Panel>
  );
}

export function TodayAgenda() {
  return (
    <Panel
      className="border-[rgba(91,124,250,.30)] bg-[#0e1828] shadow-[0_16px_40px_rgba(0,0,0,.24)]"
      title="Today Agenda"
      titleClassName="text-[28px]"
    >
      <div className="border-b border-[var(--border-subtle)] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex w-[286px] max-w-full rounded-full border border-[rgba(91,124,250,.24)] bg-[#0d1727] p-1 text-center text-[10px] font-medium text-[var(--text-muted)]">
            {["Day", "Week", "Month"].map((view, index) => (
              <span
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5",
                  index === 0 && "border border-[rgba(91,124,250,.24)]",
                )}
                key={view}
              >
                {view}
              </span>
            ))}
          </div>
          <p className="text-[10px] font-medium text-[var(--text-muted)]">
            Week and month views prepared
          </p>
        </div>
      </div>
      <div className="relative grid h-[clamp(560px,54vh,650px)] min-h-0 grid-cols-[56px_minmax(0,1fr)] gap-3 p-3">
        <div className="overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[#0b1423] py-2">
          {[
            "06:00",
            "07:00",
            "08:00",
            "09:00",
            "10:00",
            "11:00",
            "12:00",
            "13:00",
            "14:00",
            "15:00",
            "16:00",
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00",
            "22:00",
            "23:00",
            "24:00",
          ].map((time) => (
            <div
              className="flex h-8 items-start justify-end pr-2 text-[11px] font-medium text-[var(--text-secondary)]"
              key={time}
            >
              {time}
            </div>
          ))}
        </div>
        <div className="relative min-h-0 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[#0b1423] p-2.5">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-[53.5%] z-10 h-0.5 bg-[rgba(221,107,95,.95)]"
          />
          <p className="absolute right-3 top-[calc(53.5%-22px)] z-10 text-xs font-semibold text-[var(--accent-red)]">
            15:42
          </p>
          <div className="h-full space-y-2 overflow-y-auto pr-1">
            {agendaEvents.map((event) => (
              <article
                className={cn(
                  "relative overflow-hidden rounded-[13px] border bg-[#0d1625] p-3 pl-4",
                  event.tall ? "min-h-[64px]" : "min-h-[40px]",
                  event.active && "border-[rgba(91,124,250,.54)] bg-[#15243a]",
                  event.strong && "border-[rgba(221,107,95,.44)] bg-[#121c2e]",
                )}
                key={event.title}
                style={styleFor(event.accent)}
              >
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 top-0 w-1 bg-[color-mix(in_srgb,var(--accent)_64%,transparent)]"
                />
                <div className="grid gap-2 sm:grid-cols-[188px_minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <h3
                      className={cn(
                        "text-xs text-[var(--text-secondary)]",
                        (event.active || event.strong) &&
                          "font-semibold text-[var(--text-primary)]",
                      )}
                    >
                      {event.title}
                    </h3>
                    <p
                      className={cn(
                        "mt-1 text-xs text-[var(--text-secondary)]",
                        event.strong && "font-semibold text-[var(--text-primary)]",
                      )}
                    >
                      {event.time}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-xs text-[var(--text-muted)]",
                      event.strong && "font-semibold text-[var(--text-primary)]",
                    )}
                  >
                    {event.note}
                  </p>
                  <div className="flex gap-1.5">
                    {event.tags?.map((tag) => (
                      <Pill accent={event.accent} key={tag}>
                        {tag}
                      </Pill>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function HabitTrackers() {
  return (
    <Panel className="bg-[#101827]" title="Habit Trackers">
      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-[292px] rounded-full border border-[var(--border-subtle)] bg-[#0c1422] p-1 text-center text-[10px] font-semibold text-[var(--text-primary)]">
            {["Morning", "Midday", "Evening"].map((view, index) => (
              <span
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5",
                  index === 0 && "border border-[var(--border-subtle)]",
                )}
                key={view}
              >
                {view}
              </span>
            ))}
          </div>
          <p className="text-[10px] font-semibold text-[var(--text-primary)]">
            7 per view · 21 total slots
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {habits.map((habit) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-3"
              key={habit.label}
            >
              <div className="flex gap-3">
                <span className="grid size-6 place-items-center rounded-full border border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-primary)]">
                  {habit.marker}
                </span>
                <div>
                  <h3 className="text-[10px] font-semibold text-[var(--text-primary)]">
                    {habit.label}
                  </h3>
                  <p className="mt-1 text-[10px] font-semibold text-[var(--text-primary)]">
                    {habit.value}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2" aria-label={`${habit.done} of 5 completed`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      index < habit.done
                        ? "bg-[var(--accent-purple)]"
                        : "bg-[rgba(148,163,184,.24)]",
                    )}
                    key={`${habit.label}-${index}`}
                  />
                ))}
              </div>
            </article>
          ))}
          <article className="grid min-h-[78px] place-items-center rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-3 text-center">
            <div>
              <p className="text-xl font-semibold text-[var(--text-primary)]">+</p>
              <p className="mt-2 text-[10px] font-semibold text-[var(--text-primary)]">
                Add habit
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[var(--text-primary)]">
                new tracker
              </p>
            </div>
          </article>
        </div>
      </div>
    </Panel>
  );
}

export function ActivePortfolio() {
  return (
    <Panel
      className="bg-[#101827]"
      subtitle="Unique active projects · next action first"
      title="Active Portfolio"
      titleClassName="text-xl"
    >
      <div className="p-4">
        <div className="mb-3 rounded-[13px] border border-[var(--border-subtle)] bg-[#0b1422] p-3">
          <div className="grid gap-3 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-center">
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                Portfolio View
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[var(--text-primary)]">
                Switch content state
              </p>
            </div>
            <div className="flex rounded-[13px] border border-[var(--border-subtle)] bg-[#0b1422] p-1 text-center text-[10px] font-semibold text-[var(--text-primary)]">
              {["Project View", "Goal View", "Skill View"].map((view, index) => (
                <span
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5",
                    index === 0 && "border border-[var(--border-subtle)]",
                  )}
                  key={view}
                >
                  {view}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <article
              className="rounded-[13px] border bg-[#101a2a] p-3"
              key={project.title}
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 26%, transparent)",
                "--accent": project.accent,
              } as AccentStyle}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="size-2.5 rounded-full bg-[var(--accent)]" />
                  <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {project.title}
                  </h3>
                </div>
                <Pill accent={project.accent}>{project.label}</Pill>
              </div>
              <p className="mt-4 text-[10px] font-medium text-[var(--text-secondary)]">
                Next
              </p>
              <p className="mt-1 text-[10px] font-medium text-[var(--text-secondary)]">
                {project.next}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[10px] font-medium text-[var(--text-secondary)]">
                  {project.meta}
                </p>
                <p className="text-[10px] font-medium text-[var(--text-secondary)]">
                  {project.progress}%
                </p>
              </div>
              <div className="mt-2">
                <ProgressBar accent={project.accent} progress={project.progress} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function AntiRotActions() {
  return (
    <Panel
      className="border-[rgba(168,183,204,.12)] bg-[#0d1422]"
      title="Anti-Rot Actions / Bad Habit Reset Row"
    >
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
        {antiRot.map((action) => (
          <article
            className="rounded-[13px] border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] p-3"
            key={action.title}
            style={styleFor(action.accent)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="size-2 rounded-full bg-[var(--accent)]" />
                <h3 className="truncate text-[10px] font-semibold text-[var(--text-secondary)]">
                  {action.title}
                </h3>
              </div>
              <span className="text-[8px] font-medium text-[var(--text-muted)]">
                Done?
              </span>
            </div>
            <div className="mt-3">
              <Pill accent={action.accent}>{action.type}</Pill>
            </div>
            <dl className="mt-3 space-y-1.5 text-[8px] font-medium text-[var(--text-muted)]">
              <div className="flex gap-2">
                <dt>Bad habit:</dt>
                <dd>{action.bad}</dd>
              </div>
              <div className="flex gap-2">
                <dt>Reset:</dt>
                <dd>{action.reset}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center gap-3">
              <Pill quiet>{action.effort}</Pill>
              <span className="text-[8px] font-medium text-[var(--text-muted)]">
                {action.time}
              </span>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

export function Challenges() {
  return (
    <Panel className="border-[rgba(216,180,90,.18)] bg-[#0d1422]" title="Challenges">
      <div className="p-4">
        <div className="mb-3 flex min-h-8 items-center justify-between gap-3 rounded-full border border-[rgba(216,180,90,.24)] bg-[rgba(216,180,90,.10)] px-4">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            Complete 2 challenges today
          </p>
          <p className="text-[8px] font-medium text-[var(--text-muted)]">
            1 / 2 measurable · 1 rule active
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {challenges.map((challenge) => (
            <article
              className="rounded-[13px] border border-[rgba(216,180,90,.16)] bg-[#101a2a] p-3"
              key={challenge.title}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 size-2 rounded-full bg-[var(--accent-yellow)]" />
                <h3 className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  {challenge.title}
                </h3>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Pill accent="var(--accent-yellow)">{challenge.type}</Pill>
                <span className="text-[8px] font-medium text-[var(--text-muted)]">
                  {challenge.status}
                </span>
              </div>
              {challenge.progress > 0 ? (
                <div className="mt-3">
                  <ProgressBar
                    accent="var(--accent-yellow)"
                    progress={challenge.progress}
                  />
                </div>
              ) : null}
              <p className="mt-3 text-[8px] font-medium text-[var(--text-muted)]">
                {challenge.footer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}
