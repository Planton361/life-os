import type { Metadata } from "next";
import { TodayMemoryLogPage } from "@/features/today";
import { getTodayViewModel } from "@/features/profile-data";
import { ManualDbAuthNotice } from "@/features/real-data/manual-db-auth-notice";

export const metadata: Metadata = {
  title: "Today | Life OS",
};

export default async function TodayPage() {
  const viewModel = await getTodayViewModel();

  return (
    <>
      <div className="mx-auto mb-3 w-full max-w-[2208px]">
        <ManualDbAuthNotice />
      </div>
      <TodayMemoryLogPage viewModel={viewModel} />
    </>
  );
}
