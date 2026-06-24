import type { CSSProperties, ReactNode } from "react";
import {
  getInboxCaptureTypeLabel,
  getInboxStageLabel,
  type InboxAISuggestion,
  type InboxChecklistItem,
  type InboxClarificationField,
  type InboxOutcomeOption,
  type InboxPlanningSignal,
  type InboxQueueItem,
  type InboxRelatedContextItem,
  type InboxSignal,
  type InboxViewModel,
} from "@/features/inbox";
import { cn } from "@/lib/cn";

type AccentStyle = CSSProperties & {
  "--accent"?: string;
};

function accentStyle(accent: string): AccentStyle {
  return {
    "--accent": accent,
  };
}

const panelClasses =
  "overflow-hidden rounded-[22px] border border-[var(--border-default)] bg-[rgba(15,23,36,.96)] shadow-[0_8px_22px_rgba(0,0,0,.12)]";

const panelHeaderClasses =
  "border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-4 py-3";

const focusClasses =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

function SectionTitle({
  children,
  id,
  label,
}: Readonly<{
  children?: ReactNode;
  id: string;
  label: string;
}>) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <h2 className="text-base font-semibold text-[var(--text-primary)]" id={id}>
        {label}
      </h2>
      {children}
    </div>
  );
}

function Pill({
  children,
  accent = "var(--accent-blue)",
  active = false,
  className,
  tinted = false,
}: Readonly<{
  children: ReactNode;
  accent?: string;
  active?: boolean;
  className?: string;
  tinted?: boolean;
}>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-5 items-center rounded-full border px-2 text-[10px] font-medium",
        active
          ? "border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--text-primary)]"
          : tinted
            ? "border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[color-mix(in_srgb,var(--accent)_11%,transparent)] text-[var(--text-secondary)]"
          : "border-[var(--border-subtle)] bg-[rgba(168,183,204,.045)] text-[var(--text-secondary)]",
        className,
      )}
      style={accentStyle(accent)}
    >
      {children}
    </span>
  );
}

function stageAccent(stage: InboxQueueItem["stage"]) {
  switch (stage) {
    case "raw":
      return "var(--accent-blue)";
    case "clarify":
      return "var(--accent-orange)";
    case "review":
      return "var(--accent-red)";
    case "ready":
      return "var(--accent-green)";
  }
}

function captureTypeAccent(type: InboxQueueItem["type"]) {
  switch (type) {
    case "task":
      return "var(--accent-green)";
    case "note":
    case "question":
      return "var(--accent-cyan)";
    case "idea":
    case "agent":
      return "var(--accent-purple)";
    case "resource":
      return "var(--accent-yellow)";
    case "decision":
      return "var(--accent-orange)";
  }
}

function Dot({
  accent,
  className,
}: Readonly<{
  accent: string;
  className?: string;
}>) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 rounded-full bg-[var(--accent)]", className)}
      style={accentStyle(accent)}
    />
  );
}

