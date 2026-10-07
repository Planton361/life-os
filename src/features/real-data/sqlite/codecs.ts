// Storage codecs never route exact PostgreSQL values through a JavaScript Number.
// A UI projection that needs a Number must explicitly prove a safe conversion.
export function uuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new Error("INVALID_UUID");
  return value.toLowerCase();
}

export function decimal(value: string): string {
  if (/^[+]?inf(?:inity)?$/i.test(value)) return "Infinity";
  if (/^-inf(?:inity)?$/i.test(value)) return "-Infinity";
  if (/^nan$/i.test(value)) return "NaN";
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new Error("INVALID_DECIMAL");
  const whole = match[2].replace(/^0+(?=\d)/, "");
  const fraction = (match[3] ?? "").replace(/0+$/, "");
  if (whole.length > 131072 || fraction.length > 16383) throw new Error("DECIMAL_OVERFLOW");
  const negative = match[1] === "-" && (whole !== "0" || fraction !== "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

// Existing Zod form contracts supply finite numbers. Expand their shortest
// decimal spelling before storage; never parse a stored decimal through Number.
export function decimalFromNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error("FINITE_FORM_NUMBER_REQUIRED");
  const text = String(value);
  if (!/[eE]/.test(text)) return decimal(text);
  const [mantissa, exponent] = text.split(/[eE]/);
  const negative = mantissa.startsWith("-");
  const [whole, fraction = ""] = mantissa.replace(/^-/, "").split(".");
  const digits = whole + fraction, point = whole.length + Number(exponent);
  const expanded = point <= 0 ? `0.${"0".repeat(-point)}${digits}` : point >= digits.length ? digits + "0".repeat(point - digits.length) : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return decimal(`${negative ? "-" : ""}${expanded}`);
}

export function compareDecimals(left: string, right: string): number {
  const a = decimal(left), b = decimal(right);
  const specialRank = (value: string) => value === "-Infinity" ? 0 : value === "Infinity" ? 2 : value === "NaN" ? 3 : 1;
  if (specialRank(a) !== 1 || specialRank(b) !== 1)
    return Math.sign(specialRank(a) - specialRank(b));
  const scale = Math.max((a.split(".")[1] ?? "").length, (b.split(".")[1] ?? "").length);
  const scaled = (v: string) => {
    const [whole, fraction = ""] = v.split(".");
    return BigInt(`${whole}${fraction.padEnd(scale, "0")}`);
  };
  const x = scaled(a), y = scaled(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

export function addDecimals(left: string, right: string): string {
  const a = decimal(left), b = decimal(right);
  if (a === "NaN" || b === "NaN") return "NaN";
  if (a.includes("Infinity") || b.includes("Infinity")) {
    if (a.includes("Infinity") && b.includes("Infinity") && a !== b) return "NaN";
    return a.includes("Infinity") ? a : b;
  }
  const scale = Math.max((a.split(".")[1] ?? "").length, (b.split(".")[1] ?? "").length);
  const scaled = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(`${whole}${fraction.padEnd(scale, "0")}`);
  };
  const sum = scaled(a) + scaled(b);
  const digits = (sum < 0 ? -sum : sum).toString().padStart(scale + 1, "0");
  return decimal(`${sum < 0 ? "-" : ""}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`);
}

export function subtractDecimals(left: string, right: string): string {
  const value = decimal(right);
  if (value === "NaN") return "NaN";
  return addDecimals(left, value.startsWith("-") ? value.slice(1) : `-${value}`);
}

// PostgreSQL numeric(p,s) rounds ties away from zero, then checks overflow.
export function numeric(value: string, precision: number, scale: number): string {
  if (!Number.isInteger(precision) || precision < 1 || precision > 1000 || !Number.isInteger(scale) || scale < 0 || scale > 1000)
    throw new Error("NUMERIC_TYPE_INVALID");
  const normalized = decimal(value);
  if (normalized === "NaN") return normalized;
  if (normalized.includes("Infinity")) throw new Error("NUMERIC_OVERFLOW");
  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = normalized.replace(/^-/, "").split(".");
  let scaled = BigInt(`${whole}${fraction.padEnd(scale, "0").slice(0, scale)}`);
  if ((fraction[scale] ?? "0") >= "5") scaled += BigInt(1);
  if (scaled >= BigInt(10) ** BigInt(precision)) throw new Error("NUMERIC_OVERFLOW");
  const digits = scaled.toString().padStart(scale + 1, "0");
  return decimal(`${negative ? "-" : ""}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`);
}

export function int64(value: string | bigint): bigint {
  if (typeof value === "string" && !/^-?\d+$/.test(value)) throw new Error("INVALID_BIGINT");
  const result = BigInt(value);
  if (result < -(BigInt(1) << BigInt(63)) || result >= (BigInt(1) << BigInt(63)))
    throw new Error("BIGINT_OVERFLOW");
  return result;
}

export function safeNumber(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error("UNSAFE_NUMBER_PROJECTION");
  return result;
}

export function localDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("INVALID_LOCAL_DATE");
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value)
    throw new Error("INVALID_LOCAL_DATE");
  return value;
}

