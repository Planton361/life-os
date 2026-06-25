"use client";

import { useActionState } from "react";
import {
  signInWithPasswordAction,
  signUpWithPasswordAction,
} from "./actions";
import { initialSupabaseAuthActionState } from "./supabase-auth-state";

const inputClass =
  "mt-1 min-h-11 w-full rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.66)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)]";
const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]";
const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_36%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,rgba(18,28,43,.88))] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[color-mix(in_srgb,var(--accent)_54%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

function AuthMessage({
  message,
  status,
}: Readonly<{
  message: string;
  status: "idle" | "error" | "success";
}>) {
  if (!message) return null;

  return (
    <p
      className={
        status === "success"
          ? "rounded-[12px] border border-[rgba(66,184,131,.24)] bg-[rgba(66,184,131,.08)] px-3 py-2 text-[11px] font-semibold text-[var(--accent-green)]"
          : "rounded-[12px] border border-[rgba(221,107,95,.26)] bg-[rgba(221,107,95,.08)] px-3 py-2 text-[11px] font-semibold text-[var(--accent-red)]"
      }
      role="status"
    >
      {message}
    </p>
  );
}

export function SupabaseAuthForm({
  next = "/inbox",
}: Readonly<{
  next?: `/${string}`;
}>) {
  const [signInState, signInFormAction, signInPending] = useActionState(
    signInWithPasswordAction,
    initialSupabaseAuthActionState,
  );
  const [signUpState, signUpFormAction, signUpPending] = useActionState(
    signUpWithPasswordAction,
    initialSupabaseAuthActionState,
  );
  const pending = signInPending || signUpPending;

  return (
    <div className="grid gap-3">
      <form action={signInFormAction} className="grid gap-3 sm:grid-cols-2">
        <input name="next" type="hidden" value={next} />
        <label>
          <span className={labelClass}>Email</span>
          <input
            autoComplete="email"
            className={inputClass}
            name="email"
            placeholder="anton@example.local"
            required
            type="email"
          />
        </label>
        <label>
          <span className={labelClass}>Password</span>
          <input
            autoComplete="current-password"
            className={inputClass}
            minLength={6}
            name="password"
            required
            type="password"
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button className={primaryButtonClass} disabled={pending} type="submit">
            {signInPending ? "Signing in..." : "Sign in"}
          </button>
          <button
            className={buttonClass}
            disabled={pending}
            formAction={signUpFormAction}
            type="submit"
          >
            {signUpPending ? "Signing up..." : "Sign up"}
          </button>
        </div>
      </form>
      <AuthMessage message={signInState.message} status={signInState.status} />
      <AuthMessage message={signUpState.message} status={signUpState.status} />
    </div>
  );
}
