"use client";

import Image from "next/image";
import Link from "next/link";
import "../nutrition-workspace.css";
import {
  contentStateDataAttributes,
  resolveContentStateMeta,
} from "@/features/content-state";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import {
  inputClass,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "../meal-planner/meal-planner-primitives";
import type { GroceryViewModel } from "./grocery-view-model";
import type { GroceryDraftProjection } from "./grocery-generation";
import type {
  GroceryCategory,
  GroceryListItem,
  GroceryUnit,
  IngredientConfidence,
  MustHaveItem,
  PantryItem,
  ReceiptLineItem,
  ReceiptUpload,
} from "./grocery-types";
import {
  addPantryQuantity,
  aggregateWeeklyIngredientDemand,
  applyReceiptItemsToPantry,
  confidenceLabels,
  copyShoppingItemNames,
  createGroceryListFromDemand,
  createMustHaveDemand,
  createStubReceiptLines,
  formatGroceryQuantity,
  groceryCategoryLabels,
  groceryCategoryOptions,
  groceryCategoryOrder,
  groceryUnitOptions,
  groceryVisualFor,
  ingredientReferenceFor,
  matchDemandWithPantry,
  mergeShoppingDemand,
  summarizeGrocery,
  updatePantryQuantity,
} from "./grocery-utils";

type GroceryListStatusMap = Record<string, GroceryListItem["status"]>;
type ShoppingFilter = "all" | "food" | "household" | "hygiene" | "missing" | "must_have";

const foodCategories: readonly GroceryCategory[] = [
  "produce",
  "dairy",
  "meat_fish",
  "grains",
  "pantry",
  "frozen",
  "spices",
  "drinks",
];

function FieldLabel({
  children,
  optional = false,
}: Readonly<{
  children: string;
  optional?: boolean;
}>) {
  return (
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
      {children}
      {optional ? (
        <span className="ml-1 normal-case tracking-normal text-[var(--text-faint)]">
          optional
        </span>
      ) : null}
    </span>
  );
}

function WorkbenchPanel({
  title,
  subtitle,
  badge,
  children,
  className,
  bodyClassName,
  stateAttributes,
}: Readonly<{
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  stateAttributes?: Record<string, string>;
}>) {
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
      {...stateAttributes}
    >
      <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className="truncate text-[17px] font-semibold leading-6 text-[var(--text-primary)]"
              id={headingId}
            >
              {title}
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
              {subtitle}
            </p>
          </div>
          {badge ? (
            <span className="inline-flex min-h-7 shrink-0 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] px-2.5 text-[10px] font-semibold text-[var(--text-muted)]">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
      <div className={cn("min-h-0 min-w-0 flex-1 p-4", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

function StatusBadge({
  label,
  accent,
  dense = false,
}: Readonly<{
  label: string;
  accent: string;
  dense?: boolean;
}>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] font-semibold text-[var(--text-secondary)]",
        dense ? "min-h-6 px-2 text-[9px]" : "min-h-7 px-2.5 text-[10px]",
      )}
      style={{ "--accent": accent } as CSSProperties}
    >
      {label}
    </span>
  );
}

function GroceryThumb({
  name,
  imageUrl,
  imageAlt,
}: Readonly<{
  name: string;
  imageUrl?: string;
  imageAlt?: string;
}>) {
  const visual = imageUrl
    ? { imageUrl, imageAlt: imageAlt ?? `${name} grocery placeholder` }
    : groceryVisualFor(name.toLowerCase());

  return (
    <div className="size-14 shrink-0 overflow-hidden rounded-[12px] border border-[rgba(148,163,184,.16)] bg-[rgba(18,28,43,.72)]">
      <Image
        alt={visual.imageAlt}
        className="block h-full w-full object-cover opacity-90"
        height={56}
        src={visual.imageUrl}
        unoptimized
        width={56}
      />
    </div>
  );
}

function categoryGroup<T extends { category: GroceryCategory; name: string }>(
  items: readonly T[],
) {
  return groceryCategoryOrder
    .map((category) => ({
      category,
      items: items
        .filter((item) => item.category === category)
        .sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .filter((group) => group.items.length > 0);
}

function sourceLabel(item: GroceryListItem) {
  const mealPlan = item.sourceTypes.includes("meal_plan");
  const mustHave = item.sourceTypes.includes("must_have");

  if (mealPlan && mustHave) {
    return "Meal plan + Must-have";
  }

  return mealPlan ? "Meal plan" : "Must-have";
}

function itemStatusLabel(item: GroceryListItem) {
  if (item.status === "checked") {
    return "Bought";
  }

  if (item.status === "ignored") {
    return "Ignored";
  }

  if (item.demandStatus === "partial") {
    return "Partial";
  }

  return item.sourceTypes.includes("must_have") ? "Low stock" : "Missing";
}

function statusAccent(item: GroceryListItem) {
  if (item.status === "checked") {
    return "var(--accent-green)";
  }

  if (item.status === "ignored") {
    return "var(--text-faint)";
  }

  if (item.demandStatus === "partial") {
    return "var(--accent-yellow)";
  }

  return "var(--accent-red)";
}

function sourcePillClass(source: GroceryListItem["sourceTypes"][number]) {
  return source === "meal_plan"
    ? "border-[rgba(217,146,79,.26)] bg-[rgba(217,146,79,.08)]"
    : "border-[rgba(95,200,215,.24)] bg-[rgba(95,200,215,.07)]";
}

function filterShoppingItems(
  items: readonly GroceryListItem[],
  filter: ShoppingFilter,
) {
  const activeItems = items.filter((item) => item.status === "to_buy");

  if (filter === "food") {
    return activeItems.filter((item) => foodCategories.includes(item.category));
  }

  if (filter === "household") {
    return activeItems.filter((item) => item.category === "household");
  }

  if (filter === "hygiene") {
    return activeItems.filter((item) => item.category === "hygiene");
  }

  if (filter === "missing") {
    return activeItems.filter((item) => item.demandStatus === "missing");
  }

  if (filter === "must_have") {
    return activeItems.filter((item) => item.sourceTypes.includes("must_have"));
  }

  return activeItems;
}

function SummaryStrip({
  summary,
  stateAttributes,
}: Readonly<{
  summary: GroceryViewModel["summary"];
  stateAttributes?: Record<string, string>;
}>) {
  const tiles = [
    {
      label: "To buy",
      value: `${summary.toBuyItems}`,
      detail: "active items",
      accent: "var(--accent-red)",
    },
    {
      label: "From meal plan",
      value: `${summary.fromMealPlan}`,
      detail: "recipe demand",
      accent: "var(--accent-orange)",
    },
    {
      label: "From must-list",
      value: `${summary.fromMustList}`,
      detail: "always stock",
      accent: "var(--accent-cyan)",
    },
    {
      label: "In stock",
      value: `${summary.inStockItems}`,
      detail: "pantry estimates",
      accent: "var(--accent-green)",
    },
    {
      label: "Receipts pending",
      value: `${summary.receiptsPendingReview}`,
      detail: "review queue",
      accent: "var(--accent-yellow)",
    },
  ];

  return (
    <section
      aria-label="Grocery summary"
      className="grid shrink-0 gap-2 rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3 sm:grid-cols-2 xl:grid-cols-5"
      {...stateAttributes}
    >
      {tiles.map((tile, index) => (
        <article
          className="flex min-h-12 items-center justify-between gap-3 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border-subtle))] bg-[rgba(168,183,204,.04)] px-3 py-2"
          key={`grocery-summary-tile-${index}`}
          style={{ "--accent": tile.accent } as CSSProperties}
        >
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              {tile.label}
            </p>
            <p className="truncate text-[10px] text-[var(--text-muted)]">
              {tile.detail}
            </p>
          </div>
          <p className="shrink-0 text-lg font-semibold text-[var(--text-primary)]">
            {tile.value}
          </p>
        </article>
      ))}
    </section>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: Readonly<{
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}>) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-full border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
        active
          ? "border-[rgba(217,146,79,.42)] bg-[rgba(217,146,79,.13)] text-[var(--text-primary)]"
          : "border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ToBuyPanel({
  items,
  filter,
  mustHaveItems,
  mustListOpen,
  actionsEnabled,
  stateAttributes,
  onFilterChange,
  onAddToPantry,
  onListStatusChange,
  onMustListOpenChange,
  onToggleMustHave,
  onAddMustHave,
}: Readonly<{
  items: readonly GroceryListItem[];
  filter: ShoppingFilter;
  mustHaveItems: readonly MustHaveItem[];
  mustListOpen: boolean;
  actionsEnabled: boolean;
  stateAttributes?: Record<string, string>;
  onFilterChange: (filter: ShoppingFilter) => void;
  onAddToPantry: (item: GroceryListItem) => void;
  onListStatusChange: (itemId: string, status: GroceryListItem["status"]) => void;
  onMustListOpenChange: (open: boolean) => void;
  onToggleMustHave: (itemId: string) => void;
  onAddMustHave: (item: MustHaveItem) => void;
}>) {
  const visibleItems = filterShoppingItems(items, filter);

  return (
    <WorkbenchPanel
      badge={`${visibleItems.length} active`}
      bodyClassName="flex flex-col gap-3 p-3"
      className="xl:h-full"
      stateAttributes={stateAttributes}
      subtitle="Meal-plan gaps and always-stock items that still need action."
      title="Muss noch geholt werden"
    >
      <div className="flex shrink-0 flex-wrap gap-2">
        {[
          ["all", "All"],
          ["food", "Food"],
          ["household", "Household"],
          ["hygiene", "Hygiene"],
          ["missing", "Missing"],
          ["must_have", "Must-have"],
        ].map(([value, label]) => (
          <FilterButton
            active={filter === value}
            key={value}
            onClick={() => onFilterChange(value as ShoppingFilter)}
          >
            {label}
          </FilterButton>
        ))}
      </div>

      <div
        aria-label="Active shopping list"
        className="min-h-[280px] flex-1 overflow-y-auto pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        tabIndex={0}
      >
        {visibleItems.length > 0 ? (
          <div className="grid gap-3">
            {categoryGroup(visibleItems).map((group) => (
              <section
                aria-labelledby={`shopping-${group.category}`}
                className="grid gap-2"
                key={group.category}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]"
                    id={`shopping-${group.category}`}
                  >
                    {groceryCategoryLabels[group.category]}
                  </h3>
                  <span className="text-[10px] font-semibold text-[var(--text-faint)]">
                    {group.items.length} items
                  </span>
                </div>

                <div className="grid gap-2">
                  {group.items.map((item) => (
                    <article
                      className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(14,23,38,.66)] p-3"
                      key={item.id}
                    >
                      <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-start">
                        <GroceryThumb
                          imageAlt={item.imageAlt}
                          imageUrl={item.imageUrl}
                          name={item.name}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-[14px] font-semibold text-[var(--text-primary)]">
                              {item.name}
                            </h4>
                            <StatusBadge
                              accent={statusAccent(item)}
                              dense
                              label={itemStatusLabel(item)}
                            />
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">
                            {groceryCategoryLabels[item.category]} -{" "}
                            {sourceLabel(item)}
                          </p>
                          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                            Buy {formatGroceryQuantity(item.quantityToBuy, item.unit)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.sourceTypes.map((source) => (
                              <span
                                className={cn(
                                  "inline-flex min-h-6 items-center rounded-full border px-2 text-[9px] font-semibold text-[var(--text-muted)]",
                                  sourcePillClass(source),
                                )}
                                key={`${item.id}-${source}`}
                              >
                                {source === "meal_plan" ? "Meal plan" : "Must-have"}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button
                            className={secondaryButtonClass}
                            disabled={!actionsEnabled}
                            onClick={() => onListStatusChange(item.id, "checked")}
                            type="button"
                          >
                            Mark bought
                          </button>
                          <button
                            className={secondaryButtonClass}
                            disabled={!actionsEnabled}
                            onClick={() => onAddToPantry(item)}
                            type="button"
                          >
                            Add to pantry
                          </button>
                          <button
                            className={quietButtonClass}
                            disabled={!actionsEnabled}
                            onClick={() => onListStatusChange(item.id, "ignored")}
                            type="button"
                          >
                            Ignore this week
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] p-4">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
              Keine Einkaufspunkte offen
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
              Einkaufsbedarf erscheint, sobald Mahlzeiten, Must-have-Items oder
              Pantry-Daten vorhanden sind.
            </p>
          </div>
        )}
      </div>

      <MustHaveManager
        items={mustHaveItems}
        actionsEnabled={actionsEnabled}
        onAddItem={onAddMustHave}
        onOpenChange={onMustListOpenChange}
        onToggleItem={onToggleMustHave}
        open={mustListOpen}
      />
    </WorkbenchPanel>
  );
}

function MustHaveManager({
  items,
  actionsEnabled,
  open,
  onOpenChange,
  onToggleItem,
  onAddItem,
}: Readonly<{
  items: readonly MustHaveItem[];
  actionsEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleItem: (itemId: string) => void;
  onAddItem: (item: MustHaveItem) => void;
}>) {
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState<GroceryCategory>("pantry");
  const [draftQuantity, setDraftQuantity] = useState("");
  const [draftUnit, setDraftUnit] = useState<GroceryUnit>("piece");
  const [draftPriority, setDraftPriority] =
    useState<MustHaveItem["priority"]>("normal");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftName.trim()) {
      return;
    }

    const reference = ingredientReferenceFor(draftName, draftUnit);
    const desiredQuantity = Number(draftQuantity);
    const visual = groceryVisualFor(reference.canonicalName);

    onAddItem({
      id: `must-${reference.canonicalName.replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      ingredientId: reference.id,
      name: reference.name,
      canonicalName: reference.canonicalName,
      category: draftCategory,
      desiredQuantity:
        Number.isFinite(desiredQuantity) && desiredQuantity > 0
          ? desiredQuantity
          : undefined,
      unit: draftUnit,
      priority: draftPriority,
      enabled: true,
      imageUrl: visual.imageUrl,
      imageAlt: visual.imageAlt,
    });
    setDraftName("");
    setDraftQuantity("");
    setDraftCategory("pantry");
    setDraftUnit("piece");
    setDraftPriority("normal");
  }

  return (
    <section className="shrink-0 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            Must-have List
          </h3>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            Always-stock items can enter the shopping list without recipe demand.
          </p>
        </div>
        <button
          className={secondaryButtonClass}
          disabled={!actionsEnabled}
          onClick={() => onOpenChange(!open)}
          type="button"
        >
          {open ? "Hide must-list" : "Manage must-list"}
        </button>
      </div>

      {open ? (
        <div className="mt-3 grid gap-3">
          <div className="grid max-h-44 gap-2 overflow-y-auto pr-1">
            {items.map((item) => (
              <label
                className="flex min-h-11 items-center gap-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.50)] px-3 py-2"
                key={item.id}
              >
                <input
                  checked={item.enabled}
                  className="size-4 accent-[var(--accent-orange)]"
                  disabled={!actionsEnabled}
                  onChange={() => onToggleItem(item.id)}
                  type="checkbox"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-[var(--text-secondary)]">
                    {item.name}
                  </span>
                  <span className="block truncate text-[10px] text-[var(--text-muted)]">
                    {groceryCategoryLabels[item.category]} - {item.priority}
                    {item.desiredQuantity && item.unit
                      ? ` - target ${formatGroceryQuantity(
                          item.desiredQuantity,
                          item.unit,
                        )}`
                      : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <form
            className="grid gap-2 rounded-[12px] border border-[rgba(95,200,215,.20)] bg-[rgba(95,200,215,.045)] p-3"
            onSubmit={submit}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <label>
                <FieldLabel>Name</FieldLabel>
                <input
                  className={inputClass}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Dish soap"
                  value={draftName}
                />
              </label>
              <label>
                <FieldLabel>Category</FieldLabel>
                <select
                  className={inputClass}
                  onChange={(event) =>
                    setDraftCategory(event.target.value as GroceryCategory)
                  }
                  value={draftCategory}
                >
                  {groceryCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {groceryCategoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel optional>Desired quantity</FieldLabel>
                <input
                  className={inputClass}
                  min="0"
                  onChange={(event) => setDraftQuantity(event.target.value)}
                  type="number"
                  value={draftQuantity}
                />
              </label>
              <label>
                <FieldLabel>Unit</FieldLabel>
                <select
                  className={inputClass}
                  onChange={(event) => setDraftUnit(event.target.value as GroceryUnit)}
                  value={draftUnit}
                >
                  {groceryUnitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Priority</FieldLabel>
                <select
                  className={inputClass}
                  onChange={(event) =>
                    setDraftPriority(event.target.value as MustHaveItem["priority"])
                  }
                  value={draftPriority}
                >
                  <option value="low">low</option>
                  <option value="normal">normal</option>
                  <option value="high">high</option>
                </select>
              </label>
            </div>
            <button
              className={primaryButtonClass}
              disabled={!actionsEnabled}
              type="submit"
            >
              Add must-have item
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function InStockPanel({
  pantryItems,
  addFormOpen,
  receiptUploads,
  actionsEnabled,
  stateAttributes,
  onAddFormOpenChange,
  onAddItem,
  onQuantityChange,
  onRemoveItem,
  onUseItem,
  onUpload,
  onReview,
}: Readonly<{
  pantryItems: readonly PantryItem[];
  addFormOpen: boolean;
  receiptUploads: readonly ReceiptUpload[];
  actionsEnabled: boolean;
  stateAttributes?: Record<string, string>;
  onAddFormOpenChange: (open: boolean) => void;
  onAddItem: (
    name: string,
    quantity: number,
    unit: GroceryUnit,
    confidence: IngredientConfidence,
  ) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemoveItem: (item: PantryItem) => void;
  onUseItem: (item: PantryItem) => void;
  onUpload: (file: File) => void;
  onReview: (upload: ReceiptUpload) => void;
}>) {
  const [query, setQuery] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftQuantity, setDraftQuantity] = useState("0");
  const [draftUnit, setDraftUnit] = useState<GroceryUnit>("g");
  const [draftConfidence, setDraftConfidence] = useState<IngredientConfidence>("medium");
  const visibleItems = pantryItems.filter((item) =>
    `${item.name} ${groceryCategoryLabels[item.category]} ${item.source}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftName.trim()) {
      return;
    }

    onAddItem(
      draftName,
      Math.max(0, Number(draftQuantity) || 0),
      draftUnit,
      draftConfidence,
    );
    setDraftName("");
    setDraftQuantity("0");
    onAddFormOpenChange(false);
  }

  return (
    <WorkbenchPanel
      badge={`${pantryItems.length} estimates`}
      bodyClassName="flex flex-col gap-3 p-3"
      className="xl:h-full"
      stateAttributes={stateAttributes}
      subtitle="Estimated pantry, household and receipt-reviewed stock."
      title="Ist vorhanden"
    >
      <label className="block shrink-0">
        <FieldLabel>Search in stock</FieldLabel>
        <input
          className={inputClass}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by item, category or source"
          type="search"
          value={query}
        />
      </label>

      {addFormOpen ? (
        <form
          className="grid shrink-0 gap-2 rounded-[14px] border border-[rgba(217,146,79,.28)] bg-[rgba(217,146,79,.06)] p-3"
          onSubmit={submit}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <label>
              <FieldLabel>Item name</FieldLabel>
              <input
                className={inputClass}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Potatoes"
                type="text"
                value={draftName}
              />
            </label>
            <label>
              <FieldLabel>Quantity</FieldLabel>
              <input
                className={inputClass}
                min="0"
                onChange={(event) => setDraftQuantity(event.target.value)}
                type="number"
                value={draftQuantity}
              />
            </label>
            <label>
              <FieldLabel>Unit</FieldLabel>
              <select
                className={inputClass}
                onChange={(event) => setDraftUnit(event.target.value as GroceryUnit)}
                value={draftUnit}
              >
                {groceryUnitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Confidence</FieldLabel>
              <select
                className={inputClass}
                onChange={(event) =>
                  setDraftConfidence(event.target.value as IngredientConfidence)
                }
                value={draftConfidence}
              >
                {(Object.keys(confidenceLabels) as IngredientConfidence[]).map(
                  (confidence) => (
                    <option key={confidence} value={confidence}>
                      {confidenceLabels[confidence]}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={primaryButtonClass}
              disabled={!actionsEnabled}
              type="submit"
            >
              Add item
            </button>
            <button
              className={quietButtonClass}
              onClick={() => onAddFormOpenChange(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div
        aria-label="In stock pantry estimate"
        className="min-h-[280px] flex-1 overflow-y-auto pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        tabIndex={0}
      >
        {visibleItems.length > 0 ? (
          <div className="grid gap-3">
            {categoryGroup(visibleItems).map((group) => (
            <section
              aria-labelledby={`stock-${group.category}`}
              className="grid gap-2"
              key={group.category}
            >
              <div className="flex items-center justify-between gap-3">
                <h3
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]"
                  id={`stock-${group.category}`}
                >
                  {groceryCategoryLabels[group.category]}
                </h3>
                <span className="text-[10px] font-semibold text-[var(--text-faint)]">
                  {group.items.length} items
                </span>
              </div>

              <div className="grid gap-2">
                {group.items.map((item) => (
                  <article
                    className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] p-3"
                    key={item.id}
                  >
                    <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
                      <GroceryThumb
                        imageAlt={item.imageAlt}
                        imageUrl={item.imageUrl}
                        name={item.name}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                              {item.name}
                            </h4>
                            <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                              {groceryCategoryLabels[item.category]} - {item.source} -
                              updated {item.updatedAt}
                            </p>
                          </div>
                          <StatusBadge
                            accent={
                              item.confidence === "high"
                                ? "var(--accent-green)"
                                : item.confidence === "medium"
                                  ? "var(--accent-yellow)"
                                  : "var(--accent-red)"
                            }
                            dense
                            label={confidenceLabels[item.confidence]}
                          />
                        </div>
                        <label className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                            Quantity
                          </span>
                          <span className="sr-only">{item.name} quantity</span>
                          <input
                            className={cn(inputClass, "min-h-9 w-28 text-right")}
                            min="0"
                            onChange={(event) =>
                              onQuantityChange(
                                item.id,
                                Number(event.target.value) || 0,
                              )
                            }
                            type="number"
                            value={item.quantity}
                          />
                        </label>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                            {item.unit}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className={quietButtonClass}
                              disabled={!actionsEnabled || item.quantity <= 0}
                              onClick={() => onUseItem(item)}
                              type="button"
                            >
                              Use / deduct
                            </button>
                            <button
                              className={quietButtonClass}
                              disabled={!actionsEnabled}
                              onClick={() => onRemoveItem(item)}
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] p-4">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
              Noch keine Vorräte erfasst
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
              Vorräte erscheinen, sobald lokale Pantry-Daten vorhanden sind.
            </p>
          </div>
        )}
      </div>

      <ReceiptInbox
        actionsEnabled={actionsEnabled}
        onReview={onReview}
        onUpload={onUpload}
        receiptUploads={receiptUploads}
      />
    </WorkbenchPanel>
  );
}

function ReceiptInbox({
  receiptUploads,
  actionsEnabled,
  onUpload,
  onReview,
}: Readonly<{
  receiptUploads: readonly ReceiptUpload[];
  actionsEnabled: boolean;
  onUpload: (file: File) => void;
  onReview: (upload: ReceiptUpload) => void;
}>) {
  return (
    <section className="shrink-0 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            Receipt Inbox
          </h3>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            Receipt parsing stub - review required.
          </p>
        </div>
        <span className="inline-flex min-h-7 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] px-2.5 text-[10px] font-semibold text-[var(--text-muted)]">
          {receiptUploads.filter((upload) => upload.status === "pending_review").length}{" "}
          pending
        </span>
      </div>

      <label
        aria-disabled={!actionsEnabled}
        className={cn(
          "mt-3 block rounded-[12px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.04)] p-3",
          !actionsEnabled && "cursor-not-allowed opacity-60",
        )}
      >
        <FieldLabel>Upload receipt</FieldLabel>
        <input
          accept="image/*,.pdf"
          className="mt-2 block w-full text-[11px] text-[var(--text-secondary)] file:mr-3 file:min-h-9 file:rounded-[10px] file:border file:border-[var(--border-subtle)] file:bg-[rgba(18,28,43,.82)] file:px-3 file:text-[10px] file:font-semibold file:text-[var(--text-secondary)]"
          disabled={!actionsEnabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];

            if (file) {
              onUpload(file);
              event.target.value = "";
            }
          }}
          type="file"
        />
      </label>

      <div className="mt-3 grid max-h-40 gap-2 overflow-y-auto pr-1">
        {receiptUploads.map((upload) => (
          <article
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.50)] p-3"
            key={upload.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-[var(--text-secondary)]">
                  {upload.fileName}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                  {upload.uploadedAt} - {upload.parserMode} parser
                </p>
              </div>
              <StatusBadge
                accent={
                  upload.status === "reviewed"
                    ? "var(--accent-green)"
                    : "var(--accent-orange)"
                }
                dense
                label={
                  upload.status === "pending_review"
                    ? "Pending review"
                    : upload.status === "reviewed"
                      ? "Reviewed"
                      : "Failed"
                }
              />
            </div>
            <button
              className={cn(secondaryButtonClass, "mt-3")}
              disabled={!actionsEnabled}
              onClick={() => onReview(upload)}
              type="button"
            >
              Review receipt
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReceiptReviewDialog({
  upload,
  items,
  onClose,
  onApply,
}: Readonly<{
  upload: ReceiptUpload;
  items: readonly ReceiptLineItem[];
  onClose: () => void;
  onApply: (items: readonly ReceiptLineItem[]) => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draftItems, setDraftItems] = useState<ReceiptLineItem[]>(() =>
    items.map((item) => ({ ...item })),
  );

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  function updateItem(
    itemId: string,
    updater: (item: ReceiptLineItem) => ReceiptLineItem,
  ) {
    setDraftItems((current) =>
      current.map((item) => (item.id === itemId ? updater(item) : item)),
    );
  }

  return (
    <dialog
      aria-labelledby="receipt-review-heading"
      className="max-h-[calc(100dvh-24px)] w-[min(940px,calc(100vw-24px))] overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-left text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.48)] backdrop:bg-[rgba(0,0,0,.58)]"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <form
        className="flex max-h-[calc(100dvh-24px)] flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          onApply(draftItems);
        }}
      >
        <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-yellow)]">
                Receipt parsing stub - review required
              </p>
              <h2
                className="mt-1 text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
                id="receipt-review-heading"
              >
                Review receipt
              </h2>
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                {upload.fileName} is processed locally with mock extraction only.
              </p>
            </div>
            <button
              aria-label="Close receipt review"
              className="size-8 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={onClose}
              type="button"
            >
              x
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-4">
          <div className="grid gap-3">
            {draftItems.map((item) => (
              <article
                className="grid gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.04)] p-3 lg:grid-cols-[1fr_1fr_110px_95px_130px_88px]"
                key={item.id}
              >
                <label>
                  <FieldLabel>Item name</FieldLabel>
                  <input
                    className={inputClass}
                    onChange={(event) =>
                      updateItem(item.id, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    value={item.name}
                  />
                </label>
                <label>
                  <FieldLabel>Raw label</FieldLabel>
                  <input className={inputClass} readOnly value={item.rawLabel} />
                </label>
                <label>
                  <FieldLabel>Quantity</FieldLabel>
                  <input
                    className={inputClass}
                    min="0"
                    onChange={(event) =>
                      updateItem(item.id, (current) => ({
                        ...current,
                        estimatedQuantity: Number(event.target.value) || 0,
                      }))
                    }
                    type="number"
                    value={item.estimatedQuantity}
                  />
                </label>
                <label>
                  <FieldLabel>Unit</FieldLabel>
                  <select
                    className={inputClass}
                    onChange={(event) =>
                      updateItem(item.id, (current) => ({
                        ...current,
                        unit: event.target.value as GroceryUnit,
                      }))
                    }
                    value={item.unit}
                  >
                    {groceryUnitOptions.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <FieldLabel>Category</FieldLabel>
                  <select
                    className={inputClass}
                    onChange={(event) =>
                      updateItem(item.id, (current) => ({
                        ...current,
                        category: event.target.value as GroceryCategory,
                      }))
                    }
                    value={item.category}
                  >
                    {groceryCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {groceryCategoryLabels[category]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-2 pt-5">
                  <input
                    checked={item.accepted}
                    className="size-4 accent-[var(--accent-orange)]"
                    onChange={(event) =>
                      updateItem(item.id, (current) => ({
                        ...current,
                        accepted: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    Accept
                  </span>
                </label>
              </article>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[rgba(11,17,28,.58)] px-4 py-3">
          <p className="max-w-md text-[10px] leading-4 text-[var(--text-faint)]">
            No OCR, no upload to a server, no external parsing. Accepted lines are
            added to local pantry state only.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={secondaryButtonClass} onClick={onClose} type="button">
              Cancel
            </button>
            <button className={primaryButtonClass} type="submit">
              Add accepted items to pantry
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

function formatDraftQuantity(quantity: number | null, unit: string | null) {
  if (quantity === null) return unit ? `Menge offen · ${unit}` : "Menge offen";
  const value = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 3 }).format(quantity);
  return unit ? `${value} ${unit}` : value;
}

function ManualGroceryDraftView({ viewModel }: { viewModel: GroceryViewModel }) {
  const draft: GroceryDraftProjection = viewModel.generatedDraft ?? {
    items: [],
    mealsConsidered: 0,
    unresolvedMeals: [],
  };
  const range = viewModel.range;
  const pageState = viewModel.contentStates?.page;

  return (
    <div
      className="nutrition-workspace-page"
      id="grocery-page"
      data-nutrition-surface="grocery"
      {...(pageState ? contentStateDataAttributes(pageState, viewModel.profileId ?? "manual") : {})}
    >
      <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Life OS / Ernährung / Einkauf</p>
            <h1 className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">Einkauf</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">Abgeleitet aus offenen Mahlzeiten und Rezeptzutaten.</p>
            <p className="mt-1 text-[11px] font-semibold text-[var(--text-muted)]">Woche {viewModel.header.weekLabel}</p>
          </div>
          <Link className={secondaryButtonClass} href="/nutrition/meal-planner">Essensplan öffnen</Link>
          {range ? (
            <nav aria-label="Einkaufswoche" className="flex flex-wrap gap-2">
              <Link className={secondaryButtonClass} href={`/nutrition/grocery?week=${range.previousStartDate}`}>Vorherige Woche</Link>
              <Link className={secondaryButtonClass} href="/nutrition/grocery">Aktuelle Woche</Link>
              <Link className={secondaryButtonClass} href={`/nutrition/grocery?week=${range.nextStartDate}`}>Nächste Woche</Link>
            </nav>
          ) : null}
        </div>
      </header>

      {viewModel.unavailableReason ? (
        <section className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4" role="alert">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Einkaufsentwurf nicht verfügbar</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{viewModel.unavailableReason}</p>
        </section>
      ) : (
        <div className="nutrition-grocery-grid">
          <section aria-labelledby="grocery-draft-heading" className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4" data-grocery-section="draft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="grocery-draft-heading" className="text-base font-semibold text-[var(--text-primary)]">Einkaufsentwurf</h2>
                <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">{draft.mealsConsidered} offene Mahlzeiten berücksichtigt</p>
              </div>
              <span className="rounded-full border border-[rgba(217,146,79,.28)] px-3 py-1 text-[10px] font-semibold text-[var(--accent-orange)]">Entwurf</span>
            </div>
            {draft.items.length > 0 ? (
              <ul aria-label="Einkaufspunkte" className="mt-4 grid gap-2">
                {draft.items.map((item) => (
                  <li className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.5)] px-3 py-3" data-grocery-item={item.name} key={item.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[13px] font-semibold text-[var(--text-primary)]">{item.name}</span>
                      <span className="text-[12px] font-semibold text-[var(--text-secondary)]">{formatDraftQuantity(item.quantity, item.unit)}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">{item.sourceMealIds.length} Mahlzeit{item.sourceMealIds.length === 1 ? "" : "en"}{item.note ? ` · ${item.note}` : ""}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-muted)]">Keine Einkaufspunkte offen.</p>
            )}
          </section>

          <section aria-labelledby="unresolved-grocery-heading" className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4" data-grocery-section="unresolved">
            <h2 id="unresolved-grocery-heading" className="text-base font-semibold text-[var(--text-primary)]">Ungeklärte Mahlzeiten</h2>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">Hier fehlen ein Rezept oder dessen Zutaten.</p>
            {draft.unresolvedMeals.length > 0 ? (
              <ul aria-label="Ungeklärte Mahlzeiten" className="mt-3 grid gap-2">
                {draft.unresolvedMeals.map((meal) => (
                  <li className="rounded-[12px] border border-[rgba(217,146,79,.22)] bg-[rgba(217,146,79,.04)] px-3 py-2" key={meal.id}>
                    <p className="text-[12px] font-semibold text-[var(--text-primary)]">{meal.title}</p>
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">{meal.date} · {({breakfast:"Frühstück",lunch:"Mittagessen",dinner:"Abendessen",snack:"Snack",other:"Sonstiges"})[meal.mealType]} · {meal.reason === "missing_recipe" ? "Rezept fehlt" : "Rezept ohne Zutaten"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-muted)]">Keine ungeklärten Mahlzeiten.</p>
            )}
            <Link className="mt-4 inline-block text-sm underline" href="/nutrition/recipes">Rezeptzutaten pflegen</Link>
          </section>
        </div>
      )}
    </div>
  );
}

function GroceryInteractiveWorkbenchView({
  viewModel,
}: Readonly<{
  viewModel: GroceryViewModel;
}>) {
  const profileId = viewModel.profileId ?? "demo";
  const actionsEnabled = viewModel.actionsEnabled ?? true;
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(() =>
    viewModel.pantryItems.map((item) => ({ ...item })),
  );
  const [mustHaveItems, setMustHaveItems] = useState<MustHaveItem[]>(() =>
    viewModel.mustHaveItems.map((item) => ({ ...item })),
  );
  const [receiptUploads, setReceiptUploads] = useState<ReceiptUpload[]>(() =>
    viewModel.receiptUploads.map((upload) => ({ ...upload })),
  );
  const [receiptItems, setReceiptItems] = useState<ReceiptLineItem[]>(() =>
    viewModel.receiptLineItems.map((item) => ({ ...item })),
  );
  const [listStatus, setListStatus] = useState<GroceryListStatusMap>({});
  const [shoppingFilter, setShoppingFilter] = useState<ShoppingFilter>("all");
  const [pantryFormOpen, setPantryFormOpen] = useState(false);
  const [mustListOpen, setMustListOpen] = useState(false);
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const demandItems = useMemo(() => {
    const mealPlanDemand = matchDemandWithPantry(
      aggregateWeeklyIngredientDemand(viewModel.week, viewModel.recipes),
      pantryItems,
    );
    const mustHaveDemand = createMustHaveDemand(mustHaveItems, pantryItems);

    return mergeShoppingDemand(mealPlanDemand, mustHaveDemand);
  }, [mustHaveItems, pantryItems, viewModel.recipes, viewModel.week]);
  const groceryItems = useMemo(
    () =>
      createGroceryListFromDemand(demandItems).map((item) => ({
        ...item,
        status: listStatus[item.id] ?? item.status,
      })),
    [demandItems, listStatus],
  );
  const visibleShoppingItems = useMemo(
    () => filterShoppingItems(groceryItems, shoppingFilter),
    [groceryItems, shoppingFilter],
  );
  const summary = useMemo(
    () =>
      summarizeGrocery(
        groceryItems,
        pantryItems,
        receiptUploads.filter((upload) => upload.status === "pending_review").length,
      ),
    [groceryItems, pantryItems, receiptUploads],
  );
  const activeReceipt =
    receiptUploads.find((upload) => upload.id === activeReceiptId) ?? null;
  const activeReceiptItems = activeReceipt
    ? receiptItems.filter((item) => item.receiptUploadId === activeReceipt.id)
    : [];
  const contentStates =
    viewModel.contentStates ??
    {
      mustHave: resolveContentStateMeta({
        capacity: 6,
        itemCount: mustHaveItems.length,
      }),
      page: resolveContentStateMeta({
        capacity: 12,
        itemCount: groceryItems.length + pantryItems.length + receiptUploads.length,
      }),
      pantry: resolveContentStateMeta({
        capacity: 8,
        itemCount: pantryItems.length,
      }),
      receipts: resolveContentStateMeta({
        capacity: 4,
        itemCount: receiptUploads.length,
      }),
      summary: resolveContentStateMeta({
        capacity: 5,
        itemCount:
          summary.toBuyItems +
          summary.fromMealPlan +
          summary.fromMustList +
          summary.inStockItems +
          summary.receiptsPendingReview,
      }),
      toBuy: resolveContentStateMeta({
        capacity: 8,
        itemCount: groceryItems.filter((item) => item.status === "to_buy").length,
      }),
    };
  const stateAttrs = (meta: (typeof contentStates)[keyof typeof contentStates]) =>
    contentStateDataAttributes(meta, profileId);

  function addItemToPantry(item: GroceryListItem) {
    setPantryItems((current) =>
      addPantryQuantity(
        current,
        item.name,
        item.quantityToBuy,
        item.unit,
        "grocery_checkoff",
        "medium",
      ),
    );
    setListStatus((current) => ({ ...current, [item.id]: "checked" }));
    setToast(`${item.name} added to pantry estimate`);
  }

  async function copyShoppingText() {
    const text = copyShoppingItemNames(visibleShoppingItems);

    if (!text) {
      setToast("Could not copy shopping list");
      return;
    }

    function copyWithTextArea() {
      const textarea = document.createElement("textarea");

      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.append(textarea);
      textarea.select();

      const copied = document.execCommand("copy");

      textarea.remove();

      return copied;
    }

    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          setToast("Shopping list copied");
          return;
        } catch {
          // Fall through to the local textarea fallback below.
        }
      }

      if (!copyWithTextArea()) {
        throw new Error("Clipboard fallback failed");
      }

      setToast("Shopping list copied");
    } catch {
      setToast("Could not copy shopping list");
    }
  }

  function uploadReceipt(file: File) {
    const id = `receipt-${Date.now()}`;
    const upload: ReceiptUpload = {
      id,
      fileName: file.name,
      uploadedAt: new Date().toISOString().slice(0, 10),
      status: "pending_review",
      parserMode: "stub",
    };

    setReceiptUploads((current) => [upload, ...current]);
    setReceiptItems((current) => [...createStubReceiptLines(id), ...current]);
    setActiveReceiptId(id);
    setToast("Receipt upload pending local review");
  }

  function applyReceiptItems(items: readonly ReceiptLineItem[]) {
    if (!activeReceipt) {
      return;
    }

    setPantryItems((current) => applyReceiptItemsToPantry(items, current));
    setReceiptItems((current) =>
      current.map((item) => items.find((nextItem) => nextItem.id === item.id) ?? item),
    );
    setReceiptUploads((current) =>
      current.map((upload) =>
        upload.id === activeReceipt.id
          ? { ...upload, status: "reviewed" }
          : upload,
      ),
    );
    setActiveReceiptId(null);
    setToast("Accepted receipt items added to pantry estimate");
  }

  function removePantryItem(item: PantryItem) {
    if (!window.confirm(`Remove ${item.name} from pantry estimate?`)) {
      return;
    }

    setPantryItems((current) =>
      current.filter((pantryItem) => pantryItem.id !== item.id),
    );
    setToast(`${item.name} removed from pantry estimate`);
  }

  function usePantryItem(item: PantryItem) {
    const delta = item.unit === "piece" ? 1 : item.unit === "ml" ? 50 : 50;

    setPantryItems((current) =>
      updatePantryQuantity(current, item.id, Math.max(0, item.quantity - delta)),
    );
    setToast(`${item.name} deducted from pantry estimate`);
  }

  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-3 pb-8 xl:h-[calc(100dvh-88px)] xl:min-h-0 xl:overflow-hidden xl:pb-0"
      id="grocery-page"
      {...stateAttrs(contentStates.page)}
    >
      <header className="shrink-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {viewModel.header.eyebrow}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[var(--text-primary)]">
              {viewModel.header.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {viewModel.header.subline}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-[var(--text-muted)]">
              Week {viewModel.header.weekLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={primaryButtonClass}
              disabled={!actionsEnabled || visibleShoppingItems.length === 0}
              onClick={copyShoppingText}
              onPointerDown={() => {
                if (copyShoppingItemNames(visibleShoppingItems)) {
                  setToast("Shopping list copied");
                }
              }}
              type="button"
            >
              Copy shopping text
            </button>
            <label
              aria-disabled={!actionsEnabled}
              className={cn(
                secondaryButtonClass,
                !actionsEnabled && "pointer-events-none opacity-50",
              )}
            >
              Upload receipt
              <input
                accept="image/*,.pdf"
                className="sr-only"
                disabled={!actionsEnabled}
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    uploadReceipt(file);
                    event.target.value = "";
                  }
                }}
                type="file"
              />
            </label>
            <button
              className={secondaryButtonClass}
              disabled={!actionsEnabled}
              onClick={() => setPantryFormOpen(true)}
              type="button"
            >
              Add item
            </button>
            <button
              className={secondaryButtonClass}
              disabled={!actionsEnabled}
              onClick={() => setMustListOpen(true)}
              type="button"
            >
              Manage must-list
            </button>
            <Link className={secondaryButtonClass} href="/nutrition/meal-planner">
              Open meal planner
            </Link>
          </div>
        </div>

        {toast ? (
          <div
            className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[rgba(18,28,43,.56)] px-4 py-2 text-[11px] font-semibold text-[var(--text-secondary)]"
            role="status"
          >
            <span>{toast}</span>
            <button
              className="min-h-8 rounded-full border border-[var(--border-subtle)] px-3 text-[10px] text-[var(--text-muted)] transition hover:text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={() => setToast(null)}
              type="button"
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </header>

      <SummaryStrip
        stateAttributes={stateAttrs(contentStates.summary)}
        summary={summary}
      />

      <div className="grid min-h-0 gap-3 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)] xl:overflow-hidden">
        <ToBuyPanel
          actionsEnabled={actionsEnabled}
          filter={shoppingFilter}
          items={groceryItems}
          mustHaveItems={mustHaveItems}
          mustListOpen={mustListOpen}
          onAddMustHave={(item) => {
            setMustHaveItems((current) => [item, ...current]);
            setToast(`${item.name} added to must-list`);
          }}
          onAddToPantry={addItemToPantry}
          onFilterChange={setShoppingFilter}
          onListStatusChange={(itemId, status) =>
            setListStatus((current) => ({ ...current, [itemId]: status }))
          }
          onMustListOpenChange={setMustListOpen}
          onToggleMustHave={(itemId) =>
            setMustHaveItems((current) =>
              current.map((item) =>
                item.id === itemId ? { ...item, enabled: !item.enabled } : item,
              ),
            )
          }
          stateAttributes={stateAttrs(contentStates.toBuy)}
        />

        <InStockPanel
          actionsEnabled={actionsEnabled}
          addFormOpen={pantryFormOpen}
          onAddFormOpenChange={setPantryFormOpen}
          onAddItem={(name, quantity, unit, confidence) => {
            setPantryItems((current) =>
              addPantryQuantity(current, name, quantity, unit, "manual", confidence),
            );
            setToast(`${ingredientReferenceFor(name, unit).name} added manually`);
          }}
          onQuantityChange={(itemId, quantity) =>
            setPantryItems((current) => updatePantryQuantity(current, itemId, quantity))
          }
          onRemoveItem={removePantryItem}
          onReview={(upload) => setActiveReceiptId(upload.id)}
          onUpload={uploadReceipt}
          onUseItem={usePantryItem}
          pantryItems={pantryItems}
          receiptUploads={receiptUploads}
          stateAttributes={stateAttrs(contentStates.pantry)}
        />
      </div>

      {activeReceipt ? (
        <ReceiptReviewDialog
          key={activeReceipt.id}
          items={activeReceiptItems}
          onApply={applyReceiptItems}
          onClose={() => setActiveReceiptId(null)}
          upload={activeReceipt}
        />
      ) : null}
    </div>
  );
}

export function GroceryWorkbenchView({ viewModel }: Readonly<{ viewModel: GroceryViewModel }>) {
  if (viewModel.profileId && viewModel.profileId !== "demo") {
    return <ManualGroceryDraftView viewModel={viewModel} />;
  }

  return <GroceryInteractiveWorkbenchView viewModel={viewModel} />;
}
