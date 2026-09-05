"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info";

type ToastNotice = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [notices, setNotices] = useState<readonly ToastNotice[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setNotices((current) => [...current, { id, message, tone }]);
    if (tone !== "error") {
      timers.current.set(id, setTimeout(() => dismiss(id), 5_000));
    }
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-atomic="false"
        aria-label="Benachrichtigungen"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      >
        {notices.map((notice) => (
          <div
            aria-live={notice.tone === "error" ? "assertive" : "polite"}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-[14px] border bg-[var(--surface-2)] px-4 py-3 text-sm shadow-[0_14px_36px_rgba(0,0,0,.32)]",
              notice.tone === "success" && "border-[rgba(66,184,131,.42)]",
              notice.tone === "info" && "border-[rgba(95,200,215,.42)]",
              notice.tone === "error" && "border-[rgba(221,107,95,.48)]",
            )}
            key={notice.id}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            <p className="min-w-0 flex-1 font-medium text-[var(--text-primary)]">
              {notice.message}
            </p>
            <button
              aria-label="Benachrichtigung schließen"
              className="rounded p-0.5 text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
              onClick={() => dismiss(notice.id)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
