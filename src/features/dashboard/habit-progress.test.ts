import { habitIncrementValue } from "../real-data/domain/habit";
import { describe, expect, it } from "vitest";
import { habitSteps, formatHabitNumber, habitProgressPercent } from "./habit-progress";

describe("canonical habit target projection", () => {
  it.each([
    [1, 8, 12.5],
    [250, 2000, 12.5],
    [0.5, 2, 25],
    [1, 1, 100],
    [12, 8, 100],
    [0, 8, 0],
    [1, null, 0],
  ])("projects %s against %s", (current, target, expected) => {
    expect(habitProgressPercent(current, target)).toBe(expected);
  });
});

it("preserves fractional increments without rounding them to tenths", () => {
  expect(formatHabitNumber(0.25)).toBe("0.25");
  expect(formatHabitNumber(0.1 + 0.2)).toBe("0.3");
});

it("derives dot count from actual increments, including a partial final step", () => {
  expect(habitSteps(250, 2000, 250)).toMatchObject({ total: 8, dots: 8, completed: 1 });
  expect(habitSteps(2, 2.5, 1)).toMatchObject({ total: 3, completed: 2, reached: false });
  expect(habitSteps(2.5, 2.5, 1)).toMatchObject({ completed: 3, reached: true });
});

it("caps the final increment and refuses increments after the target", () => {
  expect(habitIncrementValue(2, 2.5, 1)).toBe(0.5);
  expect(habitIncrementValue(2.5, 2.5, 1)).toBe(0);
});

it.each([[1, 1, 1], [5, 1, 5], [10, 3, 4]])("uses target %s and increment %s for %s required dots", (target, increment, count) => {
  expect(habitSteps(0, target, increment).dots).toBe(count);
  expect(habitSteps(target, target, increment).filled).toBe(count);
});
it("preserves the display cap without inventing extra completed steps", () => {
  expect(habitSteps(0, 100, 1)).toMatchObject({ total: 100, dots: 24, completed: 0 });
  expect(habitSteps(200, 100, 1)).toMatchObject({ completed: 100, filled: 24 });
});
it("caps 10 by 3 as 3, 6, 9, 10 and preserves uncapped semantics", () => {
  let current = 0;
  const totals = Array.from({ length: 4 }, () => current += habitIncrementValue(current, 10, 3));
  expect(totals).toEqual([3, 6, 9, 10]);
  expect(habitIncrementValue(10, 10, 3)).toBe(0);
  expect(habitIncrementValue(10, null, 3)).toBe(3);
});
