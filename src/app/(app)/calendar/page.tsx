import { CalendarPlanningPage, getCalendarViewModel } from "@/features/calendar";

export const metadata = {
  title: "Calendar | Life OS",
  description:
    "Temporal planning surface for projected events, tasks, deadlines and reviews.",
};

export default function CalendarPage() {
  const viewModel = getCalendarViewModel();

  return <CalendarPlanningPage viewModel={viewModel} />;
}
