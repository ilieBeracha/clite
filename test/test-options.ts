import { createRedactionOptions } from "../src/redact";
import type { RequiredCliteOptions } from "../src/types";

export function testOptions(overrides: Partial<RequiredCliteOptions> = {}): RequiredCliteOptions {
  const base: RequiredCliteOptions = {
    enabled: true,
    app: {},
    maxEvents: 100,
    maxNetworkEntries: 50,
    maxConsoleEntries: 50,
    maxBodyBytes: 1000,
    redaction: createRedactionOptions(undefined),
    capture: {
      fetch: true,
      xhr: true,
      console: true,
      errors: true,
      clicks: true,
      inputs: true,
      route: true,
      storage: true,
      performance: true
    },
    ui: {
      zIndex: 1000,
      startOpen: false,
      shortcuts: true,
      position: "bottom-right"
    },
    source: {
      attributePrefix: "clite",
      openInEditorUrl: () => undefined
    },
    target: document
  };

  return {
    ...base,
    ...overrides,
    capture: {
      ...base.capture,
      ...overrides.capture
    },
    ui: {
      ...base.ui,
      ...overrides.ui
    },
    source: {
      ...base.source,
      ...overrides.source
    },
    redaction: overrides.redaction ?? base.redaction
  };
}
