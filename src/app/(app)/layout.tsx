import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { authenticatedPreviewRuntime } from "@/features/real-data/runtime/application-context";
import { PreviewEpochTransport } from "@/features/real-data/preview-reset/epoch-transport";

export default async function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const preview =
    (await getCurrentLifeOsProfileId()) === "manual"
      ? await authenticatedPreviewRuntime()
      : null;
  const shell = <AppShell>{children}</AppShell>;
  return preview ? (
    <PreviewEpochTransport
      epoch={preview.store.datasetState(preview.owner).epoch}
      staleNotice={(await cookies()).get("life-preview-stale")?.value === "1"}
    >
      {shell}
    </PreviewEpochTransport>
  ) : (
    shell
  );
}
