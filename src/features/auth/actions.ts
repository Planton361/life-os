"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseAuthActionState } from "./supabase-auth-state";

const authSchema = z.object({
  email: z.string().trim().email(),
  next: z.string().trim().optional(),
  password: z.string().min(6),
});

const signOutSchema = z.object({
  next: z.string().trim().optional(),
});

const dailyCorePaths = [
  "/inbox",
  "/dashboard",
  "/today",
  "/calendar",
  "/portfolio",
  "/settings",
] as const;

function safeNextPath(value: string | undefined, fallback: `/${string}`) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value as `/${string}`;
}

function revalidateDailyCorePaths() {
  for (const path of dailyCorePaths) {
    revalidatePath(path);
  }
}

function isSupabaseAuthCookie(name: string) {
  return (
    (name.startsWith("sb-") && name.includes("-auth-token")) ||
    name === "supabase-auth-token"
  );
}

async function clearSupabaseAuthCookies() {
  const cookieStore = await cookies();

  for (const cookie of cookieStore.getAll()) {
    if (isSupabaseAuthCookie(cookie.name)) {
      cookieStore.set(cookie.name, "", {
        maxAge: 0,
        path: "/",
      });
    }
  }
}

function authErrorState(message: string): SupabaseAuthActionState {
  return {
    message,
    status: "error",
  };
}

export async function signInWithPasswordAction(
  _previousState: SupabaseAuthActionState,
  formData: FormData,
): Promise<SupabaseAuthActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return authErrorState("Nutze eine gültige E-Mail und ein Passwort ab 6 Zeichen.");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase.ok) {
    return authErrorState("Supabase ist lokal noch nicht konfiguriert.");
  }

  const { error } = await supabase.client.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return authErrorState("Anmeldung fehlgeschlagen. Prüfe E-Mail und Passwort.");
  }

  revalidateDailyCorePaths();
  redirect(safeNextPath(parsed.data.next, "/inbox"));
}

export async function signUpWithPasswordAction(
  _previousState: SupabaseAuthActionState,
  formData: FormData,
): Promise<SupabaseAuthActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return authErrorState("Nutze eine gültige E-Mail und ein Passwort ab 6 Zeichen.");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase.ok) {
    return authErrorState("Supabase ist lokal noch nicht konfiguriert.");
  }

  const { data, error } = await supabase.client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return authErrorState("Registrierung fehlgeschlagen. Prüfe die lokalen Auth-Einstellungen.");
  }

  revalidateDailyCorePaths();

  if (data.session) {
    redirect(safeNextPath(parsed.data.next, "/inbox"));
  }

  return {
    message:
      "Registrierung angelegt. Falls E-Mail-Bestätigung aktiv ist, bestätige den lokalen Supabase-Link und melde dich danach an.",
    status: "success",
  };
}

export async function signOutAction(formData: FormData): Promise<void> {
  const parsed = signOutSchema.safeParse({
    next: formData.get("next"),
  });
  const supabase = await createSupabaseServerClient();

  if (supabase.ok) {
    await supabase.client.auth.signOut().catch(() => undefined);
  }

  await clearSupabaseAuthCookies();

  revalidateDailyCorePaths();
  redirect(safeNextPath(parsed.success ? parsed.data.next : undefined, "/settings"));
}

export async function resetSupabaseSessionAction(formData: FormData): Promise<void> {
  const parsed = signOutSchema.safeParse({
    next: formData.get("next"),
  });
  const supabase = await createSupabaseServerClient();

  if (supabase.ok) {
    await supabase.client.auth.signOut().catch(() => undefined);
  }

  await clearSupabaseAuthCookies();

  revalidateDailyCorePaths();
  redirect(safeNextPath(parsed.success ? parsed.data.next : undefined, "/settings"));
}
