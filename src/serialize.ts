import type { RequiredCliteOptions } from "./types";
import { redactTextPayload, redactValue, safeJson, truncate } from "./redact";

export function serializeUnknown(value: unknown, options: RequiredCliteOptions): string {
  if (typeof value === "string") {
    return truncate(redactTextPayload(value, options.redaction), options.maxBodyBytes);
  }

  if (value instanceof Error) {
    return truncate(
      safeJson(
        redactValue(
          {
            name: value.name,
            message: value.message,
            stack: value.stack
          },
          options.redaction
        )
      ),
      options.maxBodyBytes
    );
  }

  if (value instanceof URLSearchParams) {
    return truncate(redactValue(value.toString(), options.redaction), options.maxBodyBytes);
  }

  if (value instanceof FormData) {
    const output: Record<string, string> = {};
    for (const [key, nestedValue] of value.entries()) {
      output[key] = nestedValue instanceof File ? `[File ${nestedValue.name} ${nestedValue.size} bytes]` : String(nestedValue);
    }
    return truncate(safeJson(redactValue(output, options.redaction)), options.maxBodyBytes);
  }

  if (value instanceof Blob) {
    return `[Blob ${value.type || "application/octet-stream"} ${value.size} bytes]`;
  }

  try {
    return truncate(safeJson(redactValue(value, options.redaction)), options.maxBodyBytes);
  } catch {
    return truncate(String(value), options.maxBodyBytes);
  }
}

export function summarizeConsoleArgs(values: unknown[], options: RequiredCliteOptions): string {
  return values
    .map((value) => {
      if (typeof value === "string") {
        return redactValue(value, options.redaction);
      }
      if (value instanceof Error) {
        return `${value.name}: ${value.message}`;
      }
      return serializeUnknown(value, options);
    })
    .join(" ");
}
