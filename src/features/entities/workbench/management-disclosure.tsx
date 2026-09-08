"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const subscribe = () => () => {};

export function ManagementDisclosure({
  label,
  children,
  initiallyOpen = false,
}: {
  label: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
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
        aria-expanded={open}
        aria-controls={id}
        className="min-h-10 text-left text-sm text-[var(--accent-cyan)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
        onClick={() => setOpen(!open)}
      >
        {label}
      </button>
      <div id={id} hidden={!open}>
        <div className="grid min-w-0 gap-4 border-t border-[var(--border-subtle)] pt-3">
          {children}
          <button
            type="button"
            className="min-h-10 justify-self-start text-sm underline"
            onClick={close}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
