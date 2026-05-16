# AI Packets

The Markdown packet is designed for direct paste into an AI coding agent. It leads with the developer note, page URL, selected UI, and source metadata, then includes the recent timeline, network, console, errors, storage, and performance snapshots.

The JSON packet preserves the same data with machine-readable structure:

```ts
import { createClite } from "@clite-dev/overlay";

const clite = createClite();

const packet = clite.capturePacket("Expected the Save button to call POST /api/profile.");
```

Recommended prompt shape:

```text
Use this Clite packet to find the relevant code and fix the issue. Start from the selected source file and verify against the captured network and console data.

<paste packet here>
```

## What To Look For

- `selectedTarget.source`: exact component/source hint when source metadata is installed.
- `selectedTarget.ancestorSources`: parent component chain from annotated ancestors.
- `recentNetwork`: failed or unexpected requests around the click.
- `recentConsole` and `recentErrors`: runtime signals.
- `customContext`: app-specific state you added with `addContext()`.
