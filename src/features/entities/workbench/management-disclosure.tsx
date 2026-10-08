"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const DisclosureClose = createContext<(() => void) | undefined>(undefined);
export function useCloseManagementDisclosure() {
  return useContext(DisclosureClose);
}

const subscribe = () => () => {};

const DisclosureGroup = createContext<{
  active: string | null;
  setActive: (id: string | null) => void;
} | null>(null);

export function ManagementDisclosureGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <DisclosureGroup.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </DisclosureGroup.Provider>
  );
}

export function ManagementDisclosure({
  label,
  children,
  initiallyOpen = false,
  triggerText,
  closeText = "Schließen",
  panelClassName,
  focusFirstOnOpen = false,
  clearSearchParamOnClose,
}: {
  label: string;
  children: ReactNode;
  initiallyOpen?: boolean;
  triggerText?: string;
  closeText?: string;
  panelClassName?: string;
  focusFirstOnOpen?: boolean;
  clearSearchParamOnClose?: string;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [localOpen, setLocalOpen] = useState(initiallyOpen);
  const group = useContext(DisclosureGroup);
  const id = useId();
  const open = group ? group.active === id : localOpen;
  const setGroupActive = group?.setActive;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  function setOpen(value: boolean) {
    if (group) group.setActive(value ? id : null);
    else setLocalOpen(value);
  }
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (initiallyOpen && setGroupActive) setGroupActive(id);
  }, [id, initiallyOpen, setGroupActive]);
  function close() {
    setOpen(false);
    if (clearSearchParamOnClose && searchParams.has(clearSearchParamOnClose)) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(clearSearchParamOnClose);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
    trigger.current?.focus();
  }
  useEffect(() => {
    if (!open || !focusFirstOnOpen) return;
    const frame = window.requestAnimationFrame(() => {
      panel.current
        ?.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusFirstOnOpen, open]);
  return (
    <div
      className="min-w-0"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        disabled={!hydrated}
        aria-label={triggerText ? label : undefined}
        aria-expanded={open}
        aria-controls={id}
        className="min-h-10 text-left text-sm text-[var(--accent-cyan)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
        onClick={() => setOpen(!open)}
      >
        {triggerText ?? label}
      </button>
      <div ref={panel} id={id} hidden={!open} className={panelClassName}>
        <div className="grid min-w-0 gap-4 border-t border-[var(--border-subtle)] pt-3">
          <DisclosureGroup.Provider value={null}>
            <DisclosureClose.Provider value={close}>
              {children}
            </DisclosureClose.Provider>
          </DisclosureGroup.Provider>
          <button
            type="button"
            className="min-h-10 justify-self-start text-sm underline"
            onClick={close}
          >
            {closeText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ManagementDialog({
  label,
  children,
  triggerText,
  closeText = "Schließen",
  panelClassName = "",
  focusFirstOnOpen = true,
  initiallyOpen = false,
  clearSearchParamOnClose,
  resetOnClose = false,
  triggerClassName,
}: {
  label: string;
  children: ReactNode;
  triggerText?: string;
  closeText?: string;
  panelClassName?: string;
  focusFirstOnOpen?: boolean;
  initiallyOpen?: boolean;
  clearSearchParamOnClose?: string;
  resetOnClose?: boolean;
  triggerClassName?: string;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(initiallyOpen);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogId = useId();
  const headingId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      if (focusFirstOnOpen) {
        const frame = window.requestAnimationFrame(() => {
          const first =
            element.querySelector<HTMLElement>(
              'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
            ) ??
            element.querySelector<HTMLElement>(
              'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );
          first?.focus();
        });
        return () => window.cancelAnimationFrame(frame);
      }
    } else if (!open && element.open) {
      element.close();
    }
  }, [focusFirstOnOpen, open]);

  function close() {
    setOpen(false);
    dialog.current?.close();
    if (clearSearchParamOnClose && searchParams.has(clearSearchParamOnClose)) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(clearSearchParamOnClose);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
    trigger.current?.focus();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        disabled={!hydrated}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        className={
          triggerClassName ??
          "min-h-10 text-left text-sm text-[var(--accent-cyan)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
        }
        onClick={() => setOpen(true)}
      >
        {triggerText ?? label}
      </button>
      <dialog
        ref={dialog}
        id={dialogId}
        aria-labelledby={headingId}
        className={`w-[min(48rem,calc(100vw-2rem))] max-h-[min(84dvh,56rem)] overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/60 ${panelClassName}`}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
            ),
          ).filter((element) => element.getClientRects().length > 0);
          const first = items[0];
          const last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
      >
        <div className="grid gap-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
            <h2 id={headingId} className="text-lg font-semibold">
              {label}
            </h2>
            <button
              type="button"
              aria-label={closeText}
              className="min-h-10 shrink-0 text-sm text-[var(--text-secondary)] underline"
              onClick={close}
            >
              {closeText}
            </button>
          </div>
          <DisclosureClose.Provider value={close}>
            <DisclosureGroup.Provider value={null}>
              {(!resetOnClose || open) && children}
            </DisclosureGroup.Provider>
          </DisclosureClose.Provider>
        </div>
      </dialog>
    </>
  );
}
