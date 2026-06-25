import Link from "next/link";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

const noticeClass =
  "rounded-[14px] border border-[rgba(216,180,90,.24)] bg-[rgba(216,180,90,.07)] px-3 py-3 text-[11px] leading-5 text-[var(--text-secondary)]";
const actionClass =
  "inline-flex min-h-8 items-center rounded-full border border-[rgba(216,180,90,.28)] bg-[rgba(216,180,90,.10)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(216,180,90,.44)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

export async function getManualDbAuthNotice() {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return null;
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (auth.ok) {
    return null;
  }

  return {
    body:
      auth.error === "missing_env"
        ? "Supabase ist lokal noch nicht konfiguriert. DB-backed Inbox und Tasks können deshalb nicht geladen werden."
        : "Manual Profile ist aktiv, aber Supabase Auth fehlt. DB-backed Inbox und Tasks sind deshalb nicht verfügbar.",
    title: "Manual DB benötigt Supabase Anmeldung",
  };
}

export async function ManualDbAuthNotice() {
  const notice = await getManualDbAuthNotice();

  if (!notice) {
    return null;
  }

  return (
    <aside aria-label="Manual DB Auth Status" className={noticeClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text-primary)]">{notice.title}</p>
          <p className="mt-1 text-[var(--text-muted)]">
            {notice.body} Melde dich an, um lokale DB-backed Tasks zu laden.
          </p>
        </div>
        <Link className={actionClass} href="/settings#supabase-session">
          Supabase anmelden
        </Link>
      </div>
    </aside>
  );
}
