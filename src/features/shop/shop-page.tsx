"use client";

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import {
  contentStateDataAttributes,
  resolveContentStateMeta,
} from "@/features/content-state";
import {
  CurrencyPill,
  DialogShell,
  EmptyState,
  FieldLabel,
  LocalMockNotice,
  Pill,
  StatusPill,
  SystemPageHeader,
  SystemPageShell,
  SystemPanel,
  Toast,
  chipButtonClass,
  createLocalId,
  formatDate,
  inputClass,
  matchesQuery,
  optionLabel,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
  textareaClass,
  type ToastState,
} from "@/features/system/system-ui";
import type {
  LifeCurrency,
  RewardCategory,
  RewardItem,
  RewardStatus,
  RewardTransaction,
  ShopViewModel,
} from "./types";

type ShopSegment = "all" | "screen_time" | "gaming" | "media" | "recovery" | "custom";
type RewardDraft = Omit<RewardItem, "id" | "createdByUser" | "lastClaimedAt">;
type RewardDialogState =
  | { mode: "create"; reward?: undefined }
  | { mode: "edit"; reward: RewardItem }
  | null;

const shopAccent = "var(--accent-yellow)";

const segmentOptions: { label: string; value: ShopSegment }[] = [
  { label: "All", value: "all" },
  { label: "Screen Time", value: "screen_time" },
  { label: "Gaming", value: "gaming" },
  { label: "Media", value: "media" },
  { label: "Recovery", value: "recovery" },
  { label: "Custom", value: "custom" },
];

const categoryOptions: RewardCategory[] = [
  "screen_time",
  "gaming",
  "media",
  "food",
  "free_time",
  "purchase",
  "recovery",
  "custom",
];

const statusOptions: RewardStatus[] = [
  "available",
  "locked",
  "claimed",
  "cooldown",
  "disabled",
];

const statusAccent: Record<RewardStatus, string> = {
  available: "var(--accent-green)",
  claimed: "var(--accent-green)",
  cooldown: "var(--accent-orange)",
  disabled: "var(--accent-red)",
  locked: "var(--accent-red)",
};

function emptyRewardDraft(): RewardDraft {
  return {
    category: "custom",
    cooldownLabel: "",
    cost: 8,
    description: "",
    limitLabel: "",
    status: "available",
    title: "",
  };
}

function draftFromReward(reward: RewardItem): RewardDraft {
  return {
    category: reward.category,
    cooldownLabel: reward.cooldownLabel ?? "",
    cost: reward.cost,
    description: reward.description,
    limitLabel: reward.limitLabel ?? "",
    status: reward.status,
    title: reward.title,
  };
}

function canClaim(reward: RewardItem, balance: number) {
  return reward.status === "available" && reward.cost <= balance;
}

function sectionStateAttributes({
  capacity,
  itemCount,
  profileId,
  section,
}: Readonly<{
  capacity: number;
  itemCount: number;
  profileId: ShopViewModel["profileId"];
  section: string;
}>) {
  return {
    ...contentStateDataAttributes(
      resolveContentStateMeta({ capacity, itemCount }),
      profileId,
    ),
    "data-shop-section": section,
  };
}

function nextReward(rewards: RewardItem[], balance: number) {
  return rewards
    .filter((reward) => reward.status === "available" && reward.cost <= balance)
    .sort((left, right) => left.cost - right.cost)[0];
}

