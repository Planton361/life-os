import {
  abandonChallengeAction,
  addChallengeProgressAction,
  archiveChallengeAction,
  archiveChallengeProgressAction,
  completeChallengeAction,
  createChallengeAction,
  updateChallengeAction,
  updateChallengeProgressAction,
} from "@/features/real-data/actions/challenge.actions";
import {
  aggregateChallengeProgress,
  challengeProgress,
  latestActiveProgressLog,
  type ChallengeRecord,
  type ChallengeWorkspace,
} from "@/features/real-data/domain/challenge";
import { cn } from "@/lib/cn";
import type { AntiRotWorkspace } from "@/features/real-data/domain/anti-rot";
import { AntiRotManualWorkspace } from "./anti-rot-manual-workspace";
import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/features/life/components/life-workbench-primitives";
const panel =
  "rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] p-4";
const card =
  "rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3";
const label = "text-[11px] font-semibold text-[var(--text-secondary)]";
function Feedback({ state }: { state?: string }) {
  if (!state) return null;
  const error =
    ["error", "invalid", "auth_blocked", "not_ready"].includes(state) ||
    [
      "anti_rot_error",
      "anti_rot_invalid",
      "anti_rot_empty",
      "anti_rot_resolve_first",
    ].includes(state);
  const messages: Record<string, string> = {
    abandoned: "Challenge abandoned.",
    archived: "Challenge archived.",
    auth_blocked: "Manual challenges require an active local sign-in.",
    completed: "Challenge completed and reward credited once.",
    created: "Challenge created.",
    error: "The change could not be saved.",
    invalid: "Check dates, target, progress and reward fields.",
    not_ready: "The target has not been reached.",
    progress: "Progress logged.",
    progress_archived: "Latest progress entry archived.",
    progress_updated: "Latest progress entry corrected.",
    updated: "Challenge updated.",
    anti_rot_archived: "Anti-Rot action archived.",
    anti_rot_completed: "Recommendation completed and recorded.",
    anti_rot_created: "Anti-Rot action created.",
    anti_rot_empty: "No active Anti-Rot action is available.",
    anti_rot_error: "The Anti-Rot change could not be saved.",
    anti_rot_invalid: "Check the Anti-Rot action fields.",
    anti_rot_paused: "Anti-Rot action paused.",
    anti_rot_reactivated: "Anti-Rot action reactivated.",
    anti_rot_recommended: "A new Anti-Rot action was selected.",
    anti_rot_resolve_first:
      "Complete, skip or rotate the current recommendation before pausing or archiving it.",
    anti_rot_restored: "Anti-Rot action restored.",
    anti_rot_skipped: "Recommendation skipped and recorded.",
    anti_rot_updated: "Anti-Rot action updated.",
  };
  return (
    <p
      className={cn(
        panel,
        "text-sm",
        error
          ? "border-[rgba(221,107,95,.35)] text-[var(--accent-red)]"
          : "border-[rgba(66,184,131,.3)] text-[var(--accent-green)]",
      )}
      role={error ? "alert" : "status"}
    >
      {messages[state] ?? state}
    </p>
  );
}
function Empty({ children }: { children: string }) {
  return (
    <p className="rounded-[12px] border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-muted)]">
      {children}
    </p>
  );
}
function Fields({ challenge }: { challenge?: ChallengeRecord }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <label className={label}>
        Title
        <input
          className={inputClass}
          defaultValue={challenge?.title}
          name="title"
          required
        />
      </label>
      <label className={label}>
        Description
        <textarea
          className={cn(inputClass, "min-h-20 py-3")}
          defaultValue={challenge?.description ?? ""}
          name="description"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={label}>
          Period
          <select
            className={inputClass}
            defaultValue={challenge?.periodType ?? "weekly"}
            name="periodType"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className={label}>
          Start
          <input
            className={inputClass}
            defaultValue={challenge?.startDate ?? today}
            name="startDate"
            required
            type="date"
          />
        </label>
        <label className={label}>
          End
          <input
            className={inputClass}
            defaultValue={challenge?.endDate ?? today}
            name="endDate"
            required
            type="date"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={label}>
          Target
          <input
            className={inputClass}
            defaultValue={challenge?.targetValue ?? ""}
            min="0.01"
            name="targetValue"
            required
            step="any"
            type="number"
          />
        </label>
        <label className={label}>
          Unit
          <input
            className={inputClass}
            defaultValue={challenge?.unit}
            name="unit"
            required
          />
        </label>
        <label className={label}>
          Reward coins
          <input
            className={inputClass}
            defaultValue={challenge?.rewardCoins ?? 0}
            min="0"
            name="rewardCoins"
            required
            type="number"
          />
        </label>
      </div>
    </>
  );
}
function ChallengeCard({
  challenge,
  logs,
}: {
  challenge: ChallengeRecord;
  logs: ChallengeWorkspace["logs"];
}) {
  const challengeLogs = logs.filter((l) => l.challengeId === challenge.id);
  const current = aggregateChallengeProgress(challengeLogs);
  const progress = challengeProgress(current, challenge.targetValue);
  const latest = latestActiveProgressLog(challengeLogs);
  const active = challenge.status === "active" && !challenge.archivedAt;
  return (
    <article className={card}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {challenge.title}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {challenge.periodType} · {challenge.startDate} → {challenge.endDate}{" "}
            · {challenge.status}
            {challenge.archivedAt ? " · archived" : ""}
          </p>
        </div>
        <span className="text-xs font-semibold text-[var(--accent-purple)]">
          {challenge.rewardCoins} coins
        </span>
      </div>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        {current} / {challenge.targetValue} {challenge.unit}
        {progress.overachieved ? " · overachieved" : ""}
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {Math.round(progress.percentage)}% ·{" "}
        {challenge.description ?? "No description"}
      </p>
      {active ? (
        <>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-[var(--accent-purple)]">
              Edit challenge
            </summary>
            <form action={updateChallengeAction} className="mt-3 grid gap-3">
              <input name="challengeId" type="hidden" value={challenge.id} />
              <Fields challenge={challenge} />
              <div className="flex flex-wrap gap-2">
                <button className={primaryButtonClass}>Save challenge</button>
                <button
                  className={secondaryButtonClass}
                  formAction={abandonChallengeAction}
                >
                  Abandon
                </button>
                <button
                  className={secondaryButtonClass}
                  formAction={archiveChallengeAction}
                >
                  Archive
                </button>
              </div>
            </form>
          </details>
          <form
            action={addChallengeProgressAction}
            className="mt-3 grid gap-2 rounded-[12px] border border-[var(--border-subtle)] p-3"
          >
            <input name="challengeId" type="hidden" value={challenge.id} />
            <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto]">
              <label className={label}>
                Increment
                <input
                  className={inputClass}
                  min="0.01"
                  name="increment"
                  required
                  step="any"
                  type="number"
                />
              </label>
              <label className={label}>
                Note
                <textarea
                  className={cn(inputClass, "min-h-11 py-3")}
                  name="note"
                />
              </label>
              <button className={primaryButtonClass}>Log progress</button>
            </div>
          </form>
          {latest ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold text-[var(--accent-cyan)]">
                Correct latest progress
              </summary>
              <form
                action={updateChallengeProgressAction}
                className="mt-3 grid gap-2"
              >
                <input name="challengeId" type="hidden" value={challenge.id} />
                <input name="progressLogId" type="hidden" value={latest.id} />
                <label className={label}>
                  Increment
                  <input
                    className={inputClass}
                    defaultValue={latest.increment}
                    min="0.01"
                    name="increment"
                    required
                    step="any"
                    type="number"
                  />
                </label>
                <label className={label}>
                  Note
                  <textarea
                    className={cn(inputClass, "min-h-16 py-3")}
                    defaultValue={latest.note ?? ""}
                    name="note"
                  />
                </label>
                <div className="flex gap-2">
                  <button className={primaryButtonClass}>
                    Save correction
                  </button>
                  <button
                    className={secondaryButtonClass}
                    formAction={archiveChallengeProgressAction}
                  >
                    Archive latest log
                  </button>
                </div>
              </form>
            </details>
          ) : null}
          {progress.eligible ? (
            <form action={completeChallengeAction} className="mt-3">
              <input name="challengeId" type="hidden" value={challenge.id} />
              <button className={primaryButtonClass}>Complete challenge</button>
            </form>
          ) : (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Completion unlocks when the logged total reaches the target.
            </p>
          )}
        </>
      ) : !challenge.archivedAt ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {challenge.status === "completed" ? (
            <form action={completeChallengeAction}>
              <input name="challengeId" type="hidden" value={challenge.id} />
              <button className={secondaryButtonClass}>
                Complete challenge
              </button>
            </form>
          ) : null}
          <form action={archiveChallengeAction}>
            <input name="challengeId" type="hidden" value={challenge.id} />
            <button className={secondaryButtonClass}>Archive challenge</button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
export function ChallengesManualWorkspace({
  antiRotWorkspace,
  state,
  workspace,
}: {
  antiRotWorkspace: AntiRotWorkspace | null;
  state?: string;
  workspace: ChallengeWorkspace | null;
}) {
  const active =
    workspace?.challenges.filter(
      (c) => c.status === "active" && !c.archivedAt,
    ) ?? [];
  const history =
    workspace?.challenges.filter(
      (c) => c.status !== "active" || c.archivedAt,
    ) ?? [];
  return (
    <main className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6">
      <header className={panel}>
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--accent-purple)]">
          Motivation / Manual challenges
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Challenges & Reward Ledger
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Explicit goals, honest progress and atomic rewards. No automatic
              completion or background generation.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[.14em] text-[var(--text-muted)]">
              Reward balance
            </p>
            <p className="text-3xl font-semibold text-[var(--text-primary)]">
              {workspace?.balance ?? 0} coins
            </p>
          </div>
        </div>
      </header>
      <Feedback state={state} />
      {workspace ? (
        <>
          {antiRotWorkspace ? (
            <AntiRotManualWorkspace workspace={antiRotWorkspace} />
          ) : (
            <Feedback state="auth_blocked" />
          )}
          <div className="grid gap-2 xl:grid-cols-[minmax(320px,.65fr)_minmax(0,1.35fr)]">
            <section className={panel}>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Create challenge
              </h2>
              <form
                action={createChallengeAction}
                className="mt-3 grid max-h-[520px] gap-3 overflow-y-auto pr-1"
              >
                <Fields />
                <button className={primaryButtonClass}>Create challenge</button>
              </form>
            </section>
            <section className={panel}>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Active challenges
              </h2>
              <div className="mt-3 grid max-h-[620px] gap-3 overflow-y-auto pr-1">
                {active.length ? (
                  active.map((c) => (
                    <ChallengeCard
                      challenge={c}
                      key={c.id}
                      logs={workspace.logs}
                    />
                  ))
                ) : (
                  <Empty>No active challenges.</Empty>
                )}
              </div>
            </section>
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            <section className={panel}>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Challenge history
              </h2>
              <div className="mt-3 grid max-h-[360px] gap-3 overflow-y-auto pr-1">
                {history.length ? (
                  history.map((c) => (
                    <ChallengeCard
                      challenge={c}
                      key={c.id}
                      logs={workspace.logs}
                    />
                  ))
                ) : (
                  <Empty>No completed, abandoned or archived challenges.</Empty>
                )}
              </div>
            </section>
            <section className={panel}>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Reward ledger
              </h2>
              <div className="mt-3 grid max-h-[360px] gap-2 overflow-y-auto pr-1">
                {workspace.ledger.length ? (
                  workspace.ledger.map((e) => (
                    <article className={card} key={e.id}>
                      <div className="flex justify-between gap-2">
                        <p className="text-xs text-[var(--text-primary)]">
                          {e.description}
                        </p>
                        <p className="text-xs font-semibold text-[var(--accent-green)]">
                          +{e.amount} coins
                        </p>
                      </div>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        Challenge reward · {e.createdAt}
                      </p>
                    </article>
                  ))
                ) : (
                  <Empty>No rewards credited yet.</Empty>
                )}
              </div>
            </section>
          </div>
        </>
      ) : (
        <Feedback state="auth_blocked" />
      )}
    </main>
  );
}
