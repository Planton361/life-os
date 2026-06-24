import {
  createManualGoalAction,
  createManualInboxItemAction,
  createManualProjectAction,
  createManualTaskAction,
  resetManualProfileAction,
  selectLifeOsProfileAction,
} from "./actions";
import type { CSSProperties, ReactNode } from "react";
import { lifeOsProfiles } from "./profile-cookie";
import { getLifeOsDataSource } from "./view-models";

const accent = "var(--accent-cyan)";
const panelClass =
  "min-w-0 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]";
const panelHeaderClass =
  "border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.78)] px-4 py-3 sm:px-5";
const inputClass =
  "mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.66)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)]";
const textareaClass = `${inputClass} min-h-[92px] py-3`;
const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";
const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_36%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,rgba(18,28,43,.88))] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[color-mix(in_srgb,var(--accent)_54%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";
const dangerButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[rgba(221,107,95,.24)] bg-[rgba(221,107,95,.08)] px-3 text-[10px] font-semibold text-[var(--accent-red)] transition hover:border-[rgba(221,107,95,.42)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

function Field({
  children,
  label,
}: Readonly<{
  children: ReactNode;
  label: string;
}>) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function AreaSelect({
  defaultValue = "review",
}: Readonly<{ defaultValue?: string }>) {
  return (
    <select className={inputClass} defaultValue={defaultValue} name="areaId">
      <option value="review">Review</option>
      <option value="coding">Coding</option>
      <option value="education">Education</option>
      <option value="work">Work</option>
      <option value="health">Health</option>
      <option value="nutrition">Nutrition</option>
      <option value="personal">Personal</option>
      <option value="system">System</option>
    </select>
  );
}

function PrioritySelect({
  defaultValue = "P2",
}: Readonly<{ defaultValue?: string }>) {
  return (
    <select className={inputClass} defaultValue={defaultValue} name="priority">
      <option value="P0">P0</option>
      <option value="P1">P1</option>
      <option value="P2">P2</option>
      <option value="P3">P3</option>
      <option value="none">None</option>
    </select>
  );
}

function Panel({
  children,
  subtitle,
  title,
}: Readonly<{
  children: ReactNode;
  subtitle?: string;
  title: string;
}>) {
  return (
    <section className={panelClass}>
      <div className={panelHeaderClass}>
        <h2 className="text-[18px] font-semibold leading-6 text-[var(--text-primary)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export async function ProfileDataSettingsPanel() {
  const dataSource = await getLifeOsDataSource();
  const [tasks, projects, goals, inboxItems] = await Promise.all([
    dataSource.getTasks(),
    dataSource.getProjects(),
    dataSource.getGoals(),
    dataSource.getInboxItems(),
  ]);

  return (
    <div
      className="mx-auto mt-3 flex w-full max-w-[2208px] flex-col gap-3 pb-8"
      style={{ "--accent": accent } as CSSProperties}
    >
      <Panel
        subtitle="Cookie-based profile switch. It changes data only; Dashboard V5 components stay the same."
        title="Profile Data Source"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-2 sm:grid-cols-3">
            {lifeOsProfiles.map((profile) => {
              const active = profile.id === dataSource.profile.id;

              return (
                <form action={selectLifeOsProfileAction} key={profile.id}>
                  <input name="profileId" type="hidden" value={profile.id} />
                  <button
                    aria-pressed={active}
                    className={
                      active
                        ? primaryButtonClass
                        : `${buttonClass} w-full justify-start`
                    }
                    type="submit"
                  >
                    {profile.label}
                  </button>
                  <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
                    {profile.description}
                  </p>
                </form>
              );
            })}
          </div>

          <dl className="grid gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3 text-xs">
            <div>
              <dt className={labelClass}>Active</dt>
              <dd className="mt-1 text-[var(--text-secondary)]">
                {dataSource.profile.label}
              </dd>
              <dd className="mt-1 text-[10px] font-semibold text-[var(--accent-cyan)]">
                Aktives Profil: {dataSource.profile.id}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <dt className={labelClass}>Tasks</dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {tasks.length}
                </dd>
              </div>
              <div>
                <dt className={labelClass}>Inbox</dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {inboxItems.length}
                </dd>
              </div>
              <div>
                <dt className={labelClass}>Projects</dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {projects.length}
                </dd>
              </div>
              <div>
                <dt className={labelClass}>Goals</dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {goals.length}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          subtitle="Creates a local task and switches to the Manual profile."
          title="Manual Task"
        >
          <form
            action={createManualTaskAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field label="Title">
              <input
                className={inputClass}
                name="title"
                placeholder="Task title"
                required
              />
            </Field>
            <Field label="Area">
              <AreaSelect defaultValue="coding" />
            </Field>
            <Field label="Date">
              <input className={inputClass} name="date" type="date" />
            </Field>
            <Field label="Start time">
              <input className={inputClass} name="startTime" type="time" />
            </Field>
            <Field label="Duration">
              <input
                className={inputClass}
                defaultValue="30"
                min="5"
                name="durationMinutes"
                type="number"
              />
            </Field>
            <Field label="Priority">
              <PrioritySelect defaultValue="P2" />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                defaultValue="planned"
                name="status"
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="waiting">Waiting</option>
                <option value="done">Done</option>
                <option value="inbox">Inbox</option>
              </select>
            </Field>
            <Field label="Next step">
              <input
                className={inputClass}
                name="nextStep"
                placeholder="Concrete next step"
              />
            </Field>
            <label className="sm:col-span-2">
              <span className={labelClass}>Description</span>
              <textarea
                className={textareaClass}
                name="description"
                placeholder="What should be true when this is done?"
              />
            </label>
            <div className="sm:col-span-2">
              <button className={primaryButtonClass} type="submit">
                Create task
              </button>
            </div>
          </form>
        </Panel>

        <Panel
          subtitle="Creates a local inbox item and switches to the Manual profile."
          title="Manual Inbox Item"
        >
          <form
            action={createManualInboxItemAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field label="Title">
              <input
                className={inputClass}
                name="title"
                placeholder="Captured thought"
                required
              />
            </Field>
            <Field label="Type">
              <select className={inputClass} defaultValue="note" name="type">
                <option value="task">Task</option>
                <option value="note">Note</option>
                <option value="question">Question</option>
                <option value="idea">Idea</option>
                <option value="resource">Resource</option>
                <option value="agent">Agent</option>
                <option value="decision">Decision</option>
              </select>
            </Field>
            <Field label="Area">
              <AreaSelect defaultValue="review" />
            </Field>
            <label className="sm:col-span-2">
              <span className={labelClass}>Note</span>
              <textarea
                className={textareaClass}
                name="note"
                placeholder="Raw context"
              />
            </label>
            <div className="sm:col-span-2">
              <button className={primaryButtonClass} type="submit">
                Create inbox item
              </button>
            </div>
          </form>
        </Panel>

        <Panel
          subtitle="Creates a local project visible in Projects and Dashboard Active Portfolio."
          title="Manual Project"
        >
          <form
            action={createManualProjectAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field label="Title">
              <input
                className={inputClass}
                name="title"
                placeholder="Project title"
                required
              />
            </Field>
            <Field label="Area">
              <AreaSelect defaultValue="coding" />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                defaultValue="active"
                name="status"
              >
                <option value="active">Active</option>
                <option value="idea">Idea</option>
                <option value="paused">Paused</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
            <Field label="Priority">
              <PrioritySelect defaultValue="P1" />
            </Field>
            <Field label="Deadline">
              <input className={inputClass} name="deadline" type="date" />
            </Field>
            <Field label="Next step">
              <input
                className={inputClass}
                name="nextStep"
                placeholder="Next step"
              />
            </Field>
            <label className="sm:col-span-2">
              <span className={labelClass}>Description</span>
              <textarea
                className={textareaClass}
                name="description"
                placeholder="Project outcome"
              />
            </label>
            <div className="sm:col-span-2">
              <button className={primaryButtonClass} type="submit">
                Create project
              </button>
            </div>
          </form>
        </Panel>

        <Panel
          subtitle="Creates a local goal visible in Goals and Dashboard Active Portfolio."
          title="Manual Goal"
        >
          <form
            action={createManualGoalAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field label="Title">
              <input
                className={inputClass}
                name="title"
                placeholder="Goal title"
                required
              />
            </Field>
            <Field label="Area">
              <AreaSelect defaultValue="personal" />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                defaultValue="active"
                name="status"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
                <option value="achieved">Achieved</option>
              </select>
            </Field>
            <Field label="Horizon">
              <select
                className={inputClass}
                defaultValue="quarter"
                name="horizon"
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="quarter">Quarter</option>
                <option value="year">Year</option>
                <option value="someday">Someday</option>
              </select>
            </Field>
            <Field label="Measure">
              <input
                className={inputClass}
                name="measure"
                placeholder="Measure"
              />
            </Field>
            <Field label="Target">
              <input
                className={inputClass}
                name="targetValue"
                placeholder="Target"
              />
            </Field>
            <Field label="Why">
              <input
                className={inputClass}
                name="why"
                placeholder="Why it matters"
              />
            </Field>
            <Field label="Next step">
              <input
                className={inputClass}
                name="nextStep"
                placeholder="Next step"
              />
            </Field>
            <label className="sm:col-span-2">
              <span className={labelClass}>Description</span>
              <textarea
                className={textareaClass}
                name="description"
                placeholder="Goal description"
              />
            </label>
            <div className="sm:col-span-2">
              <button className={primaryButtonClass} type="submit">
                Create goal
              </button>
            </div>
          </form>
        </Panel>
      </div>

      <Panel
        subtitle="Clears only .local/life-os/manual-profile.json. Demo fixtures remain unchanged."
        title="Manual Profile Reset"
      >
        <form action={resetManualProfileAction}>
          <button className={dangerButtonClass} type="submit">
            Reset manual local profile
          </button>
        </form>
      </Panel>
    </div>
  );
}
