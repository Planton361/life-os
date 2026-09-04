"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  contentStateDataAttributes,
  resolveContentStateMeta,
  type ContentStateMeta,
} from "@/features/content-state";
import { cn } from "@/lib/cn";
import type {
  BudgetFit,
  InventoryCategory,
  InventoryItem,
  InventoryPageViewModel,
  InventoryStatus,
  LifePriority,
} from "./types";
import { PreparedEmptyLifeSurface } from "./prepared-empty-life-surface";
import {
  DetailRow,
  DialogError,
  DialogFooter,
  DialogFrame,
  FieldLabel,
  FilterSelect,
  LifeEmptyState,
  LifePageShell,
  LifeSubpageHeader,
  Panel,
  SaveErrorState,
  SegmentButton,
  StatusPill,
  Toast,
  budgetFitLabels,
  compactText,
  formatDate,
  formatMoney,
  inputClass,
  inventoryCategoryLabels,
  inventoryStatusLabels,
  localId,
  primaryButtonClass,
  priorityLabels,
  priorityRank,
  quietButtonClass,
  secondaryButtonClass,
  type ToastState,
} from "./components/life-workbench-primitives";

type InventorySegment = "owned" | "wishlist" | "needs_replacement" | "planned" | "all";

type InventoryDraft = {
  title: string;
  category: InventoryCategory;
  status: InventoryStatus;
  owned: boolean;
  estimatedValue: string;
  targetPrice: string;
  priority: LifePriority;
  budgetFit: BudgetFit;
  note: string;
};

const categories: readonly InventoryCategory[] = [
  "tech",
  "desk",
  "clothing",
  "fitness",
  "home",
  "study",
  "software",
  "other",
];

const statuses: readonly InventoryStatus[] = [
  "owned",
  "needs_replacement",
  "wishlist",
  "planned_purchase",
  "not_needed",
  "archived",
];

const budgetFits: readonly BudgetFit[] = [
  "fits",
  "wait",
  "too_expensive",
  "unknown",
];

const priorities: readonly LifePriority[] = ["high", "medium", "low"];

const segments: readonly { value: InventorySegment; label: string }[] = [
  { value: "owned", label: "Owned" },
  { value: "wishlist", label: "Wishlist" },
  { value: "needs_replacement", label: "Needs replacement" },
  { value: "planned", label: "Planned" },
  { value: "all", label: "All" },
];

