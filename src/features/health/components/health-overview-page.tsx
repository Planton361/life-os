import { HabitsPanel } from "./habits-panel";
import { HealthDaySchedule } from "./health-day-schedule";
import { MentalHealthPanel } from "./mental-health-panel";
import { RunningPanel } from "./running-panel";
import { StrengthPanel } from "./strength-panel";
import type { HealthOverviewViewModel } from "../types";

function HealthOverviewHeader({
  header,
}: Readonly<{
  header: HealthOverviewViewModel["header"];
}>) {
  return (
    <header className="min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.76)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="bg-[linear-gradient(90deg,rgba(221,107,95,.055),transparent_46%)] px-4 py-3">
        <p className="text-[10px] font-semibold text-[var(--accent-red)]">
          {header.eyebrow}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold leading-none text-[var(--text-primary)] sm:text-[30px]">
          {header.title}
        </h1>
        <p className="mt-1.5 max-w-3xl text-xs leading-4 text-[var(--text-secondary)]">
          {header.summary}
        </p>
        <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
          {header.dateRange}
        </p>
      </div>
    </header>
  );
}

export function HealthOverviewPage({
  viewModel,
}: Readonly<{
  viewModel: HealthOverviewViewModel;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6 min-[1900px]:h-[calc(100dvh-1.25rem)] min-[1900px]:min-h-[1120px] min-[1900px]:pb-0">
      <HealthOverviewHeader header={viewModel.header} />

      <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] min-[1900px]:min-h-0 min-[1900px]:flex-1 min-[1900px]:grid-cols-[minmax(0,1fr)_minmax(560px,760px)]">
        <HealthDaySchedule
          className="order-1 xl:order-2 min-[1900px]:h-full"
          data={viewModel.schedule}
        />

        <div className="order-2 grid min-w-0 gap-2 xl:order-1 min-[1900px]:h-full min-[1900px]:grid-cols-2 min-[1900px]:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
          <MentalHealthPanel data={viewModel.mentalHealth} />
          <RunningPanel data={viewModel.running} />
          <HabitsPanel data={viewModel.habits} />
          <StrengthPanel data={viewModel.strength} />
        </div>
      </div>
    </div>
  );
}
