import type { CliteInternals, CliteNetworkEntry, StopCapture } from "./types";
import { redactHeaders, redactTextPayload, redactValue, truncate } from "./redact";
import { serializeUnknown } from "./serialize";

export function captureNetwork(internals: CliteInternals): StopCapture {
  const stops: StopCapture[] = [];
  if (internals.options.capture.fetch && "fetch" in globalThis) {
    stops.push(captureFetch(internals));
  }
  if (internals.options.capture.xhr && "XMLHttpRequest" in globalThis) {
    stops.push(captureXhr(internals));
  }

  return () => {
    for (const stop of stops) {
      stop();
    }
  };
}

function captureFetch(internals: CliteInternals): StopCapture {
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const started = performance.now();
    const startedAt = new Date().toISOString();
    const request = normalizeFetchRequest(input, init, internals);

    try {
      const response = await originalFetch(input, init);
      const durationMs = performance.now() - started;
      const entry: CliteNetworkEntry = {
        kind: "fetch",
        method: request.method,
        url: request.url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        durationMs,
        startedAt,
        endedAt: new Date().toISOString(),
        requestHeaders: request.headers,
        responseHeaders: redactHeaders(response.headers, internals.options.redaction),
        requestBodyPreview: request.bodyPreview
      };

      const event = internals.emit({
        type: "network",
        severity: response.ok ? "info" : "warn",
        summary: `${request.method} ${request.url} -> ${response.status}`,
        data: entry
      });

      void response
        .clone()
        .text()
        .then((body) => {
          const responseBodyPreview = truncate(redactTextPayload(body, internals.options.redaction), internals.options.maxBodyBytes);
          internals.updateEvent(event.id, {
            data: {
              ...entry,
              responseBodyPreview
            }
          });
        })
        .catch(() => undefined);

      return response;
    } catch (error) {
      const durationMs = performance.now() - started;
      const entry: CliteNetworkEntry = {
        kind: "fetch",
        method: request.method,
        url: request.url,
        durationMs,
        startedAt,
        endedAt: new Date().toISOString(),
        requestHeaders: request.headers,
        requestBodyPreview: request.bodyPreview,
        error: serializeUnknown(error, internals.options)
      };

      internals.emit({
        type: "network",
        severity: "error",
        summary: `${request.method} ${request.url} failed`,
        data: entry
      });

      throw error;
    }
  }) as typeof globalThis.fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function captureXhr(internals: CliteInternals): StopCapture {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  const metadata = new WeakMap<XMLHttpRequest, XhrMetadata>();

  XMLHttpRequest.prototype.open = function open(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
    metadata.set(this, {
      method,
      url: redactValue(String(url), internals.options.redaction),
      headers: {},
      startedAt: "",
      started: 0
    });
    return originalOpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
  };

  XMLHttpRequest.prototype.setRequestHeader = function setRequestHeader(name: string, value: string) {
    const item = metadata.get(this);
    if (item) {
      item.headers[name] = value;
    }
    return originalSetRequestHeader.call(this, name, value);
  };

  XMLHttpRequest.prototype.send = function send(body?: Document | XMLHttpRequestBodyInit | null) {
    const item = metadata.get(this);
    if (item) {
      item.started = performance.now();
      item.startedAt = new Date().toISOString();
      item.bodyPreview = serializeRequestBody(body, internals);

      const finalize = () => {
        const durationMs = performance.now() - item.started;
        const responseHeaders = parseRawHeaders(this.getAllResponseHeaders(), internals);
        const responseBodyPreview = typeof this.responseText === "string" ? truncate(redactTextPayload(this.responseText, internals.options.redaction), internals.options.maxBodyBytes) : undefined;
        const entry: CliteNetworkEntry = {
          kind: "xhr",
          method: item.method,
          url: item.url,
          status: this.status,
          statusText: this.statusText,
          ok: this.status >= 200 && this.status < 300,
          durationMs,
          startedAt: item.startedAt,
          endedAt: new Date().toISOString(),
          requestHeaders: redactHeaders(item.headers, internals.options.redaction),
          responseHeaders,
          requestBodyPreview: item.bodyPreview,
          responseBodyPreview
        };

        internals.emit({
          type: "network",
          severity: entry.ok ? "info" : "warn",
          summary: `${item.method} ${item.url} -> ${this.status}`,
          data: entry
        });
      };

      this.addEventListener("loadend", finalize, { once: true });
      this.addEventListener(
        "error",
        () => {
          const entry: CliteNetworkEntry = {
            kind: "xhr",
            method: item.method,
            url: item.url,
            durationMs: performance.now() - item.started,
            startedAt: item.startedAt,
            endedAt: new Date().toISOString(),
            requestHeaders: redactHeaders(item.headers, internals.options.redaction),
            requestBodyPreview: item.bodyPreview,
            error: "XHR network error"
          };
          internals.emit({
            type: "network",
            severity: "error",
            summary: `${item.method} ${item.url} failed`,
            data: entry
          });
        },
        { once: true }
      );
    }

    return originalSend.call(this, body);
  };

  return () => {
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
    XMLHttpRequest.prototype.setRequestHeader = originalSetRequestHeader;
  };
}

function normalizeFetchRequest(input: RequestInfo | URL, init: RequestInit | undefined, internals: CliteInternals): NormalizedRequest {
  if (input instanceof Request) {
    return {
      method: init?.method ?? input.method ?? "GET",
      url: redactValue(input.url, internals.options.redaction),
      headers: redactHeaders(init?.headers ? new Headers(init.headers) : input.headers, internals.options.redaction),
      bodyPreview: serializeRequestBody(init?.body, internals)
    };
  }

  return {
    method: init?.method ?? "GET",
    url: redactValue(String(input), internals.options.redaction),
    headers: redactHeaders(init?.headers ? new Headers(init.headers) : undefined, internals.options.redaction),
    bodyPreview: serializeRequestBody(init?.body, internals)
  };
}

function serializeRequestBody(body: BodyInit | Document | null | undefined, internals: CliteInternals): string | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (body instanceof ReadableStream) {
    return "[ReadableStream]";
  }

  if (body instanceof ArrayBuffer) {
    return `[ArrayBuffer ${body.byteLength} bytes]`;
  }

  if (ArrayBuffer.isView(body)) {
    return `[${body.constructor.name} ${body.byteLength} bytes]`;
  }

  if (body instanceof Document) {
    return truncate(redactValue(body.documentElement.outerHTML, internals.options.redaction), internals.options.maxBodyBytes);
  }

  return serializeUnknown(body, internals.options);
}

function parseRawHeaders(rawHeaders: string, internals: CliteInternals): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of rawHeaders.trim().split(/[\r\n]+/)) {
    if (!line) continue;
    const index = line.indexOf(":");
    if (index === -1) continue;
    headers[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return redactHeaders(headers, internals.options.redaction);
}

interface NormalizedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  bodyPreview?: string | undefined;
}

interface XhrMetadata {
  method: string;
  url: string;
  headers: Record<string, string>;
  startedAt: string;
  started: number;
  bodyPreview?: string | undefined;
}
