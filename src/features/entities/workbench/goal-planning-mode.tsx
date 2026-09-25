"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
  type ReactNode,
} from "react";

type GoalPlanningModeValue = {
  open: boolean;
  close: () => void;
  setOpen: (open: boolean) => void;
  trigger: RefObject<HTMLButtonElement | null>;
};

const GoalPlanningModeContext = createContext<GoalPlanningModeValue | null>(
  null,
);

function useGoalPlanningMode() {
  const value = useContext(GoalPlanningModeContext);
  if (!value) throw new Error("Goal planning mode requires its provider.");
  return value;
}

export function GoalPlanningMode({
  initiallyOpen = false,
  className = "",
  children,
}: {
  initiallyOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      close();
    }
  };

  return (
    <GoalPlanningModeContext.Provider value={{ open, close, setOpen, trigger }}>
      <div
        data-goal-outcome="workbench"
        data-goal-read-first="true"
        data-goal-planning-mode={open ? "editing" : "read"}
        className={className}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </GoalPlanningModeContext.Provider>
  );
}

export function GoalPlanningModeToggle() {
  const { open, close, setOpen, trigger } = useGoalPlanningMode();
  return (
    <button
      ref={trigger}
      type="button"
      aria-expanded={open}
      className="min-h-10 rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--accent-cyan)] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
      onClick={() => (open ? close() : setOpen(true))}
    >
      {open ? "Fertig" : "Planung bearbeiten"}
    </button>
  );
}

export function GoalPlanningOnly({
  children,
  when = "open",
  marker,
}: {
  children: ReactNode;
  when?: "open" | "closed";
  marker?: string;
}) {
  const { open } = useGoalPlanningMode();
  const visible = when === "open" ? open : !open;
  return (
    <div hidden={!visible} data-goal-planning-controls={marker ?? when}>
      {children}
    </div>
  );
}
