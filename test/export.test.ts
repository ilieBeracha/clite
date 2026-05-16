import { describe, expect, it } from "vitest";
import { packetToMarkdown } from "../src/export";
import type { ClitePacket } from "../src/types";

describe("export", () => {
  it("renders an AI-readable markdown packet", () => {
    const packet: ClitePacket = {
      schemaVersion: 1,
      generatedAt: "2026-05-16T00:00:00.000Z",
      page: {
        url: "http://localhost:3000/settings",
        title: "Settings",
        referrer: "",
        viewport: { width: 1200, height: 800, devicePixelRatio: 2 },
        userAgent: "Vitest",
        language: "en",
        timezone: "UTC"
      },
      developerNote: "The Save button does nothing.",
      events: [],
      recentNetwork: [],
      recentConsole: [],
      recentErrors: [],
      customContext: {}
    };

    const markdown = packetToMarkdown(packet);

    expect(markdown).toContain("# Clite AI context packet");
    expect(markdown).toContain("The Save button does nothing.");
    expect(markdown).toContain("http://localhost:3000/settings");
  });
});