function RewardBalanceCard({
  canCreate,
  currency,
  profileId,
  rewards,
  onCreate,
  onViewHistory,
}: Readonly<{
  canCreate: boolean;
  currency: LifeCurrency;
  profileId: ShopViewModel["profileId"];
  rewards: RewardItem[];
  onCreate: () => void;
  onViewHistory: () => void;
}>) {
  const next = nextReward(rewards, currency.balance);
  const isDemo = profileId === "demo";

  return (
    <SystemPanel
      badge={<Pill accent={shopAccent}>{isDemo ? "Demo currency" : "Local UI signal"}</Pill>}
      className="lg:col-span-2"
      dataAttributes={sectionStateAttributes({
        capacity: 1,
        itemCount: currency.balance > 0 ? 1 : 0,
        profileId,
        section: "reward-balance",
      })}
      subtitle="Life Credits are a local UI signal only. No account, wallet, payment or purchase flow is connected."
      title="Reward Balance"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.55fr)]">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Current balance
          </p>
          <p className="mt-2 text-5xl font-semibold leading-none text-[var(--text-primary)]">
            {currency.balance} <span className="text-2xl text-[var(--text-muted)]">LC</span>
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Earned this week
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {currency.earnedThisWeek} LC
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Spent this week
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {currency.spentThisWeek} LC
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-[16px] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_7%,rgba(18,28,43,.58))] p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Next possible reward
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              {next?.title ?? "No affordable reward"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              {next
                ? `${next.cost} LC · ${next.description}`
                : "Rewards appear here only after local rewards and rules exist."}
            </p>
          </div>
          <LocalMockNotice>
            {isDemo ? "Demo currency - no real money" : "Local signal only - no wallet"}
          </LocalMockNotice>
          <div className="flex flex-wrap gap-2">
            <button
              className={primaryButtonClass}
              disabled={!canCreate}
              onClick={onCreate}
              type="button"
            >
              Create reward
            </button>
            <button className={secondaryButtonClass} onClick={onViewHistory} type="button">
              View history
            </button>
          </div>
        </div>
      </div>
    </SystemPanel>
  );
}

