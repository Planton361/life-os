"use client";
import { useEffect, useState, type ReactNode } from "react";

// One document retains its rendered epoch across client navigation. Only an
// explicit reload replaces it. Missing transport admission fails closed server
// side, including progressive/native submissions without JavaScript.
export function PreviewEpochTransport({
  epoch,
  children,
  staleNotice = false,
}: {
  epoch: string;
  children: ReactNode;
  staleNotice?: boolean;
}) {
  const [renderedEpoch] = useState(epoch);
  const [stale, setStale] = useState(staleNotice);
  useEffect(() => {
    function stamp(form: HTMLFormElement) {
      let input = form.querySelector<HTMLInputElement>(
        'input[name="__life_dataset_epoch"]',
      );
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = "__life_dataset_epoch";
        form.append(input);
      }
      if (input.value !== renderedEpoch) input.value = renderedEpoch;
    }
    const stampForms = () => document.querySelectorAll("form").forEach(stamp);
    stampForms();
    const observer = new MutationObserver(stampForms);
    observer.observe(document.body, { childList: true, subtree: true });
    const onSubmit = (event: Event) => {
      if (event.target instanceof HTMLFormElement) stamp(event.target);
    };
    document.addEventListener("submit", onSubmit, true);
    const original = window.fetch;
    let disposed = false;
    async function changed() {
      try {
        const result = await original("/api/preview/epoch", {
          cache: "no-store",
        });
        if (!result.ok) return true;
        const state = (await result.json()) as { epoch?: string };
        return state.epoch !== renderedEpoch;
      } catch {
        return true;
      }
    }
    async function check() {
      if ((await changed()) && !disposed) setStale(true);
    }
    const timer = window.setInterval(check, 15000);
    window.addEventListener("focus", check);
    const boundFetch: typeof fetch = async (input, init) => {
      const requestHeaders = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      const target = new URL(
        input instanceof Request ? input.url : String(input),
        location.href,
      );
      if (
        target.origin === location.origin &&
        requestHeaders.has("next-action")
      ) {
        requestHeaders.set("x-life-dataset-epoch", renderedEpoch);
        return original(input, { ...init, headers: requestHeaders }).finally(
          check,
        );
      }
      return original(input, init);
    };
    window.fetch = boundFetch;
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("submit", onSubmit, true);
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      if (window.fetch === boundFetch) window.fetch = original;
    };
  }, [renderedEpoch]);
  return (
    <>
      {stale && (
        <aside
          role="alert"
          className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-xl rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 text-sm text-[var(--text-primary)]"
        >
          Die Testdaten oder Preview-Berechtigung haben sich geändert. Bitte neu
          laden, bevor du Änderungen speicherst.
          <button
            type="button"
            className="ml-3 min-h-11 underline"
            onClick={reloadPreviewDataset}
          >
            Neu laden
          </button>
        </aside>
      )}
      {children}
    </>
  );
}

export function reloadPreviewDataset() {
  document.cookie =
    "life-preview-stale=; Max-Age=0; Path=/; Secure; SameSite=Strict";
  window.location.reload();
}
