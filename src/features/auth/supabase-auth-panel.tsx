import type { CSSProperties } from "react";
import { signOutAction } from "./actions";
import { SupabaseAuthForm } from "./supabase-auth-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const accent = "var(--accent-cyan)";
const panelClass =
  "min-w-0 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]";
const panelHeaderClass =
  "border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.78)] px-4 py-3 sm:px-5";
const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

export async function SupabaseAuthPanel() {
  const supabase = await createSupabaseServerClient();
  const session =
    supabase.ok ? await supabase.client.auth.getUser() : { data: { user: null } };
  const user = session.data.user;

  return (
    <section
      aria-labelledby="supabase-session-heading"
      className={panelClass}
      id="supabase-session"
      style={{ "--accent": accent } as CSSProperties}
    >
      <div className={panelHeaderClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              className="text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
              id="supabase-session-heading"
            >
              Supabase Session
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
              Manual Profile bleibt aktiv, aber DB-backed Inbox und Tasks brauchen eine echte Supabase Auth Session.
            </p>
          </div>
          <span className="inline-flex min-h-7 items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
            {user ? "signed in" : "signed out"}
          </span>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:p-5">
        <dl className="grid gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3 text-xs sm:grid-cols-2">
          <div>
            <dt className={labelClass}>Status</dt>
            <dd className="mt-1 text-[var(--text-secondary)]">
              {user ? "Signed in" : "Signed out"}
            </dd>
          </div>
          <div>
            <dt className={labelClass}>Email</dt>
            <dd className="mt-1 text-[var(--text-secondary)]">
              {user?.email ?? "Keine Supabase Session"}
            </dd>
          </div>
        </dl>

        {supabase.ok ? (
          user ? (
            <form action={signOutAction}>
              <input name="next" type="hidden" value="/settings" />
              <button className={buttonClass} type="submit">
                Sign out
              </button>
            </form>
          ) : (
            <SupabaseAuthForm next="/inbox" />
          )
        ) : (
          <p className="rounded-[12px] border border-[rgba(221,107,95,.26)] bg-[rgba(221,107,95,.08)] px-3 py-2 text-[11px] font-semibold text-[var(--accent-red)]">
            Supabase ist lokal noch nicht konfiguriert. Setze NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY oder NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        )}
      </div>
    </section>
  );
}
