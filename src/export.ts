import type { CliteEvent, CliteNetworkEntry, ClitePacket } from "./types";
import { formatSource } from "./dom";
import { safeJson } from "./redact";

export function packetToJson(packet: ClitePacket): string {
  return safeJson(packet);
}

export function packetToMarkdown(packet: ClitePacket): string {
  const lines: string[] = [];

  lines.push("# Clite AI context packet");
  lines.push("");
  lines.push(`Generated: ${packet.generatedAt}`);
  if (packet.app?.name) {
    lines.push(`App: ${packet.app.name}${packet.app.version ? ` ${packet.app.version}` : ""}`);
  }
  lines.push(`URL: ${packet.page.url}`);
  lines.push(`Title: ${packet.page.title || "(untitled)"}`);
  lines.push(`Viewport: ${packet.page.viewport.width}x${packet.page.viewport.height} @${packet.page.viewport.devicePixelRatio}`);
  lines.push("");

  if (packet.developerNote) {
    lines.push("## Developer note");
    lines.push(packet.developerNote);
    lines.push("");
  }

  if (packet.selectedTarget) {
    const target = packet.selectedTarget;
    lines.push("## Selected UI");
    lines.push(`Selector: \`${target.selector}\``);
    lines.push(`Tag: \`${target.tagName}\``);
    if (target.role) lines.push(`Role: \`${target.role}\``);
    if (target.accessibleName) lines.push(`Name: ${target.accessibleName}`);
    if (target.textPreview) lines.push(`Text: ${target.textPreview}`);
    lines.push(`Rect: ${target.rect.width}x${target.rect.height} at (${target.rect.x}, ${target.rect.y})`);
    lines.push(`Source: ${formatSource(target.source)}`);
    if (target.ancestorSources.length > 1) {
      lines.push("Source ancestry:");
      for (const source of target.ancestorSources) {
        lines.push(`- ${formatSource(source)}`);
      }
    }
    lines.push("");
    lines.push("Attributes:");
    lines.push("```json");
    lines.push(safeJson(target.attributes));
    lines.push("```");
    lines.push("");
  }

  appendNetwork(lines, packet.recentNetwork);
  appendEvents(lines, "Console", packet.recentConsole);
  appendEvents(lines, "Errors", packet.recentErrors);
  appendEvents(lines, "Recent interaction timeline", packet.events.slice(-20));

  if (Object.keys(packet.customContext).length > 0) {
    lines.push("## Custom context");
    lines.push("```json");
    lines.push(safeJson(packet.customContext));
    lines.push("```");
    lines.push("");
  }

  if (packet.storage) {
    lines.push("## Storage snapshot");
    lines.push("```json");
    lines.push(safeJson(packet.storage));
    lines.push("```");
    lines.push("");
  }

  if (packet.performance) {
    lines.push("## Performance snapshot");
    lines.push("```json");
    lines.push(safeJson(packet.performance));
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

export async function writeClipboard(text: string): Promise<void> {
  if (globalThis.navigator?.clipboard?.writeText) {
    await globalThis.navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function downloadText(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function appendNetwork(lines: string[], entries: CliteNetworkEntry[]): void {
  lines.push("## Recent network");
  if (entries.length === 0) {
    lines.push("No captured fetch or XHR requests.");
    lines.push("");
    return;
  }

  for (const entry of entries.slice(-20)) {
    const status = entry.status ? `${entry.status} ${entry.statusText ?? ""}`.trim() : entry.error ?? "pending";
    lines.push(`- ${entry.method} ${entry.url} -> ${status} (${Math.round(entry.durationMs)}ms)`);
    if (entry.requestBodyPreview) lines.push(`  Request: ${entry.requestBodyPreview}`);
    if (entry.responseBodyPreview) lines.push(`  Response: ${entry.responseBodyPreview}`);
  }
  lines.push("");
}

function appendEvents(lines: string[], title: string, events: CliteEvent[]): void {
  lines.push(`## ${title}`);
  if (events.length === 0) {
    lines.push("No captured entries.");
    lines.push("");
    return;
  }

  for (const event of events.slice(-20)) {
    lines.push(`- [${event.timestamp}] ${event.severity ?? event.type}: ${event.summary}`);
  }
  lines.push("");
}
