"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./task-read-view.module.css";

export function TaskObjectMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (
        !root.current?.contains(event.target as Node) &&
        !root.current?.querySelector("dialog[open]")
      )
        setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      ref={root}
      className={styles.menu}
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          !root.current?.querySelector("dialog[open]")
        ) {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        className={styles.quietSmall}
        onClick={() => setOpen(!open)}
      >
        Mehr ···
      </button>
      <div
        id={id}
        role="group"
        aria-label={label}
        data-open={open}
        className={styles.menuPanel}
      >
        {children}
      </div>
    </div>
  );
}
