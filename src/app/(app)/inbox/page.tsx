import type { Metadata } from "next";
import { InboxPage as InboxWorkbenchPage } from "@/components/inbox/inbox-page";
import { getInboxViewModel } from "@/features/inbox";

export const metadata: Metadata = {
  title: "Inbox | Life OS",
};

export default function InboxPage() {
  const viewModel = getInboxViewModel();

  return <InboxWorkbenchPage viewModel={viewModel} />;
}
