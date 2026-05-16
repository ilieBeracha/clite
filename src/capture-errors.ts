import type { CliteInternals, StopCapture } from "./types";
import { serializeUnknown } from "./serialize";

export function captureErrors(internals: CliteInternals): StopCapture {
  if (!internals.options.capture.errors) {
    return () => undefined;
  }

  const onError = (event: ErrorEvent) => {
    internals.emit({
      type: "error",
      severity: "error",
      summary: event.message,
      data: {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error ? serializeUnknown(event.error, internals.options) : undefined
      }
    });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    internals.emit({
      type: "error",
      severity: "error",
      summary: `Unhandled rejection: ${serializeUnknown(event.reason, internals.options)}`,
      data: {
        reason: serializeUnknown(event.reason, internals.options)
      }
    });
  };

  globalThis.addEventListener("error", onError);
  globalThis.addEventListener("unhandledrejection", onUnhandledRejection);

  return () => {
    globalThis.removeEventListener("error", onError);
    globalThis.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
}
