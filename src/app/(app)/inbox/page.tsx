import type { Metadata } from "next";
import { InboxPage as InboxWorkbenchPage } from "@/components/inbox/inbox-page";
import { getInboxViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Inbox | Life OS",
};

export default async function InboxPage() {
  const viewModel = await getInboxViewModel();

  return <InboxWorkbenchPage viewModel={viewModel} />;
}
