import Link from "next/link";
import {
  EmptyState,
  PageHeader,
  Pill,
  RoutePage,
  SectionPanel,
} from "@/components/layout/route-page-primitives";
import type { LifeOsProfileSummary } from "./types";

export function ProfileBoundaryPage({
  profile,
  title,
  areaLabel,
  connected = false,
}: Readonly<{
  profile: LifeOsProfileSummary;
  title: string;
  areaLabel: string;
  connected?: boolean;
}>) {
  const manualCopy =
    profile.id === "manual"
      ? "Dieser Bereich ist im Manual-Profil noch nicht verbunden."
      : "Noch keine Daten in diesem Profil.";

  return (
    <RoutePage>
      <PageHeader
        eyebrow="Profile boundary"
        summary={`${areaLabel} zeigt Design-Fixtures nur im Demo Profile. In ${profile.label} werden keine Demo-Listen gerendert.`}
        title={title}
      />

      <SectionPanel
        subtitle="R1.1 verhindert, dass Demo-Fixtures außerhalb des Demo-Profils in normal erreichbaren App-Seiten erscheinen."
        title="Profile Data Source"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Pill accent="var(--accent-cyan)">Aktives Profil: {profile.id}</Pill>
          <Pill quiet>{connected ? "Connected" : "Not wired"}</Pill>
        </div>
        <div className="mt-4">
          <EmptyState
            description={
              connected
                ? "Die Route liest bereits aus der Profile-Schicht. Es sind nur noch keine lokalen Einträge vorhanden."
                : manualCopy
            }
            title="Keine Demo-Daten sichtbar"
          />
        </div>
        <Link
          className="mt-4 inline-flex min-h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.06)] px-3 text-xs font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          href="/settings"
        >
          Profile in Settings wechseln
        </Link>
      </SectionPanel>
    </RoutePage>
  );
}
