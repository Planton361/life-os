import { describe, expect, it } from "vitest";
import { taskGuidance } from "./task-guidance";

const taskId = "74bc20da-ab8f-4ca2-9e1f-52f113eff49c";
const base = {
  taskId,
  status: "planned",
  archived: false,
  availability: "READY" as const,
  blockerCount: 0,
  plannedDate: null,
  scheduledDate: null,
  today: "2026-09-28",
  returnHref: "/projects/project-id",
  returnLabel: "Project öffnen",
};

describe("task guidance", () => {
  it("routes a minimal Inbox Task to progressive editing", () => {
    expect(taskGuidance({ ...base, status: "inbox" })).toMatchObject({
      label: "Einordnen",
      href: `/tasks/${taskId}?edit=1`,
    });
  });

  it("routes blocked work to the concrete dependency context", () => {
    expect(
      taskGuidance({ ...base, availability: "BLOCKED", blockerCount: 2 }),
    ).toMatchObject({
      action: "anchor",
      href: "#task-dependencies",
      label: "Blocker prüfen",
    });
  });

  it("lets active work continue in the work-content section", () => {
    expect(taskGuidance({ ...base, status: "active" })).toMatchObject({
      action: "anchor",
      href: "#task-work-content",
      label: "Arbeit fortsetzen",
    });
  });

  it("opens an existing scheduled Task in Calendar Week view", () => {
    expect(
      taskGuidance({ ...base, scheduledDate: "2026-10-03" }),
    ).toMatchObject({
      href: `/calendar?task=${taskId}&date=2026-10-03&view=week`,
      label: "Geplanten Termin öffnen",
    });
  });

  it("plans a READY unscheduled Task in Calendar Week view on its planned day", () => {
    expect(taskGuidance({ ...base, plannedDate: "2026-10-01" })).toMatchObject({
      href: `/calendar?task=${taskId}&date=2026-10-01&view=week`,
      label: "Im Calendar planen",
    });
  });

  it("uses today when a READY Task has no planned day", () => {
    expect(taskGuidance(base).href).toBe(
      `/calendar?task=${taskId}&date=2026-09-28&view=week`,
    );
  });

  it("does not confuse the waiting lifecycle with dependency blocking", () => {
    expect(taskGuidance({ ...base, status: "waiting" })).toMatchObject({
      href: `/tasks/${taskId}?edit=1`,
      label: "Warte-Status einordnen",
    });
  });

  it("returns completed or archived work to its higher-order context", () => {
    expect(taskGuidance({ ...base, status: "done" })).toMatchObject({
      href: "/projects/project-id",
      label: "Project öffnen",
    });
    expect(taskGuidance({ ...base, archived: true })).toMatchObject({
      href: "/projects/project-id",
      label: "Project öffnen",
    });
  });
});
