import { z } from "zod";

export { z };

export type SchemaIssue = z.core.$ZodIssue;
export type SchemaResult<TData> = z.ZodSafeParseResult<TData>;
export type InputSchema<TInput> = z.ZodType<TInput>;

const blankInputToUndefined = (value: unknown) => {
  if (value === null) return undefined;
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
};

const trimStringInput = (value: unknown) => {
  if (typeof value === "string") return value.trim();

  return value;
};

const trimBlankInputToUndefined = (value: unknown) => {
  if (value === null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  return value;
};

export const requiredTrimmedStringSchema = (minimumLength = 1) =>
  z
    .string()
    .trim()
    .min(minimumLength, {
      message: `Expected at least ${minimumLength} character(s).`,
    });

export const optionalTrimmedStringSchema = z.preprocess(
  blankInputToUndefined,
  z.string().trim().min(1).optional(),
);

export const localDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Expected a local date in YYYY-MM-DD format.",
  });

export const optionalLocalDateSchema = z.preprocess(
  blankInputToUndefined,
  localDateSchema.optional(),
);

export const dateTimeStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Expected a parseable date-time string.",
  });

export const optionalDateTimeStringSchema = z.preprocess(
  blankInputToUndefined,
  dateTimeStringSchema.optional(),
);

export const optionalPositiveIntegerSchema = z.preprocess(
  blankInputToUndefined,
  z.coerce.number().int().positive().optional(),
);

export const optionalBooleanSchema = z.preprocess(
  blankInputToUndefined,
  z.boolean().optional(),
);

export function optionalEnumSchema<
  const TValues extends readonly [string, ...string[]],
>(values: TValues) {
  return z.preprocess(trimBlankInputToUndefined, z.enum(values).optional());
}

export function requiredEnumSchema<
  const TValues extends readonly [string, ...string[]],
>(values: TValues) {
  return z.preprocess(trimStringInput, z.enum(values));
}
