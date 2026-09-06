import { CalendarPlanningPage } from "@/features/calendar";
import { getCalendarViewModel } from "@/features/profile-data";
import { ManualDbAuthNotice } from "@/features/real-data/manual-db-auth-notice";

export const metadata = {
  title: "Calendar | Life OS",
  description:
    "Temporal planning surface for projected events, tasks, deadlines and reviews.",
};

export default async function CalendarPage() {
  const viewModel = await getCalendarViewModel();
  const calendarProjectionKey = viewModel.timedBlocks
    .map(
      (block) =>
        `${block.id}:${block.date ?? ""}:${block.startTime}:${block.endTime}`,
    )
    .concat(
      viewModel.allDayBlocks.map(
        (block) => `${block.id}:${block.date ?? ""}:${block.status}`,
      ),
    )
    .join("|");

  return (
    <div id="calendar-workspace">
      <div className="mx-auto mb-3 w-full max-w-[2208px]">
        <ManualDbAuthNotice />
      </div>
      <CalendarPlanningPage key={calendarProjectionKey} viewModel={viewModel} />
    </div>
  );
}
