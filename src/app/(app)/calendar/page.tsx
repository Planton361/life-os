import { CalendarPlanningPage } from "@/features/calendar";
import { getCalendarViewModel } from "@/features/profile-data";

export const metadata = {
  title: "Calendar | Life OS",
  description:
    "Temporal planning surface for projected events, tasks, deadlines and reviews.",
};

export default async function CalendarPage() {
  const viewModel = await getCalendarViewModel();

  return <CalendarPlanningPage viewModel={viewModel} />;
}
