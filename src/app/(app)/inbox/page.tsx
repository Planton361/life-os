import type { Metadata } from "next";
import { InboxPage as InboxWorkbenchPage } from "@/components/inbox/inbox-page";
import { getInboxViewModel } from "@/features/profile-data";
import { ManualDbAuthNotice } from "@/features/real-data/manual-db-auth-notice";

export const metadata: Metadata = {
  title: "Inbox | Life OS",
};

type InboxSearchParams = {
  item?: string | string[];
};

function searchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InboxPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<InboxSearchParams>;
}>) {
  const params = await searchParams;
  const viewModel = await getInboxViewModel({
    selectedInboxItemId: searchValue(params.item),
  });

  return (
    <>
      <div className="mx-auto mb-3 w-full max-w-[2208px]">
        <ManualDbAuthNotice />
      </div>
      <InboxWorkbenchPage viewModel={viewModel} />
    </>
  );
}
