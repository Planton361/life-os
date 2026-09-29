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
