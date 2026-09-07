"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { secondaryButtonClass } from "./meal-planner/meal-planner-primitives";
export function NutritionDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      queueMicrotask(() => {
        if (previous instanceof HTMLElement && previous.isConnected)
          previous.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className="nutrition-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-3 p-3">
        <h2 className="font-semibold">{title}</h2>
        <button className={secondaryButtonClass} onClick={onClose}>
          Schließen
        </button>
      </div>
      {children}
    </dialog>
  );
}