export function timezone(value: string): string {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(0); }
  catch { throw new Error("INVALID_TIMEZONE"); }
  return value;
}

// Canonical UTC with six fractional digits retains PostgreSQL microseconds.
// Date is used only for the integer-second offset conversion.
export function timestamp(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) throw new Error("INVALID_TIMESTAMP");
  localDate(match[1]);
  if (+match[2] > 23 || +match[3] > 59 || +match[4] > 59) throw new Error("INVALID_TIMESTAMP");
  if (match[6] !== "Z" && (+match[6].slice(1, 3) > 15 || +match[6].slice(4) > 59))
    throw new Error("INVALID_TIMESTAMP");
  const second = new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}${match[6]}`);
  if (Number.isNaN(second.valueOf())) throw new Error("INVALID_TIMESTAMP");
  return second.toISOString().replace(/\.000Z$/, `.${(match[5] ?? "").padEnd(6, "0")}Z`);
}

export function localDayAt(value: string, zone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone(zone), year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(timestamp(value)));
  const get = (key: string) => parts.find((part) => part.type === key)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export class ExactJsonNumber {
  constructor(readonly value: string) {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) throw new Error("INVALID_JSON_NUMBER");
    Object.freeze(this);
  }
}
export type ExactJson = null | boolean | string | ExactJsonNumber | ExactJson[] | { [key: string]: ExactJson };

// JSON.parse would round bigint and decimal tokens before a codec could inspect
// them. This bounded parser retains numeric tokens; duplicate keys use JSONB's
// final-key-wins semantics and object keys are serialized deterministically.
export function parseJson(value: string): ExactJson {
  if (Buffer.byteLength(value) > 8 * 1024 * 1024) throw new Error("JSON_TOO_LARGE");
  // Use the platform parser only for grammar validation. Discard its potentially
  // rounded numbers and construct the exact representation from source tokens.
  JSON.parse(value);
  let offset = 0;
  const ws = () => { while (/\s/.test(value[offset] ?? "") && offset < value.length) offset++; };
  const string = (): string => {
    const start = offset++;
    while (offset < value.length) {
      const c = value[offset++];
      if (c === "\\") offset++;
      else if (c === '"') {
        const parsed = JSON.parse(value.slice(start, offset)) as string;
        if (parsed.includes("\u0000") || !parsed.isWellFormed()) throw new Error("JSONB_UNICODE_INVALID");
        return parsed;
      }
    }
    throw new Error("INVALID_JSON");
  };
  const read = (depth: number): ExactJson => {
    if (depth > 100) throw new Error("JSON_TOO_DEEP");
    ws();
    const c = value[offset];
    if (c === '"') return string();
    if (c === "[") {
      offset++; ws(); const list: ExactJson[] = [];
      if (value[offset] === "]") { offset++; return list; }
      for (;;) {
        list.push(read(depth + 1)); ws();
        const separator = value[offset++];
        if (separator === "]") return list;
        if (separator !== ",") throw new Error("INVALID_JSON");
      }
    }
    if (c === "{") {
      offset++; ws(); const object: { [key: string]: ExactJson } = Object.create(null);
      if (value[offset] === "}") { offset++; return object; }
      for (;;) {
        ws(); if (value[offset] !== '"') throw new Error("INVALID_JSON");
        const key = string(); ws();
        if (value[offset++] !== ":") throw new Error("INVALID_JSON");
        object[key] = read(depth + 1); ws();
        const separator = value[offset++];
        if (separator === "}") return object;
        if (separator !== ",") throw new Error("INVALID_JSON");
      }
    }
    for (const [literal, result] of [["true", true], ["false", false], ["null", null]] as const) {
      if (value.startsWith(literal, offset)) { offset += literal.length; return result; }
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(value.slice(offset));
    if (!number) throw new Error("INVALID_JSON");
    offset += number[0].length;
    return new ExactJsonNumber(number[0]);
  };
  const result = read(0); ws();
  if (offset !== value.length) throw new Error("INVALID_JSON");
  return result;
}

export function stringifyJson(value: ExactJson): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stringifyJson).join(",")}]`;
  if (value instanceof ExactJsonNumber)
    return value.value;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stringifyJson(value[key])}`).join(",")}}`;
}
