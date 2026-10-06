import { describe, expect, it } from "vitest";
import { addDecimals, subtractDecimals, compareDecimals, decimal, int64, localDate, localDayAt, numeric, parseJson, safeNumber, stringifyJson, timestamp, uuid } from "./codecs";

describe("canonical SQLite codecs", () => {
  it("retains exact decimals and compares without floating point", () => {
    expect(decimal("+0001.230000")).toBe("1.23");
    expect(decimal("-0.000")).toBe("0");
    expect(compareDecimals("9007199254740993.000001", "9007199254740993.000002")).toBe(-1);
    expect(compareDecimals("-0.2", "-0.10")).toBe(-1);
    expect(addDecimals("9007199254740993.000001", "0.000009")).toBe("9007199254740993.00001");
    expect(subtractDecimals("0.3", "0.2")).toBe("0.1");
    expect(addDecimals("-0.9", "0.1")).toBe("-0.8");
    expect(addDecimals("Infinity", "-Infinity")).toBe("NaN");
    expect(subtractDecimals("NaN", "1")).toBe("NaN");
    expect(decimal("NaN")).toBe("NaN");
    expect(compareDecimals("NaN", "Infinity")).toBe(1);
    expect(compareDecimals("NaN", "NaN")).toBe(0);
    expect(numeric("1.2345", 8, 3)).toBe("1.235");
    expect(numeric("-1.2345", 8, 3)).toBe("-1.235");
    expect(numeric("NaN", 8, 3)).toBe("NaN");
    expect(() => numeric("99999.9995", 8, 3)).toThrow();
    expect(() => numeric("Infinity", 8, 3)).toThrow();
    expect(() => decimal("1e6")).toThrow();
  });
  it("round trips signed bigint extrema and rejects unsafe UI projections", () => {
    for (const value of ["-9223372036854775808", "9223372036854775807"]) expect(int64(value).toString()).toBe(value);
    expect(() => int64("9223372036854775808")).toThrow();
    expect(() => safeNumber(int64("9007199254740993"))).toThrow();
  });
  it("retains microseconds while normalizing timezone offsets", () => {
    expect(timestamp("2026-10-06T12:13:14.123456+02:00")).toBe("2026-10-06T10:13:14.123456Z");
    expect(timestamp("2026-10-06T12:13:14Z")).toBe("2026-10-06T12:13:14.000000Z");
    expect(() => timestamp("2026-02-30T12:00:00Z")).toThrow();
    expect(() => timestamp("2026-10-06T24:00:00Z")).toThrow();
    expect(() => timestamp("2026-10-06T12:00:00.1234567Z")).toThrow();
  });
  it("uses local-day boundaries through both Berlin DST transitions", () => {
    expect(localDayAt("2026-03-28T23:30:00Z", "Europe/Berlin")).toBe("2026-03-29");
    expect(localDayAt("2026-03-29T01:30:00Z", "Europe/Berlin")).toBe("2026-03-29");
    expect(localDayAt("2026-10-25T00:30:00Z", "Europe/Berlin")).toBe("2026-10-25");
    expect(localDayAt("2026-10-25T01:30:00Z", "Europe/Berlin")).toBe("2026-10-25");
    expect(() => localDate("2026-02-29")).toThrow();
    expect(localDate("2024-02-29")).toBe("2024-02-29");
  });
  it("preserves JSON numbers, Unicode, null and final-key-wins without Number", () => {
    const json = '{"b":9007199254740993,"a":[0.1234567890123456789,"😀東京",null,true],"duplicate":1,"duplicate":2}';
    expect(stringifyJson(parseJson(json))).toBe('{"a":[0.1234567890123456789,"😀東京",null,true],"b":9007199254740993,"duplicate":2}');
    expect(stringifyJson(parseJson('{"kind":"exact-json-number","value":"malicious"}'))).toBe('{"kind":"exact-json-number","value":"malicious"}');
    expect(stringifyJson(parseJson('{"__proto__":{"polluted":true}}'))).toBe('{"__proto__":{"polluted":true}}');
    for (const invalid of ["01", "[1,]", "NaN", "1 trailing", '{"a":undefined}']) expect(() => parseJson(invalid)).toThrow();
    for (const invalid of ['"\\u0000"', '"\\ud800"']) expect(() => parseJson(invalid)).toThrow("JSONB_UNICODE_INVALID");
  });
  it("normalizes stable UUID spelling", () => {
    expect(uuid("AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA")).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(() => uuid("client-owner")).toThrow();
  });
});
