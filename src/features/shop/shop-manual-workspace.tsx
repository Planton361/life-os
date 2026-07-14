import { randomUUID } from "node:crypto";
import {
  archiveShopItemAction,
  createShopItemAction,
  pauseShopItemAction,
  reactivateShopItemAction,
  redeemShopItemAction,
  restoreShopItemAction,
  updateShopItemAction,
} from "@/features/real-data/actions/shop.actions";
import {
  canRedeem,
  type ShopItem,
  type ShopWorkspace,
} from "@/features/real-data/domain/shop";
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
function Feedback({ state }: { state?: string }) {
  if (!state) return null;
  const error = ["error", "invalid", "insufficient", "auth_blocked"].includes(
    state,
  );
  const messages: Record<string, string> = {
    archived: "Shop item archived.",
    auth_blocked: "Manual Shop requires an active local sign-in.",
    created: "Shop item created.",
    error: "The Shop change could not be saved.",
    insufficient:
      "Redemption failed: the item is unavailable or the coin balance is insufficient.",
    invalid: "Check title and positive whole-number coin cost.",
    paused: "Shop item paused.",
    reactivated: "Shop item reactivated.",
    redeemed: "Reward redeemed and coins booked once.",
    restored: "Shop item restored.",
    updated: "Shop item updated.",
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
function Fields({ item }: { item?: ShopItem }) {
  return (
    <>
      <label className={label}>
        Title
        <input
          className={inputClass}
          defaultValue={item?.title}
          name="title"
          required
        />
      </label>
      <label className={label}>
        Description
        <textarea
          className={cn(inputClass, "min-h-16 py-2")}
          defaultValue={item?.description ?? ""}
          name="description"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={label}>
          Category
          <input
            className={inputClass}
            defaultValue={item?.category ?? ""}
            name="category"
          />
        </label>
        <label className={label}>
          Coin cost
          <input
            className={inputClass}
            defaultValue={item?.costCoins ?? ""}
            min="1"
            name="costCoins"
            required
            step="1"
            type="number"
          />
        </label>
      </div>
    </>
  );
}
function Id({ id }: { id: string }) {
  return <input name="shopItemId" type="hidden" value={id} />;
}
function ItemCard({ balance, item }: { balance: number; item: ShopItem }) {
  const archived = Boolean(item.archivedAt);
  const redeemable = canRedeem(item, balance);
  return (
    <article className={card} data-shop-item={item.id}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {item.title}
          </h3>
          <p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-muted)]">
            {archived ? "Archived" : item.isPaused ? "Paused" : "Active"}
            {item.category ? ` · ${item.category}` : ""}
          </p>
        </div>
        <p className="text-sm font-semibold text-[var(--accent-yellow)]">
          {item.costCoins} coins
        </p>
      </div>
      {item.description ? (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          {item.description}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        {archived
          ? "Historical item"
          : item.isPaused
            ? "Paused · unavailable"
            : redeemable
              ? "Available to redeem"
              : "Not enough coins"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {archived ? (
          <form action={restoreShopItemAction}>
            <Id id={item.id} />
            <button className={secondaryButtonClass}>Restore</button>
          </form>
        ) : (
          <>
            {!item.isPaused ? (
              <form action={redeemShopItemAction}>
                <Id id={item.id} />
                <input name="requestKey" type="hidden" value={randomUUID()} />
                <button className={primaryButtonClass} disabled={!redeemable}>
                  Einlösen
                </button>
              </form>
            ) : null}
            <form
              action={
                item.isPaused ? reactivateShopItemAction : pauseShopItemAction
              }
            >
              <Id id={item.id} />
              <button className={secondaryButtonClass}>
                {item.isPaused ? "Reactivate" : "Pause"}
              </button>
            </form>
            <form action={archiveShopItemAction}>
              <Id id={item.id} />
              <button className={secondaryButtonClass}>Archive</button>
            </form>
          </>
        )}
      </div>
      {!archived ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-[var(--accent-blue)]">
            Edit item
          </summary>
          <form action={updateShopItemAction} className="mt-2 grid gap-2">
            <Id id={item.id} />
            <Fields item={item} />
            <button className={secondaryButtonClass}>Save item</button>
          </form>
        </details>
      ) : null}
    </article>
  );
}
export function ShopManualWorkspace({
  state,
  workspace,
}: {
  state?: string;
  workspace: ShopWorkspace | null;
}) {
  const current = workspace?.items.filter((item) => !item.archivedAt) ?? [];
  const archived = workspace?.items.filter((item) => item.archivedAt) ?? [];
  return (
    <main className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6">
      <header className={panel}>
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--accent-yellow)]">
          Rewards / Manual Shop
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Reward Shop
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Intentional personal rewards backed only by the append-only coin
              ledger. No payments or automatic redemption.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[.14em] text-[var(--text-muted)]">
              Coin balance
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
          <div className="grid gap-2 xl:grid-cols-[minmax(300px,.7fr)_minmax(0,1.3fr)]">
            <section className={panel} aria-label="Create Shop item">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Create Shop item
              </h2>
              <form
                action={createShopItemAction}
                className="mt-3 grid max-h-[420px] gap-2 overflow-y-auto pr-1"
              >
                <Fields />
                <button className={primaryButtonClass}>Create item</button>
              </form>
            </section>
            <section className={panel} aria-label="Current Shop items">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Shop items
              </h2>
              <div className="mt-3 grid max-h-[560px] gap-2 overflow-y-auto pr-1">
                {current.length ? (
                  current.map((item) => (
                    <ItemCard
                      balance={workspace.balance}
                      item={item}
                      key={item.id}
                    />
                  ))
                ) : (
                  <p className="rounded-[12px] border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-muted)]">
                    No Shop items yet. Create a personal reward without
                    assigning real money.
                  </p>
                )}
              </div>
              {archived.length ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-[var(--text-secondary)]">
                    Archived items ({archived.length})
                  </summary>
                  <div className="mt-2 grid gap-2">
                    {archived.map((item) => (
                      <ItemCard
                        balance={workspace.balance}
                        item={item}
                        key={item.id}
                      />
                    ))}
                  </div>
                </details>
              ) : null}
            </section>
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            <section className={panel} aria-label="Shop redemption history">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Redemption history
              </h2>
              <div className="mt-3 grid max-h-[360px] gap-2 overflow-y-auto pr-1">
                {workspace.redemptions.length ? (
                  workspace.redemptions.map((entry) => (
                    <article className={card} key={entry.id}>
                      <div className="flex justify-between gap-2">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          {entry.titleSnapshot}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Spent {entry.costCoins} coins
                        </p>
                      </div>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        Redeemed · {entry.redeemedAt}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    No rewards redeemed yet.
                  </p>
                )}
              </div>
            </section>
            <section className={panel} aria-label="Reward ledger history">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Reward ledger
              </h2>
              <div className="mt-3 grid max-h-[360px] gap-2 overflow-y-auto pr-1">
                {workspace.ledger.length ? (
                  workspace.ledger.map((entry) => (
                    <article className={card} key={entry.id}>
                      <div className="flex justify-between gap-2">
                        <p className="text-xs text-[var(--text-primary)]">
                          {entry.description}
                        </p>
                        <p className="text-xs font-semibold text-[var(--text-secondary)]">
                          {entry.amount > 0
                            ? `+${entry.amount} earned`
                            : `${entry.amount} spent`}{" "}
                          coins
                        </p>
                      </div>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        {entry.entryType === "challenge_reward"
                          ? "Challenge reward"
                          : "Shop redemption"}{" "}
                        · {entry.createdAt}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    No ledger entries yet. Balance is 0 coins.
                  </p>
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