function numberFromDraft(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function createInventoryItem(draft: InventoryDraft): InventoryItem {
  const now = new Date().toISOString();

  return {
    id: localId("inventory"),
    title: draft.title.trim(),
    category: draft.category,
    status: draft.status,
    owned: draft.owned,
    estimatedValue: numberFromDraft(draft.estimatedValue),
    targetPrice: numberFromDraft(draft.targetPrice),
    priority: draft.priority,
    budgetFit: draft.budgetFit,
    note: draft.note.trim() || undefined,
    addedAt: now,
    updatedAt: now,
  };
}

function InventoryItemDialog({
  initialWishlist = false,
  onClose,
  onSave,
}: Readonly<{
  initialWishlist?: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
}>) {
  const [draft, setDraft] = useState<InventoryDraft>({
    title: "",
    category: "tech",
    status: initialWishlist ? "wishlist" : "owned",
    owned: !initialWishlist,
    estimatedValue: "",
    targetPrice: "",
    priority: "medium",
    budgetFit: "unknown",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof InventoryDraft>(
    key: K,
    value: InventoryDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError("Title is required.");
      return;
    }

    onSave(createInventoryItem(draft));
  }

  return (
    <DialogFrame
      description="Local inventory item only. No price API, payment data or financial advice."
      onClose={onClose}
      title={initialWishlist ? "Add wishlist item" : "Add item"}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <DialogError error={error} />
        <label>
          <FieldLabel>Title *</FieldLabel>
          <input
            autoFocus
            className={inputClass}
            onChange={(event) => update("title", event.target.value)}
            value={draft.title}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <FieldLabel>Category</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) =>
                update("category", event.target.value as InventoryCategory)
              }
              value={draft.category}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {inventoryCategoryLabels[category]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Status</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) =>
                update("status", event.target.value as InventoryStatus)
              }
              value={draft.status}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {inventoryStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-start gap-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
          <input
            checked={draft.owned}
            className="mt-1 size-4 accent-[var(--accent-orange)]"
            onChange={(event) => update("owned", event.target.checked)}
            type="checkbox"
          />
          <span>Owned</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <FieldLabel optional>Estimated value</FieldLabel>
            <input
              className={inputClass}
              inputMode="decimal"
              onChange={(event) => update("estimatedValue", event.target.value)}
              type="number"
              value={draft.estimatedValue}
            />
          </label>
          <label>
            <FieldLabel optional>Target price</FieldLabel>
            <input
              className={inputClass}
              inputMode="decimal"
              onChange={(event) => update("targetPrice", event.target.value)}
              type="number"
              value={draft.targetPrice}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <FieldLabel>Priority</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("priority", event.target.value as LifePriority)}
              value={draft.priority}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabels[priority]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Budget fit</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update("budgetFit", event.target.value as BudgetFit)}
              value={draft.budgetFit}
            >
              {budgetFits.map((fit) => (
                <option key={fit} value={fit}>
                  {budgetFitLabels[fit]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <FieldLabel optional>Note</FieldLabel>
          <textarea
            className={cn(inputClass, "min-h-24 resize-y py-3 leading-5")}
            onChange={(event) => update("note", event.target.value)}
            value={draft.note}
          />
        </label>
        <DialogFooter onCancel={onClose} submitLabel="Save item locally" />
      </form>
    </DialogFrame>
  );
}

function BudgetReviewDialog({
  items,
  onClose,
}: Readonly<{
  items: InventoryItem[];
  onClose: () => void;
}>) {
  return (
    <DialogFrame
      description="Manual planning labels only. This is not financial advice."
      onClose={onClose}
      title="Budget fit summary"
    >
      <BudgetFitSummary items={items} />
      <div className="mt-4 flex justify-end border-t border-[var(--border-subtle)] pt-4">
        <button className={primaryButtonClass} onClick={onClose} type="button">
          Close
        </button>
      </div>
    </DialogFrame>
  );
}

function InventoryInspector({
  item,
  onClose,
  onStatusChange,
  onToast,
}: Readonly<{
  item: InventoryItem;
  onClose: () => void;
  onStatusChange: (status: InventoryStatus, owned: boolean) => void;
  onToast: (toast: ToastState) => void;
}>) {
  return (
    <DialogFrame
      description="Personal item preview. No payment or price integration is connected."
      onClose={onClose}
      title={item.title}
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="orange">{inventoryCategoryLabels[item.category]}</StatusPill>
          <StatusPill tone="orange" quiet>
            {inventoryStatusLabels[item.status]}
          </StatusPill>
          <StatusPill tone="gray" quiet>
            {item.owned ? "Owned" : "Wishlist"}
          </StatusPill>
          <StatusPill tone={item.budgetFit === "too_expensive" ? "red" : "orange"} quiet>
            {budgetFitLabels[item.budgetFit]}
          </StatusPill>
        </div>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {item.note ?? "No note added yet."}
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="Estimated value" value={formatMoney(item.estimatedValue)} />
          <DetailRow label="Target price" value={formatMoney(item.targetPrice)} />
          <DetailRow label="Priority" value={priorityLabels[item.priority]} />
          <DetailRow label="Updated" value={formatDate(item.updatedAt)} />
        </dl>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
          <button
            className={secondaryButtonClass}
            onClick={() =>
              onToast({
                title: "Edit prepared",
                body: "Editing is represented as local UI state in this MVP.",
                tone: "info",
              })
            }
            type="button"
          >
            Edit
          </button>
          <button className={secondaryButtonClass} onClick={() => onStatusChange("owned", true)} type="button">
            Mark owned
          </button>
          <button className={secondaryButtonClass} onClick={() => onStatusChange("wishlist", false)} type="button">
            Move to wishlist
          </button>
          <button className={secondaryButtonClass} onClick={() => onStatusChange("not_needed", false)} type="button">
            Mark not needed
          </button>
          <button className={secondaryButtonClass} disabled type="button">
            Archive
          </button>
          <button className={primaryButtonClass} onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}

function matchesSegment(item: InventoryItem, segment: InventorySegment) {
  if (segment === "owned") {
    return item.owned || item.status === "owned";
  }

  if (segment === "wishlist") {
    return item.status === "wishlist";
  }

  if (segment === "needs_replacement") {
    return item.status === "needs_replacement";
  }

  if (segment === "planned") {
    return item.status === "planned_purchase";
  }

  return true;
}

function decisionHint(item: InventoryItem) {
  if (item.budgetFit === "fits") {
    return "Fits budget";
  }

  if (item.budgetFit === "wait") {
    return "Wait until next month";
  }

  if (item.budgetFit === "too_expensive") {
    return "Compare alternatives";
  }

  if (item.status === "needs_replacement") {
    return "Replace only if current item fails";
  }

  return "Clarify fit manually";
}

function stateAttrs(meta: ContentStateMeta, profileId: string) {
  return contentStateDataAttributes(meta, profileId);
}

function buildContentStates(
  viewModel: InventoryPageViewModel,
): NonNullable<InventoryPageViewModel["contentStates"]> {
  const wishlistItems = viewModel.items.filter((item) =>
    ["wishlist", "planned_purchase", "needs_replacement"].includes(item.status),
  );
  const ownedItems = viewModel.items.filter(
    (item) => item.owned || item.status === "owned",
  );

  return {
    page: resolveContentStateMeta({
      capacity: 4,
      itemCount: viewModel.items.length > 0 ? 4 : 0,
    }),
    inventoryWishlist: resolveContentStateMeta({
      capacity: 6,
      itemCount: viewModel.items.length,
    }),
    wishlistDecisions: resolveContentStateMeta({
      capacity: 5,
      itemCount: wishlistItems.length,
    }),
    ownedItems: resolveContentStateMeta({
      capacity: 5,
      itemCount: ownedItems.length,
    }),
    budgetSummary: resolveContentStateMeta({
      capacity: 4,
      itemCount: viewModel.items.length,
    }),
  };
}

function InventoryRow({
  item,
  onOpen,
}: Readonly<{
  item: InventoryItem;
  onOpen: (item: InventoryItem) => void;
}>) {
  return (
    <article className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="orange">{inventoryCategoryLabels[item.category]}</StatusPill>
            <StatusPill tone="orange" quiet>
              {inventoryStatusLabels[item.status]}
            </StatusPill>
            <StatusPill tone="gray" quiet>
              {item.owned ? "Owned" : "Wishlist"}
            </StatusPill>
            <StatusPill tone={item.budgetFit === "too_expensive" ? "red" : "orange"} quiet>
              {budgetFitLabels[item.budgetFit]}
            </StatusPill>
          </div>
          <h2 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
            {item.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {compactText(item.note ?? "No note added yet.")}
          </p>
        </div>
        <p className="shrink-0 text-[10px] text-[var(--text-muted)]">
          {formatMoney(item.targetPrice ?? item.estimatedValue)}
        </p>
      </div>
      <button className={quietButtonClass} onClick={() => onOpen(item)} type="button">
        Open item
      </button>
    </article>
  );
}

function BudgetFitSummary({
  items,
}: Readonly<{
  items: InventoryItem[];
}>) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {budgetFits.map((fit) => (
        <div
          className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3"
          key={fit}
        >
          <p className="text-2xl font-semibold text-[var(--text-primary)]">
            {items.filter((item) => item.budgetFit === fit).length}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {budgetFitLabels[fit]}
          </p>
        </div>
      ))}
    </div>
  );
}

function InventoryInteractivePage({
  viewModel,
}: Readonly<{
  viewModel: InventoryPageViewModel;
}>) {
  const [items, setItems] = useState(viewModel.items);
  const [segment, setSegment] = useState<InventorySegment>("wishlist");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<InventoryCategory | "all">("all");
  const [status, setStatus] = useState<InventoryStatus | "all">("all");
  const [budgetFit, setBudgetFit] = useState<BudgetFit | "all">("all");
  const [priority, setPriority] = useState<LifePriority | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wishlistDialog, setWishlistDialog] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const profileId = viewModel.profileId ?? "demo";
  const contentStates = viewModel.contentStates ?? buildContentStates(viewModel);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items
      .filter((item) => {
        const matchesQuery =
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.note?.toLowerCase().includes(query);
        const matchesCategory = category === "all" || item.category === category;
        const matchesStatus = status === "all" || item.status === status;
        const matchesBudget = budgetFit === "all" || item.budgetFit === budgetFit;
        const matchesPriority = priority === "all" || item.priority === priority;

        return (
          matchesSegment(item, segment) &&
          matchesQuery &&
          matchesCategory &&
          matchesStatus &&
          matchesBudget &&
          matchesPriority
        );
      })
      .sort(
        (left, right) =>
          priorityRank(left.priority) - priorityRank(right.priority) ||
          left.title.localeCompare(right.title),
      );
  }, [budgetFit, category, items, priority, search, segment, status]);

  const wishlistItems = items.filter((item) =>
    ["wishlist", "planned_purchase", "needs_replacement"].includes(item.status),
  );
  const ownedItems = items.filter((item) => item.owned || item.status === "owned");

  function openAddItem(wishlist = false) {
    setWishlistDialog(wishlist);
    setDialogOpen(true);
  }

  function saveItem(item: InventoryItem) {
    try {
      setItems((current) => [item, ...current]);
      setSaveError(null);
      setDialogOpen(false);
      setToast({
        title: "Inventory item added locally",
        body: "The item changed only in this browser session.",
        tone: "success",
      });
    } catch {
      setSaveError("The local mock save failed. No data was persisted.");
      setToast({
        title: "Save did not complete",
        body: "No data was sent or stored.",
        tone: "error",
      });
    }
  }

  function updateSelectedStatus(nextStatus: InventoryStatus, owned: boolean) {
    if (!selectedItem) {
      return;
    }

    const updated = {
      ...selectedItem,
      status: nextStatus,
      owned,
      updatedAt: new Date().toISOString(),
    };

    setItems((current) =>
      current.map((item) => (item.id === selectedItem.id ? updated : item)),
    );
    setSelectedItem(updated);
    setToast({
      title: `Item marked ${inventoryStatusLabels[nextStatus].toLowerCase()}`,
      body: "Status changed locally only.",
      tone: "success",
    });
  }

  return (
    <LifePageShell
      accent="var(--accent-orange)"
      id="life-inventory-page"
      profileId={profileId}
      sectionAttribute={{ "data-inventory-section": "page" }}
      stateMeta={contentStates.page}
    >
      <LifeSubpageHeader
        header={viewModel.header}
        primaryAction={
          <button className={primaryButtonClass} onClick={() => openAddItem(false)} type="button">
            Add item
          </button>
        }
        secondaryActions={
          <>
            <button className={secondaryButtonClass} onClick={() => openAddItem(true)} type="button">
              Add wishlist item
            </button>
            <button
              className={secondaryButtonClass}
              disabled={items.length === 0}
              onClick={() => setBudgetDialogOpen(true)}
              type="button"
            >
              Review budget
            </button>
          </>
        }
      />

      <SaveErrorState message={saveError} />

      <Panel
        action={<StatusPill tone="orange" quiet>{filteredItems.length} shown</StatusPill>}
        className="border-[color-mix(in_srgb,var(--accent-orange)_24%,var(--border-subtle))]"
        sectionAttribute={{ "data-inventory-section": "inventory-wishlist" }}
        stateAttributes={stateAttrs(contentStates.inventoryWishlist, profileId)}
        subtitle="Owned items, replacement needs and wishlist planning without shopping or finance integrations."
        title="Inventory & Wishlist"
      >
        <div className="flex flex-wrap gap-2">
          {segments.map((item, index) => (
            <SegmentButton
              active={segment === item.value}
              key={`inventory-segment-${index}`}
              onSelect={setSegment}
              value={item.value}
            >
              {item.label}
            </SegmentButton>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px_150px]">
          <label>
            <FieldLabel>Search inventory</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search inventory"
              type="search"
              value={search}
            />
          </label>
          <FilterSelect
            label="Category"
            onChange={setCategory}
            options={[
              { value: "all", label: "All" },
              ...categories.map((item) => ({ value: item, label: inventoryCategoryLabels[item] })),
            ]}
            value={category}
          />
          <FilterSelect
            label="Status"
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              ...statuses.map((item) => ({ value: item, label: inventoryStatusLabels[item] })),
            ]}
            value={status}
          />
          <FilterSelect
            label="Budget fit"
            onChange={setBudgetFit}
            options={[
              { value: "all", label: "All" },
              ...budgetFits.map((item) => ({ value: item, label: budgetFitLabels[item] })),
            ]}
            value={budgetFit}
          />
          <FilterSelect
            label="Priority"
            onChange={setPriority}
            options={[
              { value: "all", label: "All" },
              ...priorities.map((item) => ({ value: item, label: priorityLabels[item] })),
            ]}
            value={priority}
          />
        </div>

        <div className="mt-4 grid gap-3">
          {items.length === 0 ? (
            <LifeEmptyState
              description="Besitz, Wunschliste und Ersatzbedarf erscheinen hier, sobald lokale Einträge existieren."
              title="Noch keine Inventareinträge"
            />
          ) : filteredItems.length === 0 ? (
            <LifeEmptyState
              description="No item matches the current segment, search or filters."
              title="No search results"
            />
          ) : (
            filteredItems.map((item) => (
              <InventoryRow item={item} key={item.id} onOpen={setSelectedItem} />
            ))
          )}
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          sectionAttribute={{ "data-inventory-section": "wishlist-decisions" }}
          stateAttributes={stateAttrs(contentStates.wishlistDecisions, profileId)}
          subtitle="Manual decision hints, not financial advice."
          title="Wishlist Decisions"
        >
          <div className="grid gap-3">
            {wishlistItems.length === 0 ? (
              <LifeEmptyState
                description="Wishlist-Entscheidungen erscheinen erst aus lokalen Einträgen."
                title="Keine Wishlist-Entscheidungen"
              />
            ) : (
              wishlistItems.slice(0, 5).map((item) => (
                <article
                  className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.30)] p-3"
                  key={item.id}
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="orange">{budgetFitLabels[item.budgetFit]}</StatusPill>
                    <StatusPill tone="gray" quiet>
                      {priorityLabels[item.priority]}
                    </StatusPill>
                  </div>
                  <h2 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {decisionHint(item)} / Target: {formatMoney(item.targetPrice)}
                  </p>
                </article>
              ))
            )}
          </div>
        </Panel>

        <Panel
          sectionAttribute={{ "data-inventory-section": "owned-items" }}
          stateAttributes={stateAttrs(contentStates.ownedItems, profileId)}
          subtitle="Compact owned list, no wide table."
          title="Owned Items"
        >
          <div className="grid gap-3">
            {ownedItems.length === 0 ? (
              <LifeEmptyState
                description="Besitz-Einträge erscheinen hier, sobald lokale Daten existieren."
                title="Keine Besitz-Einträge"
              />
            ) : (
              ownedItems.slice(0, 5).map((item) => (
                <InventoryRow item={item} key={item.id} onOpen={setSelectedItem} />
              ))
            )}
          </div>
        </Panel>
      </div>

      <Panel
        sectionAttribute={{ "data-inventory-section": "budget-summary" }}
        stateAttributes={stateAttrs(contentStates.budgetSummary, profileId)}
        subtitle="Text-led planning signal only."
        title="Budget Fit Summary"
      >
        {items.length === 0 ? (
          <p className="mb-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
            Budget Fit ist nur ein manuelles Planungssignal.
          </p>
        ) : null}
        <BudgetFitSummary items={items} />
      </Panel>

      {dialogOpen ? (
        <InventoryItemDialog
          initialWishlist={wishlistDialog}
          onClose={() => setDialogOpen(false)}
          onSave={saveItem}
        />
      ) : null}

      {budgetDialogOpen ? (
        <BudgetReviewDialog
          items={items}
          onClose={() => setBudgetDialogOpen(false)}
        />
      ) : null}

      {selectedItem ? (
        <InventoryInspector
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onStatusChange={updateSelectedStatus}
          onToast={setToast}
        />
      ) : null}

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </LifePageShell>
  );
}

export function InventoryPage({
  viewModel,
}: Readonly<{
  viewModel: InventoryPageViewModel;
}>) {
  return viewModel.profileId === "empty" ? (
    <PreparedEmptyLifeSurface
      description="Keine Inventory- oder Wishlist-Items im Empty-Profil; lokale Kauf- oder Item-Entwürfe wären keine kanonischen Records."
      title="Inventory & Wishlist"
    />
  ) : (
    <InventoryInteractivePage viewModel={viewModel} />
  );
}