function RewardCard({
  balance,
  reward,
  selected,
  onClaim,
  onEdit,
  onSelect,
}: Readonly<{
  balance: number;
  reward: RewardItem;
  selected: boolean;
  onClaim: () => void;
  onEdit: () => void;
  onSelect: () => void;
}>) {
  const claimable = canClaim(reward, balance);
  const disabledReason =
    reward.status !== "available"
      ? optionLabel(reward.status)
      : reward.cost > balance
        ? "Not enough Life Credits"
        : null;

  return (
    <article
      className={cn(
        "flex min-h-[220px] flex-col rounded-[16px] border bg-[rgba(18,28,43,.54)] p-4 transition",
        selected
          ? "border-[color-mix(in_srgb,var(--accent)_48%,var(--border-default))]"
          : "border-[var(--border-subtle)] hover:border-[var(--border-default)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {reward.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill quiet>{optionLabel(reward.category)}</Pill>
            <StatusPill accent={statusAccent[reward.status]}>
              {optionLabel(reward.status)}
            </StatusPill>
            <CurrencyPill amount={reward.cost} />
          </div>
        </div>
        <button className={quietButtonClass} onClick={onSelect} type="button">
          {selected ? "Selected" : "Select"}
        </button>
      </div>
      <p className="mt-3 flex-1 text-xs leading-5 text-[var(--text-secondary)]">
        {reward.description}
      </p>
      <div className="mt-3 space-y-1 text-[10px] leading-4 text-[var(--text-muted)]">
        {reward.limitLabel ? <p>Limit: {reward.limitLabel}</p> : null}
        {reward.cooldownLabel ? <p>Cooldown: {reward.cooldownLabel}</p> : null}
        <p>{reward.createdByUser ? "Created by user" : "System suggestion"}</p>
        {disabledReason ? <p className="text-[var(--accent-red)]">{disabledReason}</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={primaryButtonClass}
          disabled={!claimable}
          onClick={onClaim}
          type="button"
        >
          Claim
        </button>
        <button className={secondaryButtonClass} onClick={onEdit} type="button">
          Edit
        </button>
      </div>
    </article>
  );
}

function RewardDialog({
  dialog,
  onClose,
  onSave,
}: Readonly<{
  dialog: RewardDialogState;
  onClose: () => void;
  onSave: (draft: RewardDraft, reward?: RewardItem) => void;
}>) {
  const [draft, setDraft] = useState<RewardDraft>(() =>
    dialog?.mode === "edit" ? draftFromReward(dialog.reward) : emptyRewardDraft(),
  );
  const [error, setError] = useState<string | null>(null);

  if (!dialog) {
    return null;
  }

  const activeDialog = dialog;

  function update<K extends keyof RewardDraft>(key: K, value: RewardDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError("Title is required");
      return;
    }

    if (!Number.isFinite(draft.cost) || draft.cost <= 0) {
      setError("Cost must be a positive LC amount");
      return;
    }

    onSave(draft, activeDialog.mode === "edit" ? activeDialog.reward : undefined);
  }

  return (
    <DialogShell labelledBy="reward-dialog-heading" onClose={onClose} open>
      <form onSubmit={submit}>
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="reward-dialog-heading">
            {activeDialog.mode === "edit" ? "Edit reward" : "Create reward"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Local simulation only. Rewards are not saved to a database.
          </p>
        </div>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <label>
            <FieldLabel>Title *</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => update("title", event.target.value)}
              value={draft.title}
            />
          </label>
          <label>
            <FieldLabel>Category</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("category", event.target.value as RewardCategory)}
              value={draft.category}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {optionLabel(category)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Cost in LC *</FieldLabel>
            <input
              className={inputClass}
              min={1}
              onChange={(event) => update("cost", Number(event.target.value))}
              type="number"
              value={draft.cost}
            />
          </label>
          <label>
            <FieldLabel>Status</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("status", event.target.value as RewardStatus)}
              value={draft.status}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {optionLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <FieldLabel>Description</FieldLabel>
            <textarea
              className={textareaClass}
              onChange={(event) => update("description", event.target.value)}
              value={draft.description}
            />
          </label>
          <label>
            <FieldLabel optional>Limit label</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => update("limitLabel", event.target.value)}
              value={draft.limitLabel ?? ""}
            />
          </label>
          <label>
            <FieldLabel optional>Cooldown label</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => update("cooldownLabel", event.target.value)}
              value={draft.cooldownLabel ?? ""}
            />
          </label>
          {error ? (
            <p className="sm:col-span-2 rounded-[12px] border border-[rgba(221,107,95,.28)] bg-[rgba(221,107,95,.08)] px-3 py-2 text-xs text-[var(--accent-red)]">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button className={secondaryButtonClass} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={primaryButtonClass} type="submit">
            Save locally
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

function ClaimDialog({
  balance,
  onClose,
  onConfirm,
  reward,
}: Readonly<{
  balance: number;
  onClose: () => void;
  onConfirm: () => void;
  reward: RewardItem | null;
}>) {
  if (!reward) {
    return null;
  }

  return (
    <DialogShell labelledBy="claim-reward-dialog-heading" onClose={onClose} open>
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]" id="claim-reward-dialog-heading">
          Claim selected reward
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          Local simulation only. No real money or wallet is connected.
        </p>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] p-4">
          <p className="text-lg font-semibold text-[var(--text-primary)]">{reward.title}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Cost: {reward.cost} LC · Balance after: {balance - reward.cost} LC
          </p>
        </div>
        <LocalMockNotice>Local simulation only</LocalMockNotice>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
        <button className={secondaryButtonClass} onClick={onClose} type="button">
          Cancel
        </button>
        <button className={primaryButtonClass} onClick={onConfirm} type="button">
          Confirm claim
        </button>
      </div>
    </DialogShell>
  );
}

export function ShopPage({ viewModel }: Readonly<{ viewModel: ShopViewModel }>) {
  const historyRef = useRef<HTMLElement>(null);
  const profileId = viewModel.profileId;
  const isDemo = profileId === "demo";
  const [currency, setCurrency] = useState(viewModel.currency);
  const [rewards, setRewards] = useState<RewardItem[]>(viewModel.rewards);
  const [transactions, setTransactions] = useState<RewardTransaction[]>(
    viewModel.transactions,
  );
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<ShopSegment>("all");
  const [statusFilter, setStatusFilter] = useState<RewardStatus | "all">("all");
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [customOnly, setCustomOnly] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(
    viewModel.rewards[0]?.id ?? null,
  );
  const [rewardDialog, setRewardDialog] = useState<RewardDialogState>(null);
  const [claimReward, setClaimReward] = useState<RewardItem | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const canUseRewardDrafts = isDemo;

  const selectedReward = rewards.find((reward) => reward.id === selectedRewardId);
  const recommendedRewards = viewModel.recommendedRewardIds
    .map((id) => rewards.find((reward) => reward.id === id))
    .filter((reward): reward is RewardItem => Boolean(reward))
    .slice(0, 3);

  const filteredRewards = useMemo(
    () =>
      rewards.filter((reward) => {
        const segmentMatches = segment === "all" || reward.category === segment;
        const statusMatches =
          statusFilter === "all" || reward.status === statusFilter;
        const affordabilityMatches =
          !affordableOnly || canClaim(reward, currency.balance);
        const customMatches = !customOnly || reward.createdByUser;

        return (
          segmentMatches &&
          statusMatches &&
          affordabilityMatches &&
          customMatches &&
          matchesQuery(
            [reward.title, reward.description, reward.category, reward.status],
            query,
          )
        );
      }),
    [affordableOnly, currency.balance, customOnly, query, rewards, segment, statusFilter],
  );

  function showToast(nextToast: ToastState) {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 2800);
  }

  function handleSaveReward(draft: RewardDraft, reward?: RewardItem) {
    if (!canUseRewardDrafts) {
      return;
    }

    if (reward) {
      setRewards((current) =>
        current.map((item) =>
          item.id === reward.id
            ? {
                ...item,
                ...draft,
                cooldownLabel: draft.cooldownLabel || undefined,
                limitLabel: draft.limitLabel || undefined,
              }
            : item,
        ),
      );
      showToast({
        body: "Reward updated in local state only.",
        title: "Reward saved locally",
        tone: "success",
      });
    } else {
      const createdReward: RewardItem = {
        ...draft,
        cooldownLabel: draft.cooldownLabel || undefined,
        createdByUser: true,
        id: createLocalId("reward"),
        limitLabel: draft.limitLabel || undefined,
      };

      setRewards((current) => [createdReward, ...current]);
      setSelectedRewardId(createdReward.id);
      showToast({
        body: "Reward created locally",
        title: "Reward created locally",
        tone: "success",
      });
    }

    setRewardDialog(null);
  }

  function handleConfirmClaim() {
    if (!claimReward || !isDemo) {
      return;
    }

    if (!canClaim(claimReward, currency.balance)) {
      showToast({
        body: "Not enough Life Credits",
        title: "Claim blocked",
        tone: "error",
      });
      setClaimReward(null);
      return;
    }

    setCurrency((current) => ({
      ...current,
      balance: current.balance - claimReward.cost,
      spentThisWeek: current.spentThisWeek + claimReward.cost,
    }));
    setRewards((current) =>
      current.map((reward) =>
        reward.id === claimReward.id
          ? {
              ...reward,
              lastClaimedAt: "2026-06-21",
              status: "claimed",
            }
          : reward,
      ),
    );
    setTransactions((current) => [
      {
        amount: claimReward.cost,
        createdAt: "2026-06-21",
        id: createLocalId("tx"),
        reason: claimReward.title,
        source: "reward",
        type: "spent",
      },
      ...current,
    ]);
    setClaimReward(null);
    showToast({
      body: `${claimReward.title} was claimed in local state only.`,
      title: "Reward claimed locally",
      tone: "success",
    });
  }

  function scrollToHistory() {
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <SystemPageShell
      accent={shopAccent}
      dataAttributes={sectionStateAttributes({
        capacity: 8,
        itemCount: rewards.length,
        profileId,
        section: "page",
      })}
      id="shop-page"
    >
      <SystemPageHeader
        eyebrow="Utility / Rewards"
        primaryAction={
          <button
            className={primaryButtonClass}
            disabled={!canUseRewardDrafts}
            onClick={() => setRewardDialog({ mode: "create" })}
            type="button"
          >
            Create reward
          </button>
        }
        secondaryActions={
          <>
            <button
              className={secondaryButtonClass}
              disabled={!isDemo || !selectedReward || !canClaim(selectedReward, currency.balance)}
              onClick={() => selectedReward && setClaimReward(selectedReward)}
              type="button"
            >
              Claim selected
            </button>
            <button className={secondaryButtonClass} onClick={scrollToHistory} type="button">
              View history
            </button>
          </>
        }
        summary="Spend Life Credits on intentional rewards"
        title="Shop"
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <RewardBalanceCard
          canCreate={canUseRewardDrafts}
          currency={currency}
          onCreate={() => setRewardDialog({ mode: "create" })}
          onViewHistory={scrollToHistory}
          profileId={profileId}
          rewards={rewards}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]">
        <SystemPanel
          badge={<Pill quiet>{filteredRewards.length} rewards</Pill>}
          dataAttributes={sectionStateAttributes({
            capacity: 8,
            itemCount: rewards.length,
            profileId,
            section: "reward-shop",
          })}
          subtitle="Filter intentional rewards by category, status, affordability and user-created items."
          title="Reward Shop"
        >
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label>
                <FieldLabel>Search rewards</FieldLabel>
                <input
                  className={inputClass}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Search rewards"
                  value={query}
                />
              </label>
              <label>
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClass}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as RewardStatus | "all")
                  }
                  value={statusFilter}
                >
                  <option value="all">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {optionLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {segmentOptions.map((option) => (
                <button
                  aria-pressed={segment === option.value}
                  className={cn(
                    chipButtonClass,
                    segment === option.value
                      ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text-primary)]"
                      : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] text-[var(--text-muted)]",
                  )}
                  key={option.value}
                  onClick={() => setSegment(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
              <button
                aria-pressed={affordableOnly}
                className={cn(
                  chipButtonClass,
                  affordableOnly
                    ? "border-[rgba(66,184,131,.36)] bg-[rgba(66,184,131,.12)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] text-[var(--text-muted)]",
                )}
                onClick={() => setAffordableOnly((current) => !current)}
                type="button"
              >
                Affordable
              </button>
              <button
                aria-pressed={customOnly}
                className={cn(
                  chipButtonClass,
                  customOnly
                    ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] text-[var(--text-muted)]",
                )}
                onClick={() => setCustomOnly((current) => !current)}
                type="button"
              >
                Created by user
              </button>
            </div>
            {filteredRewards.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredRewards.map((reward) => (
                  <RewardCard
                    balance={currency.balance}
                    key={reward.id}
                    onClaim={() => setClaimReward(reward)}
                    onEdit={() => setRewardDialog({ mode: "edit", reward })}
                    onSelect={() => setSelectedRewardId(reward.id)}
                    reward={reward}
                    selected={reward.id === selectedRewardId}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                actionLabel={canUseRewardDrafts ? "Create reward" : undefined}
                description={
                  rewards.length === 0
                    ? "Erstelle spaeter lokale Rewards, wenn du Life Credits bewusst verwenden willst."
                    : customOnly
                      ? "No custom rewards match the current filters."
                      : "No rewards match the current search or filters."
                }
                onAction={
                  canUseRewardDrafts
                    ? () => setRewardDialog({ mode: "create" })
                    : undefined
                }
                title={rewards.length === 0 ? "Noch keine Rewards" : "No matching rewards"}
              />
            )}
          </div>
        </SystemPanel>

        <div className="space-y-3">
          <SystemPanel
            badge={<Pill accent={shopAccent}>{recommendedRewards.length} suggestions</Pill>}
            dataAttributes={sectionStateAttributes({
              capacity: 3,
              itemCount: recommendedRewards.length,
              profileId,
              section: "recommended-rewards",
            })}
            subtitle={
              isDemo
                ? "Static recommendations from demo data. No AI or random rewards."
                : "Recommendations appear only after local rewards or rules exist."
            }
            title="Recommended Rewards"
          >
            {recommendedRewards.length > 0 ? (
              <div className="space-y-2">
                {recommendedRewards.map((reward) => (
                  <button
                    className="w-full rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3 text-left transition hover:border-[var(--border-default)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    key={reward.id}
                    onClick={() => setSelectedRewardId(reward.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--text-primary)]">
                        {reward.title}
                      </p>
                      <CurrencyPill amount={reward.cost} />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      {reward.description}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Empfehlungen erscheinen erst, wenn lokale Rewards oder Regeln existieren."
                title="Keine Empfehlungen"
              />
            )}
          </SystemPanel>

          <SystemPanel
            dataAttributes={sectionStateAttributes({
              capacity: 4,
              itemCount: viewModel.rules.length,
              profileId,
              section: "reward-rules",
            })}
            subtitle="Rules keep rewards deliberate and non-random."
            title="Reward Rules"
          >
            <ul className="space-y-2">
              {viewModel.rules.map((rule) => (
                <li
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] px-3 py-2 text-xs text-[var(--text-secondary)]"
                  key={rule}
                >
                  {rule}
                </li>
              ))}
            </ul>
          </SystemPanel>

          <SystemPanel
            dataAttributes={sectionStateAttributes({
              capacity: 4,
              itemCount: viewModel.earningSources.length,
              profileId,
              section: "earning-sources",
            })}
            subtitle="Prepared static sources only. No integration is connected."
            title="Earning Sources"
          >
            {viewModel.earningSources.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {viewModel.earningSources.map((source, index) => (
                  <Pill key={`shop-earning-source-${index}`} quiet>
                    {source}
                  </Pill>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Life Credits bleiben ein lokales UI-Signal. Keine Wallet, kein Konto, kein Kauf."
                title="Keine aktiven Quellen"
              />
            )}
          </SystemPanel>
        </div>
      </div>

      <SystemPanel
        badge={<Pill quiet>{transactions.length} entries</Pill>}
        dataAttributes={sectionStateAttributes({
          capacity: 4,
          itemCount: transactions.length,
          profileId,
          section: "reward-history",
        })}
        subtitle={
          isDemo
            ? "Recent demo transactions. This is not a finance or accounting surface."
            : "Reward history stays empty until local reward transactions exist."
        }
        title="Reward History"
      >
        <section ref={historyRef}>
          {transactions.length > 0 ? (
            <div className="grid gap-2">
              {transactions.map((transaction) => (
                <article
                  className="grid gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                  key={transaction.id}
                >
                  <StatusPill
                    accent={
                      transaction.type === "earned"
                        ? "var(--accent-green)"
                        : transaction.type === "spent"
                          ? shopAccent
                          : "var(--accent-cyan)"
                    }
                  >
                    {optionLabel(transaction.type)}
                  </StatusPill>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {transaction.reason}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {optionLabel(transaction.source)} · {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {transaction.type === "spent" ? "-" : "+"}
                    {transaction.amount} LC
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              description="Keine Fake-Zeilen, keine Wallet-Buchung und keine externe Historie."
              title="Noch keine Reward-Historie"
            />
          )}
        </section>
      </SystemPanel>

      <RewardDialog
        dialog={rewardDialog}
        key={
          rewardDialog
            ? `${rewardDialog.mode}-${rewardDialog.reward?.id ?? "new"}`
            : "reward-closed"
        }
        onClose={() => setRewardDialog(null)}
        onSave={handleSaveReward}
      />
      <ClaimDialog
        balance={currency.balance}
        onClose={() => setClaimReward(null)}
        onConfirm={handleConfirmClaim}
        reward={claimReward}
      />
      <Toast toast={toast} />
    </SystemPageShell>
  );
}
