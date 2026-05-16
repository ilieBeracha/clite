# Architecture

Clite is a browser-side SDK with no runtime dependencies.

## Modules

- `src/sdk.ts`: public controller, packet assembly, lifecycle.
- `src/ui.ts`: Shadow DOM overlay and controls.
- `src/inspector.ts`: element hover/click picker.
- `src/capture-network.ts`: `fetch` and `XMLHttpRequest` instrumentation.
- `src/capture-console.ts`: console instrumentation.
- `src/capture-errors.ts`: runtime error instrumentation.
- `src/capture-interactions.ts`: clicks, inputs, and History API route changes.
- `src/dom.ts`: selector, accessibility, source metadata, and DOM snapshot utilities.
- `src/redact.ts`: redaction, truncation, and JSON serialization.
- `babel/index.cjs`: opt-in JSX source metadata injector.

## Packet Flow

1. `createClite()` normalizes options and schedules `start()`.
2. Capture adapters append events into a bounded ring buffer.
3. The inspector converts a clicked element into `CliteTargetContext`.
4. `capturePacket()` joins page metadata, selected UI, recent events, network, storage, performance, and custom context.
5. The overlay copies Markdown or JSON through explicit user actions.

## Why Data Attributes

Browser runtime APIs cannot reliably map an arbitrary DOM node to the exact source file and parent component tree across React versions and frameworks. Clite uses `data-clite-*` attributes because they are stable, framework-neutral, easy to inspect, and can be injected by build tooling.

The Babel plugin is deliberately small: it runs inside the host app's existing JSX transform and adds attributes from Babel's filename and node locations.
