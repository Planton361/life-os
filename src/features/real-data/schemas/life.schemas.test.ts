import { describe, expect, it } from "vitest";
import { entertainmentItemInputSchema } from "./life.schemas";

const item = {
  completedOn: "",
  creatorOrStudio: "",
  mediaType: "book",
  notes: "",
  progressCurrent: "",
  progressTotal: "",
  progressUnit: "",
  rating: "",
  releaseYear: "",
  startedOn: "",
  status: "completed",
  title: "A finished book",
};

describe("entertainment item validation", () => {
  it("allows completed items without invented progress", () => {
    expect(entertainmentItemInputSchema.safeParse(item).success).toBe(true);
  });

  it("rejects ratings outside 1-10 and current progress above total", () => {
    expect(entertainmentItemInputSchema.safeParse({ ...item, rating: "11" }).success).toBe(false);
    expect(entertainmentItemInputSchema.safeParse({ ...item, progressCurrent: "11", progressTotal: "10", progressUnit: "pages" }).success).toBe(false);
  });

  it("requires a controlled unit whenever progress exists", () => {
    expect(entertainmentItemInputSchema.safeParse({ ...item, progressCurrent: "3" }).success).toBe(false);
    expect(entertainmentItemInputSchema.safeParse({ ...item, progressCurrent: "3", progressUnit: "episodes" }).success).toBe(true);
  });
});
