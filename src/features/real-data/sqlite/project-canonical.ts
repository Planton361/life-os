import { createHash } from "node:crypto";
// PostgreSQL jsonb::text: keys sort by UTF-8 byte length, then bytewise;
// separators contain spaces. Bigints stay JSON numbers without Number coercion.
export type Canonical =
  | null
  | boolean
  | string
  | number
  | bigint
  | Canonical[]
  | { [key: string]: Canonical };
export function pgJson(value: Canonical): string {
  if (value === null) return "null";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value))
      throw new Error("PROJECT_JSON_NUMBER_INVALID");
    return String(value);
  }
  if (typeof value !== "object") {
    if (
      typeof value === "string" &&
      (/\u0000/u.test(value) || value.isWellFormed() === false)
    )
      throw new Error("PROJECT_TEXT_INVALID");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(pgJson).join(", ")}]`;
  const keys = Object.keys(value).sort(
    (a, b) =>
      Buffer.byteLength(a) - Buffer.byteLength(b) ||
      Buffer.compare(Buffer.from(a), Buffer.from(b)),
  );
  return `{${keys.map((k) => `${JSON.stringify(k)}: ${pgJson(value[k])}`).join(", ")}}`;
}
export const projectHash = (value: Canonical) =>
  createHash("sha256").update(pgJson(value), "utf8").digest("hex");
export const trimProjectText = (value: string) =>
  value.replace(
    /^[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+|[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$/gu,
    "",
  );
export const safeProjectUrl = (value: string | null) =>
  value !== null && /^https?:\/\/[^/@?#\s]+(\/[^?#\s]*)?$/iu.test(value)
    ? value
    : null;

export const projectCommandKinds = new Set(
  [
    "result.set",
    "criterion.create",
    "criterion.edit",
    "criterion.reorder",
    "criterion.archive",
    "review.submit",
    "review.amend",
    "project.reopen",
    "project.archive",
    "project.status.set",
  ].map((k) => `project.${k}`),
);
// Node 24 exposes JSON.parse source text: retain numbers exactly when inspecting
// stored PostgreSQL-compatible numeric payloads in the commit guard.
export function parseProjectJson(value: string): Canonical {
  return JSON.parse(value, ((
    key: string,
    item: unknown,
    context: { source?: string },
  ) => (typeof item === "number" ? BigInt(context.source!) : item)) as (
    key: string,
    value: unknown,
  ) => unknown) as Canonical;
}
export function projectPgTimestamp(value: string | null): string | null {
  if (value === null) return null;
  const [date, fraction] = value.replace(/Z$/, "").split(".");
  const precision = (fraction ?? "").replace(/0+$/, "");
  return date + (precision ? "." + precision : "") + "+00:00";
}
