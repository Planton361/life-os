import { describe, expect, it } from "vitest";
import { taskStepProgress } from "./task-step-progress";
import {
  taskStepCreateSchema,
  taskStepUpdateSchema,
} from "../../real-data/schemas/task-step.schemas";
import { updateProjectInputSchema } from "../../real-data/schemas/project.schemas";
import { updateGoalInputSchema } from "../../real-data/schemas/goal.schemas";
import { skillUpdateInputSchema } from "../../real-data/schemas/skill.schema";
describe("canonical task step progress", () => {
  it("derives progress from active steps and excludes archived work", () =>
    expect(
      taskStepProgress([
        { archived_at: null, completed_at: "2026-09-06" },
        { archived_at: null, completed_at: null },
        { archived_at: "2026-09-06", completed_at: "2026-09-06" },
      ]),
    ).toEqual({ total: 2, completed: 1, percent: 50 }));
  it("does not invent a percent without steps", () =>
    expect(taskStepProgress([])).toEqual({
      total: 0,
      completed: 0,
      percent: null,
    }));
  it("supports completing and reopening without changing parent lifecycle", () => {
    expect(
      taskStepProgress([{ archived_at: null, completed_at: "now" }]).percent,
    ).toBe(100);
    expect(
      taskStepProgress([{ archived_at: null, completed_at: null }]).percent,
    ).toBe(0);
  });
  it("validates IDs, nonblank titles, stable order and explicit completion", () => {
    const input = {
      taskId: "74bc20da-ab8f-4ca2-9e1f-52f113eff49c",
      title: "Read",
      position: 2,
    };
    expect(taskStepCreateSchema.safeParse(input).success).toBe(true);
    for (const patch of [
      { title: " " },
      { taskId: "foreign text" },
      { position: -1 },
    ])
      expect(
        taskStepCreateSchema.safeParse({ ...input, ...patch }).success,
      ).toBe(false);
    expect(
      taskStepUpdateSchema.safeParse({
        ...input,
        stepId: input.taskId,
        completed: "false",
      }).success,
    ).toBe(false);
  });
});
it("optional detail fields can be explicitly cleared without erasing omitted fields", () => {
  const scope = { userId: "user", profileId: "user" };
  expect(
    updateProjectInputSchema.parse({
      ...scope,
      projectId: "project",
      description: null,
      nextStep: null,
    }),
  ).toMatchObject({ description: null, nextStep: null });
  expect(
    updateGoalInputSchema.parse({
      ...scope,
      goalId: "goal",
      why: null,
      description: null,
    }),
  ).toMatchObject({ why: null, description: null });
  expect(
    skillUpdateInputSchema.parse({
      skillId: "74bc20da-ab8f-4ca2-9e1f-52f113eff49c",
      summary: null,
      category: null,
    }),
  ).toMatchObject({ summary: null, category: null });
  expect(
    updateProjectInputSchema.parse({ ...scope, projectId: "project" }),
  ).not.toHaveProperty("description");
});

import { taskTextFields } from "./task-text";
it("preserves task context and next action, including a cleared context", () => {
  expect(taskTextFields("Nächste Aktion: Read source")).toEqual({
    description: "",
    nextAction: "Read source",
  });
  expect(
    taskTextFields("Context\n\nNächste Aktion: Read\nThen decide"),
  ).toEqual({ description: "Context", nextAction: "Read\nThen decide" });
  expect(taskTextFields("Untouched original text")).toEqual({
    description: "Untouched original text",
    nextAction: "",
  });
});