function InboxPageHeader({
  kicker,
  modePills,
  purpose,
  signals,
  title,
}: Readonly<{
  kicker: string;
  modePills: string[];
  purpose: string;
  signals: InboxSignal[];
  title: string;
}>) {
  return (
    <header className="shrink-0 rounded-[22px] border border-[var(--border-default)] bg-[rgba(15,23,36,.96)] px-5 py-4 shadow-[0_8px_22px_rgba(0,0,0,.12)] 2xl:px-7">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,788px)] xl:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-[var(--accent-cyan)]">
            {kicker}
          </p>
          <h1 className="mt-1 text-[34px] font-semibold leading-tight text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="mt-1.5 max-w-4xl text-sm leading-5 text-[var(--text-secondary)]">
            {purpose}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {modePills.map((pill, index) => (
              <Pill
                active={index === 0}
                accent={index === 0 ? "var(--accent-blue)" : "var(--accent-green)"}
                key={pill}
              >
                {pill}
              </Pill>
            ))}
          </div>
        </div>

        <dl className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {signals.map((signal, index) => (
            <div
              className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(12,20,34,.72)] p-2.5"
              key={`inbox-overview-signal-${index}`}
              style={accentStyle(signal.accent)}
            >
              <dt className="text-[10px] font-medium text-[var(--text-muted)]">
                {signal.label}
              </dt>
              <dd className="mt-0.5 flex items-center justify-between gap-3">
                <span className="text-[22px] font-semibold leading-none text-[var(--text-primary)]">
                  {signal.value}
                </span>
                <Dot accent={signal.accent} />
              </dd>
              <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                {signal.sublabel}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

function InboxQueueItemView({ item }: Readonly<{ item: InboxQueueItem }>) {
  const stage = getInboxStageLabel(item.stage);
  const type = getInboxCaptureTypeLabel(item.type);
  const stageColor = stageAccent(item.stage);
  const typeColor = captureTypeAccent(item.type);

  return (
    <article
      className={cn(
        "grid min-h-[92px] grid-cols-[4px_minmax(0,1fr)] overflow-hidden rounded-[16px] border bg-[rgba(18,28,43,.54)] transition",
        item.active
          ? "border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--accent)_7%,rgba(18,28,43,.72))]"
          : "border-[var(--border-subtle)]",
      )}
      style={accentStyle(item.accent)}
    >
      <span className="h-full rounded-full bg-[var(--accent)]" />
      <div className="min-w-0 p-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
            {item.title}
          </h3>
          <span className="shrink-0 text-[10px] font-medium text-[var(--text-muted)]">
            {item.age}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Pill active={item.active} accent={stageColor} tinted>
            {stage}
          </Pill>
          <Pill accent={typeColor} tinted>
            {type}
          </Pill>
        </div>
        <p className="mt-2 truncate text-[11px] text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-muted)]">Next: </span>
          {item.next}
        </p>
      </div>
    </article>
  );
}

function InboxQueue({
  filters,
  items,
}: Readonly<{
  filters: string[];
  items: InboxQueueItem[];
}>) {
  return (
    <section
      aria-labelledby="inbox-queue-title"
      className={cn(panelClasses, "2xl:flex 2xl:min-h-0 2xl:flex-col")}
    >
      <div className={panelHeaderClasses}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              className="text-lg font-semibold text-[var(--text-primary)]"
              id="inbox-queue-title"
            >
              Inbox Queue
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Stage + Quick Capture label.
            </p>
          </div>
          <input
            aria-label="Search inbox"
            className={cn(
              "h-9 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] sm:w-44",
              focusClasses,
            )}
            placeholder="Search inbox"
            readOnly
          />
        </div>
      </div>

      <div className="p-3 2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col">
        <div
          aria-label="Inbox filters"
          className="flex shrink-0 flex-wrap gap-1.5 rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] p-1.5"
        >
          {filters.map((filter) => (
            <button
              aria-pressed={filter === "All"}
              className={cn(
                "min-h-[26px] rounded-full border px-3 text-[10px] font-medium text-[var(--text-secondary)]",
                filter === "All"
                  ? "border-[rgba(91,124,250,.34)] bg-[rgba(91,124,250,.18)] text-[var(--text-primary)]"
                  : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.60)]",
                focusClasses,
              )}
              key={filter}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 2xl:min-h-0 2xl:flex-1 2xl:overflow-y-auto 2xl:pr-1">
          {items.map((item) => (
            <InboxQueueItemView item={item} key={item.id} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FieldSurface({
  className,
  field,
  rows,
}: Readonly<{
  className?: string;
  field: InboxClarificationField;
  rows: number;
}>) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
        {field.label}
      </span>
      <textarea
        className={cn(
          "mt-1.5 w-full resize-none rounded-[14px] border border-[var(--border-default)] bg-[rgba(18,28,43,.64)] px-3 py-2 text-[13px] leading-5 text-[var(--text-secondary)]",
          className,
          focusClasses,
        )}
        readOnly
        rows={rows}
        value={field.value}
      />
    </label>
  );
}

function InboxPlanningSignals({
  signals,
}: Readonly<{
  signals: InboxPlanningSignal[];
}>) {
  return (
    <section
      aria-labelledby="planning-signals-title"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3 2xl:min-h-[132px]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className="text-sm font-semibold text-[var(--text-primary)]"
            id="planning-signals-title"
          >
            Planning Signals
          </h3>
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
            Guidance only. AI suggestions become final only after review.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={cn(
              "min-h-8 rounded-[12px] border border-[var(--border-default)] bg-[rgba(18,28,43,.76)] px-3 text-xs font-semibold text-[var(--text-secondary)]",
              focusClasses,
            )}
            type="button"
          >
            Apply
          </button>
          <button
            className={cn(
              "min-h-8 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.045)] px-3 text-xs font-semibold text-[var(--text-secondary)]",
              focusClasses,
            )}
            type="button"
          >
            Edit
          </button>
        </div>
      </div>
      <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {signals.map((signal, index) => (
          <article
            className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.70)] px-3 py-2"
            key={`inbox-queue-signal-${index}`}
            style={accentStyle(signal.accent)}
          >
            <p className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)]">
              <Dot accent={signal.accent} className="size-1.5 opacity-75" />
              <span>{signal.label}</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {signal.value}
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              {signal.source}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function InboxOutcomeRoutes({
  description,
  options,
  title,
}: Readonly<{
  description: string;
  options: InboxOutcomeOption[];
  title: string;
}>) {
  return (
    <section
      aria-labelledby="outcome-route-title"
      className="rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3 2xl:flex 2xl:min-h-[250px] 2xl:flex-1 2xl:flex-col"
    >
      <h3
        className="text-sm font-semibold text-[var(--text-primary)]"
        id="outcome-route-title"
      >
        {title}
      </h3>
      <p className="mt-1 text-xs leading-4 text-[var(--text-secondary)]">
        {description}
      </p>
      <div className="mt-2 grid gap-2 lg:grid-cols-2 2xl:flex-1">
        {options.map((option) => (
          <button
            className={cn(
              "min-h-[100px] rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.68)] px-3 py-3 text-left 2xl:h-full",
              focusClasses,
            )}
            key={option.id}
            style={accentStyle(option.accent)}
            type="button"
          >
            <span className="flex items-start gap-2.5">
              <Dot accent={option.accent} className="mt-1 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-[var(--text-primary)]">
                  {option.title}
                </span>
                <span className="mt-1 block border-t border-[var(--border-subtle)] pt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
                  {option.description}
                </span>
                <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                  {option.examples}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function InboxActiveItemPanel({
  activeItem,
  outcome,
}: Readonly<{
  activeItem: InboxViewModel["activeItem"];
  outcome: InboxViewModel["outcome"];
}>) {
  const [cleanTitle, description, nextAction, missingInfo] = activeItem.fields;

  return (
    <section
      aria-labelledby="active-item-title"
      className={cn(panelClasses, "2xl:flex 2xl:min-h-0 2xl:flex-col")}
    >
      <div className={panelHeaderClasses}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--accent-orange)]">
              Active item
            </p>
            <h2
              className="mt-0.5 text-lg font-semibold text-[var(--text-primary)]"
              id="active-item-title"
            >
              {activeItem.title}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill active accent="var(--accent-orange)">
              Stage: {activeItem.stage}
            </Pill>
            <Pill active accent="var(--accent-cyan)">
              Type: {activeItem.type}
            </Pill>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3 2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col 2xl:gap-3 2xl:space-y-0">
        <section
          aria-labelledby="original-capture-title"
          className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3 2xl:min-h-[102px]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3
              className="text-[10px] font-semibold uppercase text-[var(--text-muted)]"
              id="original-capture-title"
            >
              Original Capture
            </h3>
            <Pill>{activeItem.source}</Pill>
          </div>
          <blockquote className="mt-2 border-l-[3px] border-[var(--accent-blue)] pl-3 text-[13px] leading-5 text-[var(--text-primary)]">
            {`"${activeItem.originalCapture}"`}
          </blockquote>
        </section>

        <section
          aria-labelledby="clarification-fields-title"
          className="space-y-3 2xl:space-y-3"
        >
          <h3 className="sr-only" id="clarification-fields-title">
            Clarification Fields
          </h3>
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,420px)_minmax(0,1fr)]">
            <FieldSurface
              className="2xl:min-h-[54px]"
              field={cleanTitle}
              rows={1}
            />
            <div className="hidden xl:block" />
          </div>
          <FieldSurface
            className="2xl:min-h-[110px]"
            field={description}
            rows={2}
          />
          <div className="grid gap-3 xl:grid-cols-2">
            <FieldSurface
              className="2xl:min-h-[98px]"
              field={nextAction}
              rows={2}
            />
            <FieldSurface
              className="2xl:min-h-[98px]"
              field={missingInfo}
              rows={2}
            />
          </div>
        </section>

        <InboxPlanningSignals signals={activeItem.planningSignals} />
        <InboxOutcomeRoutes
          description={outcome.description}
          options={outcome.options}
          title={outcome.title}
        />
        <div
          aria-label="Inbox item actions"
          className="mt-auto flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3"
        >
          {["Save progress", "Mark as clarified", "Snooze", "Dismiss"].map(
            (action, index) => (
              <button
                className={cn(
                  "min-h-8 rounded-[12px] border px-3 text-xs font-semibold",
                  index === 1
                    ? "border-[rgba(66,184,131,.34)] bg-[rgba(66,184,131,.18)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.70)] text-[var(--text-secondary)]",
                  focusClasses,
                )}
                key={`inbox-action-${index}`}
                type="button"
              >
                {action}
              </button>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function AIAssistantPanel({
  assistant,
}: Readonly<{
  assistant: InboxViewModel["aiAssistant"];
}>) {
  return (
    <section aria-labelledby="ai-assistant-title" className={panelClasses}>
      <div className={panelHeaderClasses}>
        <SectionTitle id="ai-assistant-title" label={assistant.title}>
          <Pill active accent="var(--accent-purple)">
            {assistant.mode}
          </Pill>
        </SectionTitle>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs text-[var(--text-secondary)]">
          {assistant.description}
        </p>
        <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3">
          <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
            Suggested Planning
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {assistant.planning.map((suggestion, index) => (
              <SuggestionBox
                key={`inbox-ai-suggestion-${index}`}
                suggestion={suggestion}
              />
            ))}
          </div>
          <button
            className={cn(
              "mt-2 min-h-8 rounded-[12px] border border-[var(--border-default)] bg-[rgba(18,28,43,.76)] px-3 text-xs font-semibold text-[var(--text-secondary)]",
              focusClasses,
            )}
            type="button"
          >
            Apply
          </button>
        </div>
        <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.52)] p-3">
          <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
            Suggested Outcome
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {assistant.outcomes.map((outcome, index) => (
              <Pill
                active={index === 0}
                accent={
                  index === 0
                    ? "var(--accent-blue)"
                    : index === 1
                      ? "var(--accent-purple)"
                      : "var(--accent-orange)"
                }
                key={outcome}
              >
                {outcome}
              </Pill>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="sr-only">Discuss this item with AI</span>
          <textarea
            className={cn(
              "min-h-[72px] w-full resize-none rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]",
              focusClasses,
            )}
            placeholder={assistant.placeholder}
            readOnly
          />
        </label>
      </div>
    </section>
  );
}

function SuggestionBox({
  suggestion,
}: Readonly<{
  suggestion: InboxAISuggestion;
}>) {
  return (
    <article
      className="rounded-[12px] border border-[var(--border-subtle)] border-l-[3px] border-l-[var(--accent)] bg-[rgba(15,23,36,.70)] px-3 py-2"
      style={accentStyle(suggestion.accent)}
    >
      <p className="text-[10px] text-[var(--text-muted)]">{suggestion.label}</p>
      <p className="mt-0.5 text-xs font-semibold text-[var(--text-primary)]">
        {suggestion.value}
      </p>
    </article>
  );
}

function DecisionChecklist({
  checklist,
}: Readonly<{
  checklist: InboxViewModel["checklist"];
}>) {
  return (
    <section aria-labelledby="decision-checklist-title" className={panelClasses}>
      <div className={panelHeaderClasses}>
        <SectionTitle id="decision-checklist-title" label={checklist.title}>
          <Pill active accent="var(--accent-orange)">
            {checklist.progress}
          </Pill>
        </SectionTitle>
      </div>
      <div className="p-4">
        <ul className="space-y-2">
          {checklist.items.map((item, index) => (
            <ChecklistItem item={item} key={`inbox-checklist-${index}`} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function ChecklistItem({ item }: Readonly<{ item: InboxChecklistItem }>) {
  const isDone = item.state === "done";
  const accent = isDone ? "var(--accent-green)" : "var(--accent-orange)";

  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2">
        <Dot accent={accent} className={isDone ? "opacity-90" : "opacity-72"} />
        <span
          className={cn(
            "truncate text-xs font-medium",
            isDone ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]",
          )}
        >
          {item.label}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-[11px] font-medium",
          isDone ? "text-[var(--accent-green)]" : "text-[var(--accent-orange)]",
        )}
      >
        {item.state}
      </span>
    </li>
  );
}

function RelatedContext({
  context,
}: Readonly<{
  context: InboxViewModel["relatedContext"];
}>) {
  return (
    <section
      aria-labelledby="related-context-title"
      className={cn(panelClasses, "2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col")}
    >
      <div className={panelHeaderClasses}>
        <SectionTitle id="related-context-title" label={context.title}>
          <Pill active>{context.mode}</Pill>
        </SectionTitle>
      </div>
      <div className="space-y-2 p-4 2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col">
        <input
          aria-label="Search related context"
          className={cn(
            "h-9 w-full shrink-0 rounded-[13px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]",
            focusClasses,
          )}
          placeholder={context.placeholder}
          readOnly
        />
        <div className="grid gap-2 2xl:min-h-0 2xl:flex-1 2xl:overflow-y-auto 2xl:pr-1">
          {context.items.map((item, index) => (
            <RelatedContextRow
              item={item}
              key={`inbox-related-context-${index}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedContextRow({
  item,
}: Readonly<{
  item: InboxRelatedContextItem;
}>) {
  return (
    <article className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <Dot accent={item.accent} className="shrink-0" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill accent={item.accent}>{item.typeArea}</Pill>
            <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
              {item.name}
            </p>
          </div>
          <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">
            {item.meta}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-[10px] font-medium text-[var(--text-muted)]">
          {item.score}
        </span>
        <button
          className={cn(
            "min-h-8 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.76)] px-3 text-xs font-semibold text-[var(--text-secondary)]",
            focusClasses,
          )}
          type="button"
        >
          Use
        </button>
      </div>
    </article>
  );
}

function InboxAIAssistantPanel({
  viewModel,
}: Readonly<{
  viewModel: InboxViewModel;
}>) {
  return (
    <aside
      className="space-y-4 2xl:flex 2xl:h-full 2xl:min-h-0 2xl:flex-col 2xl:gap-3 2xl:space-y-0"
      aria-label="Inbox assistant and context"
    >
      <AIAssistantPanel assistant={viewModel.aiAssistant} />
      <DecisionChecklist checklist={viewModel.checklist} />
      <RelatedContext context={viewModel.relatedContext} />
    </aside>
  );
}

export function InboxPage({
  viewModel,
}: Readonly<{
  viewModel: InboxViewModel;
}>) {
  return (
    <div
      className="mx-auto flex w-full max-w-[2168px] flex-col gap-3 pb-8 2xl:h-[calc(100dvh-20px)] 2xl:min-h-0 2xl:overflow-hidden 2xl:pb-0"
      id="inbox-page"
    >
      <InboxPageHeader
        kicker={viewModel.kicker}
        modePills={viewModel.modePills}
        purpose={viewModel.purpose}
        signals={viewModel.signals}
        title={viewModel.title}
      />

      <div className="grid gap-3 2xl:min-h-0 2xl:flex-1 2xl:grid-cols-[minmax(360px,560px)_minmax(680px,1fr)_minmax(360px,604px)] 2xl:items-stretch">
        <InboxQueue filters={viewModel.filters} items={viewModel.queue} />
        <InboxActiveItemPanel
          activeItem={viewModel.activeItem}
          outcome={viewModel.outcome}
        />
        <InboxAIAssistantPanel viewModel={viewModel} />
      </div>
    </div>
  );
}
