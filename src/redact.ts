import type { CliteRedactionOptions, CliteResolvedRedactionOptions } from "./types";

const DEFAULT_REDACTION_KEYS = [
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "passwd",
  "secret",
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "api_key",
  "apikey",
  "x-api-key",
  "client_secret",
  "session",
  "csrf"
];

const DEFAULT_URL_PARAMS = [
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "api_key",
  "apikey",
  "key",
  "password",
  "secret",
  "code",
  "state"
];

const DEFAULT_PATTERNS = [
  /bearer\s+[a-z0-9._~+/=-]+/gi,
  /basic\s+[a-z0-9._~+/=-]+/gi,
  /(sk-[a-z0-9]{16,})/gi
];

export function createRedactionOptions(options: CliteRedactionOptions | undefined): CliteResolvedRedactionOptions {
  return {
    replacement: options?.replacement ?? "[REDACTED]",
    keys: [...DEFAULT_REDACTION_KEYS, ...(options?.keys ?? [])],
    patterns: [...DEFAULT_PATTERNS, ...(options?.patterns ?? [])],
    urlParams: [...DEFAULT_URL_PARAMS, ...(options?.urlParams ?? [])]
  };
}

export function isSensitiveKey(key: string, options: CliteResolvedRedactionOptions): boolean {
  const normalized = key.toLowerCase();
  return options.keys.some((sensitiveKey) => normalized.includes(sensitiveKey.toLowerCase()));
}

export function redactString(value: string, options: CliteResolvedRedactionOptions): string {
  let nextValue = value;
  for (const pattern of options.patterns) {
    nextValue = nextValue.replace(pattern, options.replacement);
  }
  return redactUrl(nextValue, options);
}

export function redactTextPayload(value: string, options: CliteResolvedRedactionOptions): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return safeJson(redactValue(JSON.parse(value), options));
    } catch {
      return redactString(value, options);
    }
  }

  return redactString(value, options);
}

export function redactUrl(value: string, options: CliteResolvedRedactionOptions): string {
  try {
    const url = new URL(value, globalThis.location?.href ?? "http://localhost");
    let changed = false;

    for (const param of options.urlParams) {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, options.replacement);
        changed = true;
      }
    }

    if (!changed) {
      return value;
    }

    if (/^https?:\/\//i.test(value)) {
      return url.toString();
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}

export function redactValue<T>(value: T, options: CliteResolvedRedactionOptions, keyHint = ""): T {
  if (keyHint && isSensitiveKey(keyHint, options)) {
    return options.replacement as T;
  }

  if (typeof value === "string") {
    return redactString(value, options) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, options)) as T;
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      output[key] = redactValue(nestedValue, options, key);
    }
    return output as T;
  }

  return value;
}

export function redactHeaders(headers: Headers | Record<string, string> | undefined, options: CliteResolvedRedactionOptions): Record<string, string> {
  if (!headers) {
    return {};
  }

  const entries = headers instanceof Headers ? Array.from(headers.entries()) : Object.entries(headers);
  const output: Record<string, string> = {};

  for (const [key, value] of entries) {
    output[key] = isSensitiveKey(key, options) ? options.replacement : redactString(String(value), options);
  }

  return output;
}

export function truncate(value: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  if (encoder.encode(value).byteLength <= maxBytes) {
    return value;
  }

  let end = Math.max(0, maxBytes);
  while (end > 0 && encoder.encode(value.slice(0, end)).byteLength > maxBytes) {
    end -= 1;
  }

  return `${value.slice(0, end)}... [truncated]`;
}

export function safeJson(value: unknown, space = 2): string {
  return JSON.stringify(toSerializable(value, new WeakSet<object>()), null, space);
}

function toSerializable(value: unknown, stack: WeakSet<object>): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (stack.has(value)) {
    return "[Circular]";
  }

  stack.add(value);

  if (Array.isArray(value)) {
    const output = value.map((item) => toSerializable(item, stack));
    stack.delete(value);
    return output;
  }

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    output[key] = toSerializable(nestedValue, stack);
  }

  stack.delete(value);
  return output;
}
