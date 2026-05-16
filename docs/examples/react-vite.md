# React + Vite Example

Install:

```sh
npm install @clite-dev/overlay --save-dev
```

Configure React's Babel transform:

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

Start Clite from the app entry:

```ts
import { createClite } from "@clite-dev/overlay";

if (import.meta.env.DEV) {
  const clite = createClite({
    app: {
      name: "web",
      version: import.meta.env.VITE_APP_VERSION,
      environment: import.meta.env.MODE,
      commit: import.meta.env.VITE_GIT_SHA
    }
  });

  window.__clite = clite;
}
```

Optional TypeScript global:

```ts
import type { CliteController } from "@clite-dev/overlay";

declare global {
  interface Window {
    __clite?: CliteController;
  }
}
```
