export const CLITE_STYLES = `
:host {
  all: initial;
  color-scheme: dark;
  --clite-bg: #000000;
  --clite-panel: #0B0C0A;
  --clite-text: #E8FFE8;
  --clite-muted: #93A393;
  --clite-line: #2B332B;
  --clite-signal: #00E676;
  --clite-warn: #FFB800;
  --clite-error: #FF3B30;
  font-family: "IBM Plex Mono", "JetBrains Mono", "Berkeley Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
  letter-spacing: 0;
}

* {
  box-sizing: border-box;
}

button,
textarea {
  font: inherit;
}

.clite-root {
  position: static;
  pointer-events: none;
}

.clite-button {
  position: fixed;
  width: 64px;
  height: 34px;
  border: 1px solid var(--clite-signal);
  background: var(--clite-bg);
  color: var(--clite-signal);
  box-shadow: none;
  cursor: pointer;
  pointer-events: auto;
  font-weight: 700;
}

.clite-button[data-position="bottom-right"] {
  right: 16px;
  bottom: 16px;
}

.clite-button[data-position="bottom-left"] {
  left: 16px;
  bottom: 16px;
}

.clite-button[data-position="top-right"] {
  right: 16px;
  top: 16px;
}

.clite-button[data-position="top-left"] {
  left: 16px;
  top: 16px;
}

.clite-panel {
  position: fixed;
  right: 16px;
  bottom: 62px;
  width: min(760px, calc(100vw - 32px));
  max-height: min(760px, calc(100vh - 92px));
  background: var(--clite-panel);
  color: var(--clite-text);
  border: 1px solid var(--clite-signal);
  display: none;
  pointer-events: auto;
  overflow: hidden;
}

.clite-panel[data-open="true"] {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
}

.clite-header,
.clite-toolbar,
.clite-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--clite-line);
  padding: 8px;
}

.clite-header {
  justify-content: space-between;
}

.clite-title {
  color: var(--clite-signal);
  font-weight: 700;
}

.clite-subtitle {
  color: var(--clite-muted);
  margin-left: 8px;
}

.clite-toolbar {
  flex-wrap: wrap;
}

.clite-footer {
  border-top: 1px solid var(--clite-line);
  border-bottom: 0;
  justify-content: space-between;
  color: var(--clite-muted);
}

.clite-main {
  overflow: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.75fr);
  min-height: 0;
}

.clite-column {
  min-width: 0;
  border-right: 1px solid var(--clite-line);
}

.clite-column:last-child {
  border-right: 0;
}

.clite-section {
  border-bottom: 1px solid var(--clite-line);
  padding: 8px;
}

.clite-section-title {
  color: var(--clite-signal);
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
}

.clite-textarea {
  width: 100%;
  min-height: 88px;
  resize: vertical;
  background: #000000;
  color: var(--clite-text);
  border: 1px solid var(--clite-line);
  padding: 8px;
  outline: 0;
}

.clite-textarea:focus {
  border-color: var(--clite-signal);
}

.clite-action {
  border: 1px solid var(--clite-line);
  background: #000000;
  color: var(--clite-text);
  height: 30px;
  padding: 0 10px;
  cursor: pointer;
}

.clite-action:hover,
.clite-action:focus {
  border-color: var(--clite-signal);
  color: var(--clite-signal);
}

.clite-action[data-active="true"] {
  background: var(--clite-signal);
  color: #000000;
  border-color: var(--clite-signal);
}

.clite-action[data-danger="true"]:hover,
.clite-action[data-danger="true"]:focus {
  border-color: var(--clite-error);
  color: var(--clite-error);
}

.clite-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--clite-text);
  background: #000000;
  border: 1px solid var(--clite-line);
  padding: 8px;
  max-height: 220px;
  overflow: auto;
  font-variant-numeric: tabular-nums;
}

.clite-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.clite-list-item {
  border: 1px solid var(--clite-line);
  padding: 6px;
  min-width: 0;
}

.clite-list-item strong {
  color: var(--clite-signal);
}

.clite-list-item[data-severity="warn"] strong {
  color: var(--clite-warn);
}

.clite-list-item[data-severity="error"] strong {
  color: var(--clite-error);
}

.clite-empty {
  color: var(--clite-muted);
}

.clite-status {
  color: var(--clite-muted);
}

@media (max-width: 720px) {
  .clite-panel {
    inset: 8px;
    width: auto;
    max-height: none;
  }

  .clite-main {
    grid-template-columns: 1fr;
  }

  .clite-column {
    border-right: 0;
  }
}
`;
