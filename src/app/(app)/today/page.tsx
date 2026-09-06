import type { Metadata } from "next";
import { TodayMemoryLogPage } from "@/features/today";
import { getTodayViewModel } from "@/features/profile-data";
import { ManualDbAuthNotice } from "@/features/real-data/manual-db-auth-notice";
export const metadata: Metadata = { title: "Today | Life OS" };
export default async function TodayPage() {
  return (
    <>
      <div className="mx-auto mb-3 w-full max-w-[3200px]">
        <ManualDbAuthNotice />
      </div>
      <TodayMemoryLogPage viewModel={await getTodayViewModel()} />
    </>
  );
}
