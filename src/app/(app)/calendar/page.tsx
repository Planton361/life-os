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

  return (
    <>
      <div className="mx-auto mb-3 w-full max-w-[2208px]">
        <ManualDbAuthNotice />
      </div>
      <CalendarPlanningPage viewModel={viewModel} />
    </>
  );
}
