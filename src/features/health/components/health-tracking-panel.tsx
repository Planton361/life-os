import { saveSleepAction, saveWeightAction, saveWeightGoalAction, undoTodayMoodAction } from "@/features/real-data/actions/health.actions";
import type { HealthTrackingData } from "../health-tracking";
import { sleepLabel, weightProgress } from "../health-tracking";

const inputClass = "min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[rgba(8,14,24,.7)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]";
const buttonClass = "rounded-lg border border-[rgba(95,200,215,.28)] bg-[rgba(95,200,215,.1)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)] disabled:opacity-50";

const moodAccent: Record<string, string> = { calm: "var(--accent-cyan)", content: "var(--accent-cyan)", focused: "var(--accent-blue)", tired: "var(--text-muted)", anxious: "var(--accent-orange)", stressed: "var(--accent-red)", happy: "var(--accent-green)" };
export function MoodHistoryPanel({ data }: { data: HealthTrackingData }) {
  const moods = data.snapshot?.moods ?? [];
  return <section aria-labelledby="mood-history-title" className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] p-4">
    <h2 id="mood-history-title" className="text-lg font-semibold text-[var(--text-primary)]">Mood history</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Timestamped self-checks. Labels and color stay paired; no diagnosis is inferred.</p>
    {data.profileId === "manual" && data.authAvailable && moods.length ? <form action={undoTodayMoodAction} className="mt-2"><input type="hidden" name="returnTo" value="/health/mental"/><button className={buttonClass} type="submit">Undo latest mood today</button></form> : null}
    <div aria-label="Mood history" className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">{moods.length ? moods.map(entry=><div key={entry.id} className="rounded-lg border border-[var(--border-subtle)] px-2 py-1.5 text-xs" style={{ borderLeftColor: moodAccent[entry.mood], borderLeftWidth: 3 }}><p className="font-semibold capitalize">{entry.mood}</p><p className="text-[var(--text-muted)]">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: entry.timezone }).format(new Date(entry.recordedAt))}</p></div>) : <p className="text-xs text-[var(--text-muted)]">No mood entries yet.</p>}</div>
  </section>;
}

export function SleepTrackingPanel({ data, status }: { data: HealthTrackingData; status?: string }) {
  const entries = data.snapshot?.sleep ?? [];
  return <section aria-labelledby="sleep-tracking-title" className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] p-4">
    <h2 id="sleep-tracking-title" className="text-lg font-semibold text-[var(--text-primary)]">Manual sleep log</h2>
    <p className="mt-1 text-xs text-[var(--text-secondary)]">Night, duration and optional self-rated quality. No recovery score.</p>
    {status ? <p role={status === "saved" ? "status" : "alert"} className="mt-2 text-xs text-[var(--accent-cyan)]">{status === "saved" ? "Sleep entry saved." : status === "blocked" ? "Manual sign-in is required." : "Sleep entry could not be saved."}</p> : null}
    {data.profileId === "manual" && data.authAvailable ? <form action={saveSleepAction} className="mt-3 grid gap-2 sm:grid-cols-5">
      <label className="grid gap-1 text-xs text-[var(--text-secondary)]">Night/date<input required name="sleepDate" type="date" defaultValue={entries[0]?.sleepDate} className={inputClass}/></label>
      <label className="grid gap-1 text-xs text-[var(--text-secondary)]">Hours<input required name="hours" type="number" min="0" max="24" defaultValue={entries[0] ? Math.floor(entries[0].durationMinutes / 60) : 7} className={inputClass}/></label>
      <label className="grid gap-1 text-xs text-[var(--text-secondary)]">Minutes<input required name="minutes" type="number" min="0" max="59" defaultValue={entries[0]?.durationMinutes ? entries[0].durationMinutes % 60 : 30} className={inputClass}/></label>
      <label className="grid gap-1 text-xs text-[var(--text-secondary)]">Quality (optional)<select name="quality" defaultValue={entries[0]?.quality ?? ""} className={inputClass}><option value="">Unknown</option>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></label>
      <button className={`${buttonClass} self-end`} type="submit">Save sleep</button>
      <label className="grid gap-1 text-xs text-[var(--text-secondary)] sm:col-span-5">Note (optional)<input name="note" maxLength={500} defaultValue={entries[0]?.note ?? ""} className={inputClass}/></label>
    </form> : <p className="mt-3 text-xs text-[var(--text-muted)]">{data.profileId === "manual" ? "Sign in to use Manual writes." : "No writes are available in this profile."}</p>}
    <div aria-label="Sleep history" className="mt-3 grid gap-1">{entries.length ? entries.slice(0, 14).map(e=><div key={e.id} className="flex justify-between rounded-lg border border-[var(--border-subtle)] px-2 py-1.5 text-xs"><span>{e.sleepDate}</span><span>{sleepLabel(e.durationMinutes)}{e.quality ? ` · quality ${e.quality}/5` : " · quality unknown"}</span></div>) : <p className="text-xs text-[var(--text-muted)]">No sleep entries yet.</p>}</div>
  </section>;
}

