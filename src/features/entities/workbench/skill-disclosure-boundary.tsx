"use client";
import { useEffect, type ReactNode } from "react";

// Native disclosures preserve server-rendered reads. Escape and local depth
// links keep keyboard focus at the control that opened the content.
function revealHash(hash: string) {
  const element = document.getElementById(hash.slice(1));
  const details = element?.querySelector("details");
  if (details) {
    details.open = true;
    details.querySelector("summary")?.focus();
  }
}

export function SkillDisclosureBoundary({ children }: { children: ReactNode }) {
  useEffect(() => {
    function reveal() {
      revealHash(window.location.hash);
    }
    window.addEventListener("hashchange", reveal);
    reveal();
    return () => window.removeEventListener("hashchange", reveal);
  }, []);
  return (
    <div
      className="min-w-0"
      onClick={(event) => {
        const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
          'a[href^="#"]',
        );
        if (anchor) revealHash(anchor.getAttribute("href")!);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        const details = (event.target as HTMLElement).closest("details[open]");
        if (details instanceof HTMLDetailsElement) {
          event.stopPropagation();
          details.open = false;
          details.querySelector("summary")?.focus();
        }
      }}
    >
      {children}
    </div>
  );
}
