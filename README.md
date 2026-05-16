# Clite

Clite is a dev-only browser overlay for sending precise app context to AI coding agents. Install it in a local web app, click the floating `CLITE` button, inspect any point on the screen, add a short note, then copy a Markdown or JSON packet with the selected UI, source metadata, console logs, network requests, storage, performance entries, route changes, and recent interaction timeline.

It is built for the workflow where "this button is broken" is not enough. The packet gives the agent the DOM target, surrounding component metadata, the requests that just happened, the console output, and the exact context note in one paste.

## Install

```sh
npm install @clite-dev/overlay --save-dev
```

Use it only in development builds.

```ts
import { createClite } from "@clite-dev/overlay";

if (import.meta.env.DEV) {
  createClite({
    app: {
      name: "Dashboard",
      version: import.meta.env.VITE_APP_VERSION,
      environment: import.meta.env.MODE
    }
  });
}
```

## React and Vite Source Metadata

Clite can read source metadata from `data-clite-*` attributes. For React projects using `@vitejs/plugin-react`, add the Babel plugin in development:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: mode === "development" ? ["@clite-dev/overlay/babel"] : []
      }
    })
  ]
}));
```

The plugin adds:

```html
data-clite-component="SaveButton"
data-clite-source="/absolute/path/src/SaveButton.tsx"
data-clite-line="18"
data-clite-column="10"
```

Manual annotations also work in any framework:

```html
<button
  data-clite-component="SaveButton"
  data-clite-source="/src/features/settings/SaveButton.tsx"
  data-clite-line="42"
>
  Save
</button>
```

## Capture Surface

Clite captures:

- Selected element selector, role, accessible name, text preview, attributes, rect, computed styles, and sanitized HTML preview.
- Source metadata from the selected element and annotated ancestors.
- `fetch` and `XMLHttpRequest` method, URL, status, duration, headers, request body preview, and response body preview.
- Console `debug`, `info`, `log`, `warn`, and `error` calls with stack context.
- Runtime errors and unhandled promise rejections.
- Click, input, and route timeline.
- `localStorage`, `sessionStorage`, navigation timing, and recent resource timing.
- Custom context added through `addContext()`.

Sensitive keys, auth headers, bearer/basic tokens, common OAuth parameters, cookies, passwords, API keys, and session-like fields are redacted by default.

## API

```ts
const clite = createClite({
  enabled: true,
  app: { name: "Billing", environment: "development" },
  maxEvents: 250,
  maxNetworkEntries: 80,
  maxConsoleEntries: 120,
  maxBodyBytes: 4000,
  redaction: {
    keys: ["tenantSecret"],
    urlParams: ["signed_url"],
    patterns: [/internal-[a-z0-9]+/gi]
  },
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
    startOpen: false,
    shortcuts: true,
    position: "bottom-right"
  }
});

clite.addContext("currentAccount", { id: "acct_123" });
clite.mark("Opened settings");
clite.inspect();
const packet = clite.capturePacket("Save button is expected to POST /api/profile.");
await clite.copyMarkdown();
```

## Keyboard

- `Alt+Shift+C`: open the overlay.
- `Alt+Shift+I`: enter inspect mode.
- `Escape`: cancel inspect mode.

## Demo

```sh
npm install
npm run dev
```

Open the printed local URL, click `CLITE`, use `Inspect`, then click the demo form or action buttons.

## Privacy Model

Clite is local-first. It does not send packets anywhere. Copy and download actions are user-triggered. Keep it out of production builds, and add project-specific redaction rules for domain secrets.

For details, see [docs/privacy.md](docs/privacy.md).
# clite
