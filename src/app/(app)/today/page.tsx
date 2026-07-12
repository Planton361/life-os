import type { Metadata } from "next";
import {
  TodayMemoryLogPage,
  type TodayRecurringFeedback,
} from "@/features/today";
import { getTodayViewModel } from "@/features/profile-data";
import { ManualDbAuthNotice } from "@/features/real-data/manual-db-auth-notice";

export const metadata: Metadata = {
  title: "Today | Life OS",
};

type TodaySearchParams = {
  recurringGeneration?: string | string[];
  recurringTemplate?: string | string[];
};

function searchValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function recurringFeedbackFromSearchParams(
  searchParams: TodaySearchParams,
): TodayRecurringFeedback | undefined {
  const generation = searchValue(searchParams.recurringGeneration);
  const template = searchValue(searchParams.recurringTemplate);

  return {
    generation:
      generation === "blocked" ||
      generation === "error" ||
      generation === "generated" ||
      generation === "idle"
        ? generation
        : undefined,
    template:
      template === "activated" ||
      template === "blocked" ||
      template === "created" ||
      template === "error" ||
      template === "paused" ||
      template === "updated"
        ? template
        : undefined,
  };
}

export default async function TodayPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<TodaySearchParams>;
}>) {
  const viewModel = await getTodayViewModel();
  const recurringFeedback = recurringFeedbackFromSearchParams(
    await searchParams,
  );

  return (
    <>
      <div className="mx-auto mb-3 w-full max-w-[2208px]">
        <ManualDbAuthNotice />
      </div>
      <TodayMemoryLogPage
        recurringFeedback={recurringFeedback}
        viewModel={viewModel}
      />
    </>
  );
}
