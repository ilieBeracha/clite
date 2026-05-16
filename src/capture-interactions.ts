import type { CliteInternals, StopCapture } from "./types";
import { getCssSelector, getElementContext } from "./dom";
import { redactValue, truncate } from "./redact";

export function captureInteractions(internals: CliteInternals): StopCapture {
  const stops: StopCapture[] = [];

  if (internals.options.capture.clicks) {
    stops.push(captureClicks(internals));
  }

  if (internals.options.capture.inputs) {
    stops.push(captureInputs(internals));
  }

  if (internals.options.capture.route) {
    stops.push(captureRoutes(internals));
  }

  return () => {
    for (const stop of stops) {
      stop();
    }
  };
}

function captureClicks(internals: CliteInternals): StopCapture {
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : undefined;
    if (!target || isCliteNode(target)) {
      return;
    }

    const context = getElementContext(target, internals.options);
    internals.emit({
      type: "click",
      severity: "info",
      summary: context.accessibleName ? `Clicked ${context.accessibleName}` : `Clicked ${context.selector}`,
      data: {
        selector: context.selector,
        role: context.role,
        accessibleName: context.accessibleName,
        source: context.source,
        point: {
          x: event.clientX,
          y: event.clientY
        }
      }
    });
  };

  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}

function captureInputs(internals: CliteInternals): StopCapture {
  const onInput = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
      return;
    }

    if (isCliteNode(target)) {
      return;
    }

    const selector = getCssSelector(target);
    const value = target instanceof HTMLInputElement && target.type === "password" ? internals.options.redaction.replacement : truncate(redactValue(target.value, internals.options.redaction, target.name), 300);

    internals.emit({
      type: "input",
      severity: "info",
      summary: `Input changed ${selector}`,
      data: {
        selector,
        name: target.getAttribute("name") ?? undefined,
        type: target instanceof HTMLInputElement ? target.type : target.tagName.toLowerCase(),
        valuePreview: value
      }
    });
  };

  document.addEventListener("input", onInput, true);
  document.addEventListener("change", onInput, true);

  return () => {
    document.removeEventListener("input", onInput, true);
    document.removeEventListener("change", onInput, true);
  };
}

function captureRoutes(internals: CliteInternals): StopCapture {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  const emitRoute = (action: string, url?: string | URL | null) => {
    internals.emit({
      type: "route",
      severity: "info",
      summary: `${action}: ${url ? String(url) : location.href}`,
      data: {
        action,
        url: url ? String(url) : location.href,
        title: document.title
      }
    });
  };

  history.pushState = function pushState(data: unknown, unused: string, url?: string | URL | null) {
    const result = originalPushState.call(this, data, unused, url);
    emitRoute("pushState", url);
    return result;
  };

  history.replaceState = function replaceState(data: unknown, unused: string, url?: string | URL | null) {
    const result = originalReplaceState.call(this, data, unused, url);
    emitRoute("replaceState", url);
    return result;
  };

  const onPopstate = () => emitRoute("popstate");
  globalThis.addEventListener("popstate", onPopstate);

  return () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    globalThis.removeEventListener("popstate", onPopstate);
  };
}

function isCliteNode(element: Element): boolean {
  return Boolean(element.closest("[data-clite-root]"));
}
