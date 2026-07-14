import {
  archiveAntiRotAction,
  completeAntiRotRecommendation,
  createAntiRotAction,
  pauseAntiRotAction,
  reactivateAntiRotAction,
  restoreAntiRotAction,
  rotateAntiRotAction,
  skipAntiRotRecommendation,
  updateAntiRotAction,
} from "@/features/real-data/actions/anti-rot.actions";
import type {
  AntiRotAction,
  AntiRotWorkspace,
} from "@/features/real-data/domain/anti-rot";
import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/features/life/components/life-workbench-primitives";
import { cn } from "@/lib/cn";
const panel =
  "rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] p-4";
const card =
  "rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3";
const label = "text-[11px] font-semibold text-[var(--text-secondary)]";
function Fields({ action }: { action?: AntiRotAction }) {
  return (
    <>
      <label className={label}>
        Title
        <input
          className={inputClass}
          defaultValue={action?.title}
          name="title"
          required
        />
      </label>
      <label className={label}>
        Description
        <textarea
          className={cn(inputClass, "min-h-16 py-2")}
          defaultValue={action?.description ?? ""}
          name="description"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className={label}>
          Category
          <select
            className={inputClass}
            defaultValue={action?.category ?? ""}
            name="category"
          >
            <option value="">None</option>
            {[
              "movement",
              "social",
              "creative",
              "outside",
              "learning",
              "reset",
              "custom",
            ].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Minutes
          <input
            className={inputClass}
            defaultValue={action?.estimatedMinutes ?? ""}
            min="1"
            name="estimatedMinutes"
            type="number"
          />
        </label>
        <label className={label}>
          Energy
          <select
            className={inputClass}
            defaultValue={action?.energy ?? ""}
            name="energy"
          >
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
    </>
  );
}
function Id({ actionId }: { actionId: string }) {
  return <input name="actionId" type="hidden" value={actionId} />;
}
function ActionCard({ action }: { action: AntiRotAction }) {
  const archived = Boolean(action.archivedAt);
  return (
    <article className={card} data-anti-rot-action={action.id}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {action.title}
          </h3>
          <p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)]">
            {archived ? "Archived" : action.status}
            {action.category ? ` · ${action.category}` : ""}
            {action.estimatedMinutes ? ` · ${action.estimatedMinutes} min` : ""}
          </p>
        </div>
        {action.energy ? (
          <span className="text-[10px] text-[var(--text-secondary)]">
            {action.energy} energy
          </span>
        ) : null}
      </div>
      {action.description ? (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          {action.description}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {archived ? (
          <form action={restoreAntiRotAction}>
            <Id actionId={action.id} />
            <button className={secondaryButtonClass}>Restore</button>
          </form>
        ) : (
          <>
            <form
              action={
                action.status === "active"
                  ? pauseAntiRotAction
                  : reactivateAntiRotAction
              }
            >
              <Id actionId={action.id} />
              <button className={secondaryButtonClass}>
                {action.status === "active" ? "Pause" : "Reactivate"}
              </button>
            </form>
            <form action={archiveAntiRotAction}>
              <Id actionId={action.id} />
              <button className={secondaryButtonClass}>Archive</button>
            </form>
          </>
        )}
      </div>
      {!archived ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-[var(--accent-blue)]">
            Edit action
          </summary>
          <form action={updateAntiRotAction} className="mt-2 grid gap-2">
            <Id actionId={action.id} />
            <Fields action={action} />
            <button className={secondaryButtonClass}>Save changes</button>
          </form>
        </details>
      ) : null}
    </article>
  );
}
export function AntiRotManualWorkspace({
  workspace,
}: {
  workspace: AntiRotWorkspace;
}) {
  const active = workspace.actions.filter((action) => !action.archivedAt);
  const archived = workspace.actions.filter((action) => action.archivedAt);
  const titles = new Map(
    workspace.actions.map((action) => [action.id, action.title]),
  );
  return (
    <section aria-labelledby="anti-rot-heading" className="grid gap-2">
      <header className={panel}>
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--accent-purple)]">
          Anti-Rot / Manual
        </p>
        <h2
          className="mt-1 text-xl font-semibold text-[var(--text-primary)]"
          id="anti-rot-heading"
        >
          Action Library & Rotation
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Explicit, deterministic recommendations. Loading this page never
          rotates automatically.
        </p>
      </header>
      <div className="grid gap-2 xl:grid-cols-[minmax(300px,.8fr)_minmax(0,1.2fr)]">
        <section className={panel} aria-label="Current Anti-Rot recommendation">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Current recommendation
          </h3>
          {workspace.current ? (
            <article className={cn(card, "mt-3")}>
              <p className="font-semibold text-[var(--text-primary)]">
                {workspace.current.action.title}
              </p>
              {workspace.current.action.description ? (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {workspace.current.action.description}
                </p>
              ) : null}
              <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                {workspace.current.action.category ?? "Uncategorized"}
                {workspace.current.action.estimatedMinutes
                  ? ` · ${workspace.current.action.estimatedMinutes} min`
                  : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={completeAntiRotRecommendation}>
                  <input
                    name="recommendationEventId"
                    type="hidden"
                    value={workspace.current.recommendation.id}
                  />
                  <button className={primaryButtonClass}>Erledigt</button>
                </form>
                <form action={skipAntiRotRecommendation}>
                  <input
                    name="recommendationEventId"
                    type="hidden"
                    value={workspace.current.recommendation.id}
                  />
                  <button className={secondaryButtonClass}>Überspringen</button>
                </form>
                <form action={rotateAntiRotAction}>
                  <button className={secondaryButtonClass}>
                    Neu auswählen
                  </button>
                </form>
              </div>
            </article>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-[var(--text-muted)]">
                No recommendation is active. Selection happens only when you
                request it.
              </p>
              <form action={rotateAntiRotAction} className="mt-3">
                <button
                  className={primaryButtonClass}
                  disabled={
                    !active.some((action) => action.status === "active")
                  }
                >
                  Aktion auswählen
                </button>
              </form>
            </div>
          )}
        </section>
        <section className={panel} aria-label="Anti-Rot action library">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Create action
          </h3>
          <form
            action={createAntiRotAction}
            className="mt-3 grid max-h-[430px] gap-2 overflow-y-auto pr-1"
          >
            <Fields />
            <button className={primaryButtonClass}>Create action</button>
          </form>
        </section>
      </div>
      <div className="grid gap-2 xl:grid-cols-2">
        <section
          className={panel}
          aria-label="Active and paused Anti-Rot actions"
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Action library
          </h3>
          <div className="mt-3 grid max-h-[430px] gap-2 overflow-y-auto pr-1">
            {active.length ? (
              active.map((action) => (
                <ActionCard action={action} key={action.id} />
              ))
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                No actions yet. Create one to prepare explicit rotation.
              </p>
            )}
          </div>
          {archived.length ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-[var(--text-secondary)]">
                Archived actions ({archived.length})
              </summary>
              <div className="mt-2 grid gap-2">
                {archived.map((action) => (
                  <ActionCard action={action} key={action.id} />
                ))}
              </div>
            </details>
          ) : null}
        </section>
        <section className={panel} aria-label="Anti-Rot event history">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Event history
          </h3>
          <div className="mt-3 grid max-h-[430px] gap-2 overflow-y-auto pr-1">
            {workspace.events.length ? (
              workspace.events.map((event) => (
                <article className={card} key={event.id}>
                  <div className="flex justify-between gap-2">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      {titles.get(event.actionId) ?? "Historical action"}
                    </p>
                    <span className="text-[10px] uppercase text-[var(--text-secondary)]">
                      {event.eventType}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    {event.createdAt}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                No recommendations, completions or skips yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
