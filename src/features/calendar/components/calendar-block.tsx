import type { CSSProperties } from "react";
import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import {
  calendarBlockStatusLabels,
  calendarBlockTypeLabels,
} from "../calendar-types";
import type {
  CalendarAllDayBlockViewModel,
  CalendarTimedBlockViewModel,
} from "../calendar-types";

type TimedBlockStyle = CSSProperties & {
  "--accent"?: string;
};

function blockLabel(block: CalendarTimedBlockViewModel) {
  return `${block.title}, ${block.startTime} to ${block.endTime}, ${calendarBlockTypeLabels[block.type]}, ${calendarBlockStatusLabels[block.status]}, source ${block.sourceEntity.label}, area ${block.area}`;
}

export function CalendarTimedBlock({
  block,
}: Readonly<{
  block: CalendarTimedBlockViewModel;
}>) {
  const isRegular = block.density === "regular";
  const isCompact = block.density === "compact";
  const isMicro = block.density === "micro";
  const blockStyle: TimedBlockStyle = {
    ...accentStyle(block.accent),
    top: `${block.layout.top}%`,
    height: `${block.layout.height}%`,
    left: `calc(${block.layout.left}% + 3px)`,
    width: `calc(${block.layout.width}% - 6px)`,
  };

  return (
    <article
      aria-label={blockLabel(block)}
      title={blockLabel(block)}
      className={cn(
        "absolute overflow-hidden rounded-[8px] border border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,rgba(18,28,43,.92))] shadow-[0_6px_14px_rgba(0,0,0,.12)]",
        isRegular && "min-h-[72px] px-2.5 py-2",
        isCompact && "min-h-[52px] px-2 py-1.5",
        isMicro && "min-h-[40px] px-2 py-1",
      )}
      style={blockStyle}
    >
      {isRegular ? (
        <div className="flex h-full min-w-0 flex-col">
          <div className="flex min-w-0 items-start justify-between gap-1.5">
            <p className="min-w-0 overflow-hidden text-[10px] font-semibold leading-3 text-[var(--text-primary)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {block.title}
            </p>
            <span
              aria-hidden="true"
              className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
            />
          </div>
          <p className="mt-0.5 truncate text-[9px] font-medium leading-3 text-[var(--text-secondary)]">
            {block.startTime}-{block.endTime} ·{" "}
            {calendarBlockTypeLabels[block.type]}
          </p>
          <p className="mt-0.5 truncate text-[9px] leading-3 text-[var(--text-muted)]">
            {block.area} · {block.meta ?? block.sourceEntity.label}
          </p>
          <div className="mt-auto pt-1">
            <Pill accent={block.accent} quiet={block.status === "planned"}>
              {calendarBlockStatusLabels[block.status]}
            </Pill>
          </div>
        </div>
      ) : null}

      {isCompact ? (
        <div className="grid h-full min-w-0 content-center gap-0.5">
          <div className="flex min-w-0 items-center justify-between gap-1.5">
            <p className="truncate text-[10px] font-semibold leading-3 text-[var(--text-primary)]">
              {block.title}
            </p>
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
            />
          </div>
          <div className="flex min-w-0 items-center justify-between gap-1.5">
            <p className="min-w-0 truncate text-[9px] font-medium leading-3 text-[var(--text-secondary)]">
              {block.startTime}-{block.endTime} ·{" "}
              {calendarBlockTypeLabels[block.type]}
            </p>
            <p className="shrink-0 truncate text-[9px] font-semibold leading-3 text-[var(--accent)]">
              {calendarBlockStatusLabels[block.status]}
            </p>
          </div>
        </div>
      ) : null}

      {isMicro ? (
        <div className="grid h-full min-w-0 content-center gap-0.5">
          <p className="truncate text-[10px] font-semibold leading-3 text-[var(--text-primary)]">
            {block.title}
          </p>
          <p className="truncate text-[9px] font-medium leading-3 text-[var(--text-secondary)]">
            {block.startTime}-{block.endTime} ·{" "}
            {calendarBlockStatusLabels[block.status]}
          </p>
        </div>
      ) : null}
    </article>
  );
}

export function CalendarAllDayBlock({
  block,
  selected = false,
}: Readonly<{
  block: CalendarAllDayBlockViewModel;
  selected?: boolean;
}>) {
  return (
    <article
      aria-label={`${block.title}, ${block.timeLabel ?? "all day"}, ${calendarBlockTypeLabels[block.type]}, ${calendarBlockStatusLabels[block.status]}, source ${block.sourceEntity.label}, area ${block.area}`}
      title={`${block.title}, ${calendarBlockStatusLabels[block.status]}, ${block.sourceEntity.label}`}
      className={cn(
        "min-h-[38px] overflow-hidden rounded-[8px] border bg-[color-mix(in_srgb,var(--accent)_10%,rgba(18,28,43,.82))] px-1.5 py-1",
        selected
          ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)]"
          : "border-[color-mix(in_srgb,var(--accent)_20%,transparent)]",
      )}
      style={accentStyle(block.accent)}
    >
      <div className="grid min-w-0 gap-0.5">
        <div className="flex min-w-0 items-center justify-between gap-1">
          <h3 className="truncate text-[10px] font-semibold leading-3 text-[var(--text-primary)]">
            {block.title}
          </h3>
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
          />
        </div>
        <div className="flex min-w-0 items-center justify-between gap-1">
          <p className="min-w-0 truncate text-[9px] leading-3 text-[var(--text-muted)]">
            {block.timeLabel ?? "All day"} · {calendarBlockTypeLabels[block.type]}
          </p>
          <p className="shrink-0 truncate text-[9px] font-semibold leading-3 text-[var(--accent)]">
            {calendarBlockStatusLabels[block.status]}
          </p>
        </div>
      </div>
    </article>
  );
}
