import type { DescribeOptions, Verbosity } from "./types.ts";

/** Default describe function that summarizes game state at the given verbosity */
export function defaultDescribe(state: unknown, options: DescribeOptions): string {
  const verbosity: Verbosity = options.verbosity ?? "normal";
  const target = options.path ? getByPath(state, options.path) : state;

  if (target === undefined) {
    return options.path ? `Path "${options.path}" not found` : "No state";
  }

  if (verbosity === "detailed") {
    return JSON.stringify(target, null, 2);
  }

  if (typeof target !== "object" || target === null) {
    return String(target);
  }

  if (Array.isArray(target)) {
    return describeArray(target, verbosity);
  }

  return describeObject(target as Record<string, unknown>, verbosity);
}

function describeArray(arr: unknown[], verbosity: Verbosity): string {
  if (verbosity === "minimal") {
    return `Array(${arr.length})`;
  }
  // normal: show first 3 items
  const preview = arr.slice(0, 3).map((item) => summarizeValue(item));
  const suffix = arr.length > 3 ? `, ... (${arr.length} total)` : "";
  return `[${preview.join(", ")}${suffix}]`;
}

function describeObject(obj: Record<string, unknown>, verbosity: Verbosity): string {
  const keys = Object.keys(obj);
  if (verbosity === "minimal") {
    return `{${keys.join(", ")}}`;
  }
  // normal: show key: summarized value for first 3 keys
  const lines = keys.slice(0, 3).map((k) => `  ${k}: ${summarizeValue(obj[k])}`);
  if (keys.length > 3) {
    lines.push(`  ... (${keys.length} keys total)`);
  }
  return `{\n${lines.join("\n")}\n}`;
}

function summarizeValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return `{${keys.length} keys}`;
  }
  return String(value);
}

function getByPath(obj: unknown, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}
