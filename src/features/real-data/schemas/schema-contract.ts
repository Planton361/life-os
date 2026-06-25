export type SchemaIssue = {
  path: string;
  message: string;
};

export type SchemaResult<TData> =
  | {
      success: true;
      data: TData;
    }
  | {
      success: false;
      issues: readonly SchemaIssue[];
    };

export type InputSchema<TInput> = {
  readonly name: string;
  parse(input: unknown): TInput;
  safeParse(input: unknown): SchemaResult<TInput>;
};

export class InputSchemaError extends Error {
  constructor(
    readonly schemaName: string,
    readonly issues: readonly SchemaIssue[],
  ) {
    super(`${schemaName} validation failed`);
    this.name = "InputSchemaError";
  }
}

export function defineInputSchema<TInput>(
  name: string,
  parser: (input: unknown) => SchemaResult<TInput>,
): InputSchema<TInput> {
  return {
    name,
    parse(input) {
      const result = parser(input);

      if (!result.success) {
        throw new InputSchemaError(name, result.issues);
      }

      return result.data;
    },
    safeParse: parser,
  };
}

export function finishSchema<TInput>(
  data: TInput,
  issues: SchemaIssue[],
): SchemaResult<TInput> {
  if (issues.length > 0) {
    return {
      issues,
      success: false,
    };
  }

  return {
    data,
    success: true,
  };
}

export function asInputRecord(
  input: unknown,
  issues: SchemaIssue[],
): Record<string, unknown> {
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  issues.push({
    message: "Expected an object input.",
    path: "$",
  });

  return {};
}

export function requiredString(
  record: Record<string, unknown>,
  key: string,
  issues: SchemaIssue[],
  minimumLength = 1,
) {
  const value = record[key];

  if (typeof value !== "string") {
    issues.push({
      message: "Expected a string.",
      path: key,
    });
    return "";
  }

  const trimmed = value.trim();

  if (trimmed.length < minimumLength) {
    issues.push({
      message: `Expected at least ${minimumLength} character(s).`,
      path: key,
    });
  }

  return trimmed;
}

export function optionalString(
  record: Record<string, unknown>,
  key: string,
  issues: SchemaIssue[],
) {
  const value = record[key];

  if (value === undefined || value === null) return undefined;

  if (typeof value !== "string") {
    issues.push({
      message: "Expected a string.",
      path: key,
    });
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

export function optionalBoolean(
  record: Record<string, unknown>,
  key: string,
  issues: SchemaIssue[],
) {
  const value = record[key];

  if (value === undefined || value === null) return undefined;

  if (typeof value !== "boolean") {
    issues.push({
      message: "Expected a boolean.",
      path: key,
    });
    return undefined;
  }

  return value;
}

export function optionalPositiveInteger(
  record: Record<string, unknown>,
  key: string,
  issues: SchemaIssue[],
) {
  const value = record[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    issues.push({
      message: "Expected a positive integer.",
      path: key,
    });
    return undefined;
  }

  return numberValue;
}

export function optionalEnum<const TValues extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  values: TValues,
  issues: SchemaIssue[],
): TValues[number] | undefined {
  const value = optionalString(record, key, issues);

  if (value === undefined) return undefined;

  if (!values.includes(value as TValues[number])) {
    issues.push({
      message: `Expected one of: ${values.join(", ")}.`,
      path: key,
    });
    return undefined;
  }

  return value as TValues[number];
}

export function requiredEnum<const TValues extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  values: TValues,
  issues: SchemaIssue[],
): TValues[number] {
  const value = requiredString(record, key, issues);

  if (!values.includes(value as TValues[number])) {
    issues.push({
      message: `Expected one of: ${values.join(", ")}.`,
      path: key,
    });
    return values[0] as TValues[number];
  }

  return value as TValues[number];
}

export function optionalLocalDate(
  record: Record<string, unknown>,
  key: string,
  issues: SchemaIssue[],
) {
  const value = optionalString(record, key, issues);

  if (value === undefined) return undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    issues.push({
      message: "Expected a local date in YYYY-MM-DD format.",
      path: key,
    });
    return undefined;
  }

  return value;
}

export function requiredLocalDate(
  record: Record<string, unknown>,
  key: string,
  issues: SchemaIssue[],
) {
  const value = requiredString(record, key, issues);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    issues.push({
      message: "Expected a local date in YYYY-MM-DD format.",
      path: key,
    });
  }

  return value;
}

export function optionalDateTime(
  record: Record<string, unknown>,
  key: string,
  issues: SchemaIssue[],
) {
  const value = optionalString(record, key, issues);

  if (value === undefined) return undefined;

  if (Number.isNaN(Date.parse(value))) {
    issues.push({
      message: "Expected a parseable date-time string.",
      path: key,
    });
    return undefined;
  }

  return value;
}
