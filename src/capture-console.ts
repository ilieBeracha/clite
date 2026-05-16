import type { CliteInternals, StopCapture } from "./types";
import { summarizeConsoleArgs } from "./serialize";

const CONSOLE_METHODS = ["debug", "info", "log", "warn", "error"] as const;

export function captureConsole(internals: CliteInternals): StopCapture {
  if (!internals.options.capture.console) {
    return () => undefined;
  }

  const originalMethods = new Map<string, (...args: unknown[]) => void>();

  for (const method of CONSOLE_METHODS) {
    const original = console[method].bind(console) as (...args: unknown[]) => void;
    originalMethods.set(method, original);

    console[method] = ((...args: unknown[]) => {
      original(...args);
      internals.emit({
        type: "console",
        severity: method === "log" ? "info" : method,
        summary: summarizeConsoleArgs(args, internals.options),
        data: {
          method,
          args: args.map((arg) => summarizeConsoleArgs([arg], internals.options)),
          stack: new Error().stack
        }
      });
    }) as typeof console[typeof method];
  }

  return () => {
    for (const [method, original] of originalMethods) {
      (console as unknown as Record<string, (...args: unknown[]) => void>)[method] = original;
    }
  };
}
