import type { ClitePerformanceSnapshot, CliteStorageSnapshot, RequiredCliteOptions } from "./types";
import { redactValue, truncate } from "./redact";

export function captureStorage(options: RequiredCliteOptions): CliteStorageSnapshot | undefined {
  if (!options.capture.storage) {
    return undefined;
  }

  return {
    localStorage: readStorage(globalThis.localStorage, options),
    sessionStorage: readStorage(globalThis.sessionStorage, options)
  };
}

export function capturePerformance(options: RequiredCliteOptions): ClitePerformanceSnapshot | undefined {
  if (!options.capture.performance || !globalThis.performance) {
    return undefined;
  }

  const resources = performance
    .getEntriesByType("resource")
    .slice(-30)
    .map((entry) => {
      const resource = entry as PerformanceResourceTiming;
      return {
        name: truncate(redactValue(resource.name, options.redaction), 500),
        initiatorType: resource.initiatorType,
        duration: round(resource.duration),
        transferSize: resource.transferSize,
        encodedBodySize: resource.encodedBodySize,
        decodedBodySize: resource.decodedBodySize
      };
    });

  const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const navigation = navigationEntry
    ? {
        type: navigationEntry.type,
        startTime: round(navigationEntry.startTime),
        domContentLoadedEventEnd: round(navigationEntry.domContentLoadedEventEnd),
        loadEventEnd: round(navigationEntry.loadEventEnd),
        duration: round(navigationEntry.duration),
        transferSize: navigationEntry.transferSize,
        encodedBodySize: navigationEntry.encodedBodySize,
        decodedBodySize: navigationEntry.decodedBodySize
      }
    : undefined;

  return {
    navigation,
    resources
  };
}

function readStorage(storage: Storage | undefined, options: RequiredCliteOptions): Record<string, string> {
  const output: Record<string, string> = {};
  if (!storage) {
    return output;
  }

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const value = storage.getItem(key) ?? "";
      output[key] = truncate(redactValue(value, options.redaction, key), 1000);
    }
  } catch {
    return output;
  }

  return output;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
