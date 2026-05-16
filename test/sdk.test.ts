import { describe, expect, it, vi } from "vitest";
import { createClite } from "../src";

describe("createClite", () => {
  it("mounts the overlay and captures selected UI context", async () => {
    document.body.innerHTML = `<button data-clite-component="SaveButton" data-clite-source="/src/SaveButton.tsx" data-clite-line="8">Save</button>`;

    const controller = createClite({
      capture: {
        fetch: false,
        xhr: false,
        console: false,
        errors: false,
        clicks: false,
        inputs: false,
        route: false,
        storage: false,
        performance: false
      }
    });
    await Promise.resolve();

    const target = controller.selectElement(document.querySelector("button")!);
    controller.setDeveloperNote("Expected a save request.");
    controller.addContext("activeAccountId", "acct_123");
    const packet = controller.capturePacket();
    const host = document.querySelector<HTMLElement>("[data-clite-root]");

    expect(host).toBeTruthy();
    expect(host?.style.pointerEvents).toBe("none");
    expect(host?.style.width).toBe("0px");
    expect(target.source?.component).toBe("SaveButton");
    expect(packet.developerNote).toBe("Expected a save request.");
    expect(packet.customContext.activeAccountId).toBe("acct_123");

    controller.destroy();
  });

  it("captures fetch requests without leaking sensitive fields", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ token: "server-token", ok: true }), {
        status: 201,
        statusText: "Created",
        headers: { "content-type": "application/json" }
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const controller = createClite({
      capture: {
        xhr: false,
        console: false,
        errors: false,
        clicks: false,
        inputs: false,
        route: false,
        storage: false,
        performance: false
      }
    });
    await Promise.resolve();

    await fetch("/api/save?token=client-token", {
      method: "POST",
      headers: { Authorization: "Bearer client-token" },
      body: JSON.stringify({ password: "secret", value: "safe" })
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const packet = controller.capturePacket();
    const entry = packet.recentNetwork[0];

    expect(entry?.method).toBe("POST");
    expect(entry?.url).toContain("%5BREDACTED%5D");
    expect(entry?.requestHeaders?.authorization).toBe("[REDACTED]");
    expect(entry?.requestBodyPreview).toContain("[REDACTED]");
    expect(entry?.responseBodyPreview).toContain("[REDACTED]");

    controller.destroy();
    globalThis.fetch = originalFetch;
  });
});