export function WeightTrackingPanel({ data, status }: { data: HealthTrackingData; status?: string }) {
  const weights = data.snapshot?.weights ?? []; const goal = data.snapshot?.weightGoal; const progress = goal ? weightProgress(weights, goal.targetWeightKg) : null;
  return <section aria-labelledby="weight-tracking-title" className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] p-4">
    <h2 id="weight-tracking-title" className="text-lg font-semibold text-[var(--text-primary)]">Weight history & goal</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Personal measurements and a neutral target. No advice or medical interpretation.</p>
    {status ? <p role={status === "saved" ? "status" : "alert"} className="mt-2 text-xs text-[var(--accent-cyan)]">{status === "saved" ? "Weight data saved." : status === "blocked" ? "Manual sign-in is required." : "Weight data could not be saved."}</p> : null}
    {data.profileId === "manual" && data.authAvailable ? <div className="mt-3 grid gap-3 lg:grid-cols-2"><form action={saveWeightAction} className="grid grid-cols-[1fr_1fr_auto] gap-2"><label className="grid gap-1 text-xs text-[var(--text-secondary)]">Date<input required name="measuredOn" type="date" defaultValue={weights[0]?.measuredOn} className={inputClass}/></label><label className="grid gap-1 text-xs text-[var(--text-secondary)]">Weight (kg)<input required name="weightKg" type="number" min="20" max="500" step="0.01" defaultValue={weights[0]?.weightKg} className={inputClass}/></label><button className={`${buttonClass} self-end`} type="submit">Save</button></form><form action={saveWeightGoalAction} className="grid grid-cols-[1fr_1fr_auto] gap-2"><label className="grid gap-1 text-xs text-[var(--text-secondary)]">Target (kg)<input required name="targetWeightKg" type="number" min="20" max="500" step="0.01" defaultValue={goal?.targetWeightKg} className={inputClass}/></label><label className="grid gap-1 text-xs text-[var(--text-secondary)]">Target date (optional)<input name="targetDate" type="date" defaultValue={goal?.targetDate ?? ""} className={inputClass}/></label><button className={`${buttonClass} self-end`} type="submit">Set goal</button></form></div> : <p className="mt-3 text-xs text-[var(--text-muted)]">{data.profileId === "manual" ? "Sign in to use Manual writes." : "No writes are available in this profile."}</p>}
    <div aria-label="Weight progress" className="mt-3 rounded-lg border border-[var(--border-subtle)] p-2 text-xs">{progress && goal ? <><p>{progress.current.toFixed(2)} kg current · {goal.targetWeightKg.toFixed(2)} kg target{goal.targetDate ? ` · ${goal.targetDate}` : ""}</p><progress aria-label={`Weight goal progress ${progress.progress}%`} className="mt-2 w-full" max="100" value={progress.progress}/><p className="mt-1 text-[var(--text-muted)]">{progress.progress}% of the measured start-to-target distance</p></> : <p className="text-[var(--text-muted)]">Current weight and target are needed before progress can be calculated.</p>}</div>
    <div aria-label="Weight history" className="mt-3 grid gap-1">{weights.length ? weights.slice(0,14).map(e=><div key={e.id} className="flex justify-between rounded-lg border border-[var(--border-subtle)] px-2 py-1.5 text-xs"><span>{e.measuredOn}</span><span>{e.weightKg.toFixed(2)} kg</span></div>) : <p className="text-xs text-[var(--text-muted)]">No weight entries yet.</p>}</div>
  </section>;
}
