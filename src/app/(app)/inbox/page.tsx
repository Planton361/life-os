import type { Metadata } from "next";
import { InboxPage as InboxWorkbenchPage } from "@/components/inbox/inbox-page";
import { getInboxViewModel } from "@/features/profile-data";
import { ManualDbAuthNotice } from "@/features/real-data/manual-db-auth-notice";

export const metadata: Metadata = {
  title: "Inbox | Life OS",
};

export default async function InboxPage() {
  const viewModel = await getInboxViewModel();

  return (
    <>
      <div className="mx-auto mb-3 w-full max-w-[2208px]">
        <ManualDbAuthNotice />
      </div>
      <InboxWorkbenchPage viewModel={viewModel} />
    </>
  );
}
