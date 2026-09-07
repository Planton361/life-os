"use client";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/feedback/toast-provider";
/** Project existing Server Action feedback through the app's shared toast. */
export function HealthFeedback({
  state,
  message,
}: {
  state?: string;
  message: string;
}) {
  const { notify } = useToast();
  const version = useSearchParams().toString();
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (state && shown.current !== version) {
      shown.current = version;
      notify(message, state === "saved" ? "success" : "error");
    }
  }, [state, message, version, notify]);
  if (!state) return null;
  return (
    <p
      className="text-sm text-[var(--text-secondary)]"
      role={state === "saved" ? "status" : "alert"}
    >
      {message}
    </p>
  );
}
