import type { CSSProperties } from "react";
import { resetSupabaseSessionAction, signOutAction } from "./actions";
import { SupabaseAuthForm } from "./supabase-auth-form";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

const accent = "var(--accent-cyan)";
const panelClass =
  "min-w-0 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]";
const panelHeaderClass =
  "border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.78)] px-4 py-3 sm:px-5";
const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

function statusLabel(auth: Awaited<ReturnType<typeof createAuthenticatedSupabaseServerClient>>) {
  if (auth.ok) return "signed in";
  if (auth.error === "invalid_session") return "invalid session";
  if (auth.error === "auth_error") return "auth error";

  return "signed out";
}

function statusDescription(
  auth: Awaited<ReturnType<typeof createAuthenticatedSupabaseServerClient>>,
) {
  if (auth.ok) return "Signed in";
  if (auth.error === "missing_env") return "Missing local Supabase env";
  if (auth.error === "invalid_session") return "Invalid refresh token";
  if (auth.error === "auth_error") return "Supabase Auth konnte die Session nicht prüfen.";

  return "Signed out";
}

export async function SupabaseAuthPanel() {
  const auth = await createAuthenticatedSupabaseServerClient();
  const user = auth.ok ? auth.user : null;
  const canUseAuth = auth.ok || auth.error !== "missing_env";
  const needsSessionReset =
    !auth.ok && (auth.error === "invalid_session" || auth.error === "auth_error");

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
            {statusLabel(auth)}
          </span>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:p-5">
        <dl className="grid gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-3 text-xs sm:grid-cols-2">
          <div>
            <dt className={labelClass}>Status</dt>
            <dd className="mt-1 text-[var(--text-secondary)]">
              {statusDescription(auth)}
            </dd>
          </div>
          <div>
            <dt className={labelClass}>Email</dt>
            <dd className="mt-1 text-[var(--text-secondary)]">
              {user?.email ?? "Keine Supabase Session"}
            </dd>
          </div>
        </dl>

        {canUseAuth ? (
          user ? (
            <form action={signOutAction}>
              <input name="next" type="hidden" value="/settings" />
              <button className={buttonClass} type="submit">
                Sign out
              </button>
            </form>
          ) : (
            <div className="grid gap-3">
              {needsSessionReset ? (
                <form action={resetSupabaseSessionAction}>
                  <input name="next" type="hidden" value="/settings#supabase-session" />
                  <button className={buttonClass} type="submit">
                    Session zurücksetzen
                  </button>
                </form>
              ) : null}
              <SupabaseAuthForm next="/inbox" />
            </div>
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
