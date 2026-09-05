"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useToast } from "@/components/feedback/toast-provider";

const feedbackMessages: Record<string, string> = {
  "habit:saved": "Habit gespeichert.",
  "habit:error": "Die Habit-Aktion konnte nicht gespeichert werden.",
  "habit:blocked": "Habit-Tracking benötigt eine aktive Manual-Session.",
  "health:saved": "Mood gespeichert.",
  "health:error": "Der Mood-Eintrag konnte nicht gespeichert werden.",
  "health:blocked": "Mood benötigt eine aktive Manual-Session.",
};

/** Turns redirect-based Dashboard writes into the shared feedback standard. */
export function DashboardFeedbackBridge() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { notify } = useToast();
  const delivered = useRef<string | null>(null);
  const habit = searchParams.get("habit");
  const health = searchParams.get("health");
  const key = habit ? `habit:${habit}` : health ? `health:${health}` : null;

  useEffect(() => {
    if (!key) {
      delivered.current = null;
      return;
    }
    if (delivered.current === key) return;
    delivered.current = key;
    const message = feedbackMessages[key];
    if (!message) return;
    notify(message, key.endsWith(":saved") ? "success" : "error");
    const params = new URLSearchParams(searchParams.toString());
    for (const name of ["habit", "habitUpdate", "health", "healthUpdate"])
      params.delete(name);
    window.history.replaceState(null, "", params.size ? `${pathname}?${params}` : pathname);
  }, [key, notify, pathname, searchParams]);

  return null;
}
