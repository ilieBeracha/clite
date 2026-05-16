import { RingBuffer } from "./buffer";
import { captureConsole } from "./capture-console";
import { captureErrors } from "./capture-errors";
import { captureInteractions } from "./capture-interactions";
import { captureNetwork } from "./capture-network";
import { getElementContext } from "./dom";
import { downloadText, packetToJson, packetToMarkdown, writeClipboard } from "./export";
import { ElementInspector } from "./inspector";
import { createRedactionOptions } from "./redact";
import { capturePerformance, captureStorage } from "./storage";
import type {
  CliteController,
  CliteEvent,
  CliteInternals,
  CliteNetworkEntry,
  CliteOptions,
  ClitePacket,
  CliteTargetContext,
  RequiredCliteOptions,
  StopCapture
} from "./types";
import { CliteOverlay } from "./ui";

let eventCounter = 0;

export function createClite(options: CliteOptions = {}): CliteController {
  const requiredOptions = normalizeOptions(options);
  const events = new RingBuffer<CliteEvent>(requiredOptions.maxEvents);
  const stopCaptures: StopCapture[] = [];
  const customContext: Record<string, unknown> = {};
  let selectedTarget: CliteTargetContext | undefined;
  let developerNote = "";
  let started = false;
  let overlay: CliteOverlay | undefined;
  let inspector: ElementInspector | undefined;

  const internals: CliteInternals = {
    options: requiredOptions,
    emit<TData>(event: Omit<CliteEvent<TData>, "id" | "timestamp"> & { timestamp?: string }): CliteEvent<TData> {
      const nextEvent = {
        ...event,
        id: `clite_${Date.now().toString(36)}_${(eventCounter += 1).toString(36)}`,
        timestamp: event.timestamp ?? new Date().toISOString()
      } as CliteEvent<TData>;
      events.push(nextEvent);
      overlay?.render();
      return nextEvent;
    },
    updateEvent(id: string, patch: Partial<CliteEvent>): void {
      events.update((event) => event.id === id, patch);
      overlay?.render();
    },
    getEvents(): CliteEvent[] {
      return events.toArray();
    },
    getNetworkEvents(): CliteEvent<CliteNetworkEntry>[] {
      return events.toArray().filter((event): event is CliteEvent<CliteNetworkEntry> => event.type === "network");
    }
  };

  const controller: CliteController = {
    start(): void {
      if (started || !requiredOptions.enabled || !canUseDom()) {
        return;
      }

      started = true;
      stopCaptures.push(captureConsole(internals));
      stopCaptures.push(captureErrors(internals));
      stopCaptures.push(captureNetwork(internals));
      stopCaptures.push(captureInteractions(internals));
      stopCaptures.push(captureShortcuts(requiredOptions, controller));

      inspector = new ElementInspector(requiredOptions, (element) => {
        controller.selectElement(element);
        overlay?.setInspecting(false);
        overlay?.open();
      });

      overlay = new CliteOverlay(requiredOptions, {
        inspect: () => controller.inspect(),
        copyMarkdown: () => void controller.copyMarkdown().catch((error) => overlay?.setStatus(`Copy failed: ${String(error)}`)),
        copyJson: () => void controller.copyJson().catch((error) => overlay?.setStatus(`Copy failed: ${String(error)}`)),
        downloadJson: () => controller.downloadJson(),
        setDeveloperNote: (note) => controller.setDeveloperNote(note),
        capturePacket: () => controller.capturePacket(),
        destroy: () => controller.destroy()
      });
      overlay.mount();
    },

    stop(): void {
      if (!started) {
        return;
      }

      started = false;
      inspector?.stop();
      while (stopCaptures.length > 0) {
        stopCaptures.pop()?.();
      }
      overlay?.setStatus("Stopped.");
    },

    destroy(): void {
      controller.stop();
      inspector?.destroy();
      inspector = undefined;
      overlay?.destroy();
      overlay = undefined;
    },

    open(): void {
      overlay?.open();
    },

    close(): void {
      overlay?.close();
    },

    inspect(): void {
      controller.start();
      overlay?.open();
      if (!inspector) {
        return;
      }

      if (inspector.active) {
        inspector.stop();
        overlay?.setInspecting(false);
        return;
      }

      inspector.start();
      overlay?.setInspecting(true);
    },

    setDeveloperNote(note: string): void {
      developerNote = note;
    },

    selectElement(element: Element): CliteTargetContext {
      selectedTarget = getElementContext(element, requiredOptions);
      internals.emit({
        type: "context",
        severity: "info",
        summary: `Selected ${selectedTarget.selector}`,
        data: selectedTarget
      });
      overlay?.render(selectedTarget);
      return selectedTarget;
    },

    capturePacket(note?: string): ClitePacket {
      if (note !== undefined) {
        developerNote = note;
      }

      const eventList = events.toArray();
      const recentNetwork = eventList
        .filter((event): event is CliteEvent<CliteNetworkEntry> => event.type === "network")
        .map((event) => event.data)
        .filter((entry): entry is CliteNetworkEntry => Boolean(entry))
        .slice(-requiredOptions.maxNetworkEntries);
      const recentConsole = eventList.filter((event) => event.type === "console").slice(-requiredOptions.maxConsoleEntries);
      const recentErrors = eventList.filter((event) => event.type === "error").slice(-requiredOptions.maxConsoleEntries);

      return {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        app: requiredOptions.app,
        page: {
          url: location.href,
          title: document.title,
          referrer: document.referrer,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio
          },
          userAgent: navigator.userAgent,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        developerNote: developerNote || undefined,
        selectedTarget,
        events: eventList,
        recentNetwork,
        recentConsole,
        recentErrors,
        storage: captureStorage(requiredOptions),
        performance: capturePerformance(requiredOptions),
        customContext
      };
    },

    async copyMarkdown(note?: string): Promise<void> {
      const markdown = packetToMarkdown(controller.capturePacket(note));
      await writeClipboard(markdown);
      overlay?.setStatus("Markdown copied.");
    },

    async copyJson(note?: string): Promise<void> {
      await writeClipboard(packetToJson(controller.capturePacket(note)));
      overlay?.setStatus("JSON copied.");
    },

    downloadJson(note?: string): void {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadText(`clite-context-${timestamp}.json`, packetToJson(controller.capturePacket(note)), "application/json");
      overlay?.setStatus("JSON download started.");
    },

    addContext(key: string, value: unknown): void {
      customContext[key] = value;
      internals.emit({
        type: "context",
        severity: "info",
        summary: `Added context ${key}`,
        data: { key, value }
      });
    },

    mark(name: string, data?: unknown): void {
      internals.emit({
        type: "mark",
        severity: "info",
        summary: name,
        data
      });
    },

    getEvents(): CliteEvent[] {
      return events.toArray();
    }
  };

  if (requiredOptions.enabled) {
    queueMicrotask(() => controller.start());
  }

  return controller;
}

