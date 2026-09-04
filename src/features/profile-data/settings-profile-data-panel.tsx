import { selectLifeOsProfileAction } from "./actions";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { getCurrentLifeOsProfileId, lifeOsProfiles } from "./profile-cookie";

const accent = "var(--accent-cyan)";
const panelClass =
  "min-w-0 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]";
const panelHeaderClass =
  "border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.78)] px-4 py-3 sm:px-5";
const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";
const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_36%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,rgba(18,28,43,.88))] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[color-mix(in_srgb,var(--accent)_54%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

function Panel({
  children,
  subtitle,
  title,
}: Readonly<{
  children: ReactNode;
  subtitle?: string;
  title: string;
}>) {
  return (
    <section className={panelClass}>
      <div className={panelHeaderClass}>
        <h2 className="text-[18px] font-semibold leading-6 text-[var(--text-primary)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export async function ProfileDataSettingsPanel() {
  const profileId = await getCurrentLifeOsProfileId();
  const activeProfile = lifeOsProfiles.find((profile) => profile.id === profileId);

  return (
    <div
      className="mx-auto mt-3 flex w-full max-w-[2208px] flex-col gap-3 pb-8"
      style={{ "--accent": accent } as CSSProperties}
    >
      <Panel
        subtitle="Cookie-based mode switch. Manual reads and writes use the authenticated canonical Target; Demo stays separate."
        title="Profile Data Source"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-2 sm:grid-cols-3">
            {lifeOsProfiles.map((profile) => {
              const active = profile.id === profileId;

              return (
                <form action={selectLifeOsProfileAction} key={profile.id}>
                  <input name="profileId" type="hidden" value={profile.id} />
                  <button
                    aria-pressed={active}
                    className={
                      active
                        ? primaryButtonClass
                        : `${buttonClass} w-full justify-start`
                    }
                    type="submit"
                  >
                    {profile.label}
                  </button>
                  <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
                    {profile.description}
                  </p>
                </form>
              );
            })}
          </div>

          <dl className="grid gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3 text-xs">
            <div>
              <dt className={labelClass}>Active</dt>
              <dd className="mt-1 text-[var(--text-secondary)]">
                {activeProfile?.label ?? profileId}
              </dd>
              <dd className="mt-1 text-[10px] font-semibold text-[var(--accent-cyan)]">
                Aktives Profil: {profileId}
              </dd>
            </div>
            <div>
              <dt className={labelClass}>Manual boundary</dt>
              <dd className="mt-1 text-[var(--text-secondary)]">
                Keine Legacy-Counts oder lokalen Testdaten als Manual-Quelle.
              </dd>
            </div>
          </dl>
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          subtitle="Echte Writes beginnen in ihrer zuständigen kanonischen Arbeitsfläche und bleiben nach Reload sichtbar."
          title="Canonical Manual Writes"
        >
          <div className="flex flex-wrap gap-2">
            <Link className={primaryButtonClass} href="/inbox">
              Inbox öffnen
            </Link>
            <Link className={buttonClass} href="/portfolio?view=tasks">
              Tasks öffnen
            </Link>
            <Link className={buttonClass} href="/portfolio?view=projects">
              Projects öffnen
            </Link>
            <Link className={buttonClass} href="/portfolio?view=goals">
              Goals öffnen
            </Link>
          </div>
        </Panel>

        <Panel
          subtitle="Frühere lokale Testdaten-Writer und deren Reset sind außerhalb des aktiven Produkts und absichtlich nicht bedienbar."
          title="Legacy Local Profile"
        >
          <p className="text-[11px] leading-5 text-[var(--text-muted)]">
            Prepared / unavailable. Diese Seite schreibt keine lokale Ersatzwahrheit und löscht keine lokalen Daten.
          </p>
        </Panel>
      </div>
    </div>
  );
}
