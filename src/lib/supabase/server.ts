import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import type { SupabaseClientLike } from "@/features/real-data/supabase";

type SupabaseServerConfig =
  | {
      ok: true;
      publishableKey: string;
      url: string;
    }
  | {
      ok: false;
      reason: "missing_env";
    };

export type AuthenticatedSupabaseServerClient =
  | {
      client: SupabaseClientLike;
      ok: true;
      user: User;
    }
  | {
      error: SupabaseServerAuthError;
      ok: false;
    };

export type SupabaseServerAuthError =
  | "auth_error"
  | "invalid_session"
  | "missing_env"
  | "unauthenticated";

function getSupabaseServerConfig(): SupabaseServerConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    return {
      ok: false,
      reason: "missing_env",
    };
  }

  return {
    ok: true,
    publishableKey,
    url,
  };
}

export async function createSupabaseServerClient() {
  const config = getSupabaseServerConfig();

  if (!config.ok) {
    return config;
  }

  const cookieStore = await cookies();

  return {
    client: createServerClient<Database>(config.url, config.publishableKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, options, value }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies; Server Actions can.
          }
        },
      },
    }),
    ok: true as const,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export function getSupabaseServerAuthError(error: unknown): SupabaseServerAuthError {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found")
  ) {
    return "invalid_session";
  }

  if (error) {
    return "auth_error";
  }

  return "unauthenticated";
}

export async function createAuthenticatedSupabaseServerClient(): Promise<AuthenticatedSupabaseServerClient> {
  const supabase = await createSupabaseServerClient();

  if (!supabase.ok) {
    return {
      error: "missing_env",
      ok: false,
    };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.client.auth.getUser();

    if (error || !user) {
      return {
        error: getSupabaseServerAuthError(error),
        ok: false,
      };
    }

    return {
      client: supabase.client,
      ok: true,
      user,
    };
  } catch (error) {
    return {
      error: getSupabaseServerAuthError(error),
      ok: false,
    };
  }
}