function normalizeOptions(options: CliteOptions): RequiredCliteOptions {
  return {
    enabled: options.enabled ?? true,
    app: options.app ?? {},
    maxEvents: options.maxEvents ?? 250,
    maxNetworkEntries: options.maxNetworkEntries ?? 80,
    maxConsoleEntries: options.maxConsoleEntries ?? 120,
    maxBodyBytes: options.maxBodyBytes ?? 4000,
    redaction: createRedactionOptions(options.redaction),
    capture: {
      fetch: options.capture?.fetch ?? true,
      xhr: options.capture?.xhr ?? true,
      console: options.capture?.console ?? true,
      errors: options.capture?.errors ?? true,
      clicks: options.capture?.clicks ?? true,
      inputs: options.capture?.inputs ?? true,
      route: options.capture?.route ?? true,
      storage: options.capture?.storage ?? true,
      performance: options.capture?.performance ?? true
    },
    ui: {
      zIndex: options.ui?.zIndex ?? 2147483000,
      startOpen: options.ui?.startOpen ?? false,
      shortcuts: options.ui?.shortcuts ?? true,
      position: options.ui?.position ?? "bottom-right"
    },
    source: {
      attributePrefix: options.source?.attributePrefix ?? "clite",
      openInEditorUrl: options.source?.openInEditorUrl ?? (() => undefined)
    },
    target: options.target ?? getDefaultTarget()
  };
}

function captureShortcuts(options: RequiredCliteOptions, controller: CliteController): StopCapture {
  if (!options.ui.shortcuts) {
    return () => undefined;
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.altKey || !event.shiftKey) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "c") {
      event.preventDefault();
      controller.open();
    }
    if (key === "i") {
      event.preventDefault();
      controller.inspect();
    }
  };

  document.addEventListener("keydown", onKeyDown, true);
  return () => document.removeEventListener("keydown", onKeyDown, true);
}

function canUseDom(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined" && Boolean(document.body);
}

function getDefaultTarget(): Document | ShadowRoot {
  if (typeof document !== "undefined") {
    return document;
  }

  return {} as Document;
}
