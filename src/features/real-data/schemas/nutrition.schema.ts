import {
  localDateSchema,
  optionalDateTimeStringSchema,
  optionalTrimmedStringSchema,
  requiredEnumSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

export const nutritionMealTypes = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
] as const;

const blankInputToUndefined = (value: unknown) => {
  if (value === null) return undefined;
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
};

const requiredUuidSchema = z.string().trim().uuid();
const optionalUuidSchema = z.preprocess(
  blankInputToUndefined,
  z.string().trim().uuid().optional(),
);
const titleSchema = requiredTrimmedStringSchema();
const optionalBoundedStringSchema = (maxLength: number) =>
  z.preprocess(
    blankInputToUndefined,
    z.string().trim().min(1).max(maxLength).optional(),
  );
const optionalIntegerRangeSchema = (minimum: number, maximum: number) =>
  z.preprocess(
    blankInputToUndefined,
    z.coerce.number().int().min(minimum).max(maximum).optional(),
  );
const optionalTagsSchema = z
  .preprocess(
    (value) => {
      if (value === null) return undefined;
      if (typeof value === "string") {
        const trimmed = value.trim();

        if (trimmed.length === 0) return undefined;

        return trimmed
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      }

      return value;
    },
    z.array(z.string().trim().min(1).max(64)).max(50).optional(),
  )
  .transform((tags) =>
    tags === undefined ? undefined : Array.from(new Set(tags)),
  );
const nutritionEstimateSchema = z.preprocess(
  blankInputToUndefined,
  z
    .record(z.string(), z.unknown())
    .refine((value) => !Array.isArray(value), {
      message: "Expected a plain nutrition estimate object.",
    })
    .optional(),
);

const recipeBaseSchema = z.object({
  areaId: optionalUuidSchema,
  instructions: optionalTrimmedStringSchema,
  nutritionEstimate: nutritionEstimateSchema,
  prepMinutes: optionalIntegerRangeSchema(0, 1440),
  servings: optionalIntegerRangeSchema(1, 100),
  source: optionalBoundedStringSchema(200),
  summary: optionalTrimmedStringSchema,
  tags: optionalTagsSchema,
  title: titleSchema,
});

export const recipeCreateInputSchema = recipeBaseSchema;

export type RecipeCreateInput = z.infer<typeof recipeCreateInputSchema>;

export const recipeUpdateInputSchema = recipeBaseSchema.partial().extend({
  recipeId: requiredUuidSchema,
});

export type RecipeUpdateInput = z.infer<typeof recipeUpdateInputSchema>;

const mealBaseSchema = z.object({
  completedAt: optionalDateTimeStringSchema,
  date: localDateSchema,
  mealType: requiredEnumSchema(nutritionMealTypes),
  notes: optionalTrimmedStringSchema,
  plannedAt: optionalDateTimeStringSchema,
  recipeId: optionalUuidSchema,
  title: titleSchema,
});

export const mealCreateInputSchema = mealBaseSchema;

export type MealCreateInput = z.infer<typeof mealCreateInputSchema>;

export const mealUpdateInputSchema = mealBaseSchema.partial().extend({
  mealId: requiredUuidSchema,
});

export type MealUpdateInput = z.infer<typeof mealUpdateInputSchema>;
