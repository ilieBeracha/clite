# Research Notes

Clite borrows proven ideas from existing developer tools, but combines them for AI handoff:

- LocatorJS-style source lookup: click UI and jump toward source.
- rrweb/Sentry/OpenReplay-style browser event capture: keep a recent replay-adjacent timeline.
- DevTools-style diagnostics: console, errors, network, storage, and performance context.

The key difference is the output format. Clite does not try to be a full replay backend. It creates a compact, redacted packet that can be pasted into an AI agent along with a short developer note.
