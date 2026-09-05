"use client";

import {
  useEffect,
  useId,
  useRef,
  type ChangeEventHandler,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export const dashboardInputClass =
  "mt-1 min-h-9 w-full rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.78)] px-3 text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--focus-ring)] disabled:opacity-60";

export const dashboardActionButtonClass =
  "min-h-8 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.78)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

export const dashboardPrimaryButtonClass =
  "min-h-8 rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.18)] px-4 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(95,200,215,.48)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

function dialogBackdropClose(
  event: MouseEvent<HTMLDialogElement>,
  onClose: () => void,
) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}

export function DashboardDialog({
  children,
  labelledBy,
  onClose,
  open,
}: Readonly<{
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
  open: boolean;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <dialog
      aria-labelledby={labelledBy}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-24px)] overflow-y-auto w-[min(620px,calc(100vw-24px))] rounded-[18px] border border-[var(--border-default)] bg-[var(--surface-1)] p-0 text-[var(--text-primary)] shadow-[0_24px_80px_rgba(0,0,0,.52)] backdrop:bg-[rgba(3,7,18,.72)]"
      onCancel={onClose}
      onMouseDown={(event) => dialogBackdropClose(event, onClose)}
      ref={dialogRef}
    >
      {children}
    </dialog>
  );
}

export function FieldLabel({
  label,
  optional,
}: Readonly<{
  label: string;
  optional?: boolean;
}>) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
      {label}
      {optional ? (
        <span className="normal-case tracking-normal text-[var(--text-faint)]">
          {" "}
          optional
        </span>
      ) : null}
    </span>
  );
}

export function TextField({
  defaultValue,
  label,
  name,
  optional,
  placeholder,
  type = "text",
}: Readonly<{
  defaultValue?: string;
  label: string;
  name: string;
  optional?: boolean;
  placeholder?: string;
  type?: "text" | "time" | "number";
}>) {
  const id = useId();

  return (
    <label className="block min-w-0" htmlFor={id}>
      <FieldLabel label={label} optional={optional} />
      <input
        className={dashboardInputClass}
        defaultValue={defaultValue}
        id={id}
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

export function TextAreaField({
  defaultValue,
  label,
  name,
  optional,
  placeholder,
}: Readonly<{
  defaultValue?: string;
  label: string;
  name: string;
  optional?: boolean;
  placeholder?: string;
}>) {
  const id = useId();

  return (
    <label className="block min-w-0" htmlFor={id}>
      <FieldLabel label={label} optional={optional} />
      <textarea
        className={cn(dashboardInputClass, "min-h-[72px] resize-none py-2 leading-5")}
        defaultValue={defaultValue}
        id={id}
        name={name}
        placeholder={placeholder}
        rows={3}
      />
    </label>
  );
}

export function SelectField({
  children,
  defaultValue,
  label,
  name,
  onChange,
}: Readonly<{
  children: ReactNode;
  defaultValue?: string;
  label: string;
  name: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
}>) {
  const id = useId();

  return (
    <label className="block min-w-0" htmlFor={id}>
      <FieldLabel label={label} />
      <select
        className={dashboardInputClass}
        defaultValue={defaultValue}
        id={id}
        name={name}
        onChange={onChange}
      >
        {children}
      </select>
    </label>
  );
}
