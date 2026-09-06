import type { CSSProperties, PointerEvent } from "react";
import { accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import { calendarDurationToHeightPercent } from "../calendar-pointer-utils";
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
  dragging = false,
  onPointerDown,
  onResizePointerDown,
  onSelect,
  previewDurationMinutes,
  selected = false,
}: Readonly<{
  block: CalendarTimedBlockViewModel;
  dragging?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  onSelect?: (blockId: string) => void;
  previewDurationMinutes?: number;
  selected?: boolean;
}>) {
  const isRegular = block.density === "regular";
  const isCompact = block.density === "compact";
  const isMicro = block.density === "micro";
  const blockStyle: TimedBlockStyle = {
    ...accentStyle(block.accent),
    top: `${block.layout.top}%`,
    height: `${
      previewDurationMinutes === undefined
        ? block.layout.height
        : calendarDurationToHeightPercent(previewDurationMinutes)
    }%`,
    left: `calc(${block.layout.left}% + 3px)`,
    width: `calc(${block.layout.width}% - 6px)`,
  };

  return (
    <div
      className={cn(
        "absolute z-[3]",
        dragging && "opacity-45",
        onPointerDown && "cursor-grab active:cursor-grabbing",
      )}
      data-calendar-task-block={block.taskId ? "true" : undefined}
      data-calendar-timed-block={block.id}
      onPointerDown={onPointerDown}
      style={blockStyle}
    >
      <button
        aria-label={blockLabel(block)}
        aria-pressed={selected}
        className={cn(
          "h-full w-full overflow-hidden rounded-[8px] border bg-[color-mix(in_srgb,var(--accent)_12%,rgba(18,28,43,.92))] text-left shadow-[0_6px_14px_rgba(0,0,0,.12)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
          selected
            ? "border-[color-mix(in_srgb,var(--accent)_62%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_42%,transparent)]"
            : "border-[color-mix(in_srgb,var(--accent)_26%,transparent)] hover:border-[color-mix(in_srgb,var(--accent)_42%,transparent)]",
          isRegular && "px-2.5 py-2",
          isCompact && "px-2 py-1.5",
          isMicro && "px-1.5 py-0",
        )}
        onClick={() => onSelect?.(block.id)}
        title={blockLabel(block)}
        type="button"
      >
        {isMicro && block.durationMinutes < 30 ? (
          <div className="flex h-full min-w-0 items-center gap-1 text-[9px] leading-none">
            <span className="shrink-0">{block.startTime}</span>
            <span className="truncate font-semibold">{block.title}</span>
          </div>
        ) : (
          <div className="flex h-full min-w-0 flex-col justify-center gap-0.5">
            <p className="truncate text-[10px] font-semibold leading-3">
              {block.title}
            </p>
            <p className="truncate text-[9px] leading-3 text-[var(--text-secondary)]">
              {block.startTime}–{block.endTime}
            </p>
            {!isMicro ? (
              <p className="truncate text-[9px] leading-3 text-[var(--accent)]">
                {calendarBlockTypeLabels[block.type]} ·{" "}
                {calendarBlockStatusLabels[block.status]}
              </p>
            ) : null}
            {isRegular ? (
              <p className="truncate text-[9px] leading-3 text-[var(--text-muted)]">
                {block.area} · {block.meta ?? block.sourceEntity.label}
              </p>
            ) : null}
          </div>
        )}
      </button>
      {onResizePointerDown ? (
        <button
          aria-label="Resize task duration"
          className="absolute inset-x-2 bottom-0 z-[4] h-3 cursor-ns-resize rounded-b-[6px] border-t border-[color-mix(in_srgb,var(--accent)_46%,transparent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] opacity-0 transition hover:opacity-100 focus:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)]"
          data-calendar-resize-handle={block.id}
          onPointerDown={onResizePointerDown}
          title="Resize duration"
          type="button"
        />
      ) : null}
    </div>
  );
}

export function CalendarAllDayBlock({
  block,
  onSelect,
  selected = false,
}: Readonly<{
  block: CalendarAllDayBlockViewModel;
  onSelect?: (blockId: string) => void;
  selected?: boolean;
}>) {
  return (
    <button
      aria-label={`${block.markerLabel ?? calendarBlockTypeLabels[block.type]}: ${block.title}, ${block.timeLabel ?? "all day"}, ${calendarBlockStatusLabels[block.status]}, source ${block.sourceEntity.label}, area ${block.area}`}
      aria-pressed={selected}
      onClick={() => onSelect?.(block.id)}
      title={`${block.title}, ${calendarBlockStatusLabels[block.status]}, ${block.sourceEntity.label}`}
      className={cn(
        "min-h-[38px] overflow-hidden rounded-[8px] border bg-[color-mix(in_srgb,var(--accent)_10%,rgba(18,28,43,.82))] px-1.5 py-1 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
        selected
          ? "border-[color-mix(in_srgb,var(--accent)_62%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_42%,transparent)]"
          : "border-[color-mix(in_srgb,var(--accent)_20%,transparent)] hover:border-[color-mix(in_srgb,var(--accent)_38%,transparent)]",
        block.isOverdue && "border-[rgba(217,146,79,.42)]",
      )}
      style={accentStyle(block.accent)}
      type="button"
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
            {block.markerLabel ?? block.timeLabel ?? "All day"}
          </p>
          <p className="shrink-0 truncate text-[9px] font-semibold leading-3 text-[var(--accent)]">
            {calendarBlockStatusLabels[block.status]}
          </p>
        </div>
      </div>
    </button>
  );
}
