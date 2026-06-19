import type { DashboardAntiRotActions } from "@/features/dashboard";
import { Panel, Pill, styleFor } from "./section-primitives";

export function AntiRotActions({
  data,
}: Readonly<{
  data: DashboardAntiRotActions;
}>) {
  return (
    <Panel
      className="border-[rgba(155,124,246,.10)] bg-[color-mix(in_srgb,var(--accent-purple)_3%,#0c1320)] 2xl:h-[205px]"
      title={data.title}
      titleHref={data.href}
    >
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-[256px_256px_257px_257px_257px] 2xl:gap-[15px] 2xl:px-[36px] 2xl:pb-0 2xl:pt-2">
        {data.actions.map((action) => (
          <article
            className="flex flex-col justify-between rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] p-3 2xl:h-[125px] 2xl:p-2.5"
            key={action.title}
            style={styleFor(action.accent)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_24%,transparent)]" />
                <h3 className="truncate text-[10px] font-semibold text-[var(--text-secondary)]">
                  {action.title}
                </h3>
              </div>
              <span className="text-[8px] font-medium text-[var(--text-muted)]">
                {data.donePrompt}
              </span>
            </div>
            <div className="mt-3 2xl:mt-2">
              <Pill accent={action.accent}>{action.type}</Pill>
            </div>
            <dl className="mt-3 space-y-1.5 text-[8px] font-medium leading-tight text-[var(--text-muted)] 2xl:mt-2 2xl:space-y-1">
              <div className="flex gap-2">
                <dt>Bad habit:</dt>
                <dd>{action.bad}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center gap-2 2xl:mt-2">
              <Pill quiet>{action.effort}</Pill>
              <span className="text-[8px] font-medium text-[var(--text-muted)]">
                {action.time}
              </span>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
