"use client";

import type {
  DashboardAntiRotActions,
  DashboardProfileId,
} from "@/features/dashboard";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  DashboardEmptyState,
  Panel,
  Pill,
  contentStateAttrs,
  styleFor,
} from "./section-primitives";

type AntiRotState = "neutral" | "active" | "done";

const DASHBOARD_LINK_FOCUS_CLASSES =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

function nextAntiRotState(state: AntiRotState): AntiRotState {
  if (state === "neutral") {
    return "active";
  }

  if (state === "active") {
    return "done";
  }

  return "neutral";
}

function antiRotStatusLabel(state: AntiRotState) {
  if (state === "active") {
    return "Active";
  }

  if (state === "done") {
    return "Done";
  }

  return "Ready";
}

export function AntiRotActions({
  data,
  profileId,
}: Readonly<{
  data: DashboardAntiRotActions;
  profileId: DashboardProfileId;
}>) {
  const [actionStates, setActionStates] = useState<Record<string, AntiRotState>>({});

  function cycleAction(actionId: string) {
    setActionStates((current) => ({
      ...current,
      [actionId]: nextAntiRotState(current[actionId] ?? "neutral"),
    }));
  }

  return (
    <Panel
      className="border-[rgba(155,124,246,.10)] bg-[color-mix(in_srgb,var(--accent-purple)_3%,#0c1320)] 2xl:h-[205px]"
      stateAttrs={contentStateAttrs(data.contentState, profileId)}
      title={data.title}
      titleHref={data.href}
    >
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-[256px_256px_257px_257px_257px] 2xl:gap-[15px] 2xl:px-[36px] 2xl:pb-0 2xl:pt-2">
        {data.actions.length > 0 ? (
          data.actions.map((action) => {
            const state = actionStates[action.id] ?? "neutral";

            return (
              <button
                aria-label={`${action.title}: ${antiRotStatusLabel(state)}. Press to update reset state.`}
                className={cn(
                  "flex flex-col justify-between rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] p-3 text-left transition hover:border-[color-mix(in_srgb,var(--accent)_28%,transparent)] 2xl:h-[125px] 2xl:p-2.5",
                  state === "active" &&
                    "bg-[color-mix(in_srgb,var(--accent)_9%,transparent)]",
                  state === "done" &&
                    "border-[rgba(66,184,131,.28)] bg-[rgba(66,184,131,.08)]",
                  DASHBOARD_LINK_FOCUS_CLASSES,
                )}
                key={action.id}
                onClick={() => cycleAction(action.id)}
                style={styleFor(action.accent)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_24%,transparent)]" />
                    <h3 className="truncate text-[10px] font-semibold text-[var(--text-secondary)]">
                      {action.title}
                    </h3>
                  </div>
                  <span className="text-[8px] font-medium text-[var(--text-muted)]">
                    {antiRotStatusLabel(state)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 2xl:mt-2">
                  <Pill accent={state === "done" ? "var(--accent-green)" : action.accent}>
                    {state === "done" ? "Done" : action.type}
                  </Pill>
                  {state === "active" ? (
                    <Pill accent={action.accent}>Active</Pill>
                  ) : null}
                </div>
                <dl className="mt-3 space-y-1.5 text-[8px] font-medium leading-tight text-[var(--text-muted)] 2xl:mt-2 2xl:space-y-1">
                  <div className="flex gap-2">
                    <dt>Trigger:</dt>
                    <dd>{action.bad}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center gap-2 2xl:mt-2">
                  <Pill quiet>{action.effort}</Pill>
                  <span className="text-[8px] font-medium text-[var(--text-muted)]">
                    {action.time}
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <DashboardEmptyState
            className="xl:col-span-5"
            description="Öffne Habits, um Reset-Aktionen zu konfigurieren."
            title="Keine Anti-Rot-Aktionen"
          />
        )}
      </div>
    </Panel>
  );
}
