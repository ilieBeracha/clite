import { createClite } from "../src";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Demo root missing");
}

app.innerHTML = `
  <div class="shell">
    <aside data-clite-component="DemoSidebar" data-clite-source="/demo/main.ts" data-clite-line="13">
      <h1>Clite demo</h1>
      <p>Use the CLITE button, then Inspect, then click any UI element.</p>
      <nav class="nav" aria-label="Demo actions">
        <button type="button" data-action="console" data-clite-component="ConsoleAction" data-clite-source="/demo/main.ts" data-clite-line="18">Emit console</button>
        <button type="button" data-action="network" data-clite-component="NetworkAction" data-clite-source="/demo/main.ts" data-clite-line="19">Send request</button>
        <button type="button" data-action="error" data-clite-component="ErrorAction" data-clite-source="/demo/main.ts" data-clite-line="20">Throw error</button>
      </nav>
    </aside>
    <main data-clite-component="DemoMain" data-clite-source="/demo/main.ts" data-clite-line="23">
      <h2>Account settings</h2>
      <p>The overlay captures this form, nearby source attributes, console activity, fetch/XHR calls, storage, and a concise DOM snapshot.</p>
      <section class="panel" data-clite-component="SettingsForm" data-clite-source="/demo/main.ts" data-clite-line="27">
        <div class="panel-header">Profile</div>
        <form class="panel-body stack">
          <div class="grid">
            <label>
              Display name
              <input name="displayName" value="Maya Lieber" />
            </label>
            <label>
              API token
              <input name="apiToken" value="sk-demo-secret-token" />
            </label>
          </div>
          <label>
            Notes
            <textarea name="notes">Save should call /api/profile and keep the button enabled.</textarea>
          </label>
          <button type="button" data-action="save" data-clite-component="SaveProfileButton" data-clite-source="/demo/main.ts" data-clite-line="46">Save profile</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-header">Last action</div>
        <div class="panel-body">
          <pre id="log">No action yet.</pre>
        </div>
      </section>
    </main>
  </div>
`;

localStorage.setItem("authToken", "sk-demo-local-storage-token");
sessionStorage.setItem("activeAccountId", "acct_demo_001");

const clite = createClite({
  app: {
    name: "Clite demo",
    version: "0.1.0",
    environment: "development"
  },
  ui: {
    startOpen: true
  }
});

clite.addContext("demoHint", {
  expectedFlow: "Click Save profile and verify the generated AI packet has source, network, console, storage, and target context."
});

document.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;
  const log = document.querySelector<HTMLPreElement>("#log");

  if (action === "console") {
    console.warn("Demo warning", { token: "sk-demo-console-token", view: "settings" });
    if (log) log.textContent = "Console warning emitted.";
  }

  if (action === "network" || action === "save") {
    await fetch("/api/profile?token=sk-demo-url-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer sk-demo-header-token"
      },
      body: JSON.stringify({
        displayName: "Maya Lieber",
        password: "demo-password",
        saveMode: action
      })
    }).catch(() => undefined);
    if (log) log.textContent = "Demo request sent. Vite returns 404, which is useful context.";
  }

  if (action === "error") {
    setTimeout(() => {
      throw new Error("Demo error from Clite overlay");
    }, 0);
    if (log) log.textContent = "Error scheduled.";
  }
});
