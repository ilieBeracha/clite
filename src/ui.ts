import type { ClitePacket, CliteTargetContext, RequiredCliteOptions } from "./types";
import { packetToJson } from "./export";
import { safeJson } from "./redact";
import { CLITE_STYLES } from "./styles";

export interface CliteOverlayCallbacks {
  inspect(): void;
  copyMarkdown(): void;
  copyJson(): void;
  downloadJson(): void;
  setDeveloperNote(note: string): void;
  capturePacket(): ClitePacket;
  destroy(): void;
}

export class CliteOverlay {
  #options: RequiredCliteOptions;
  #callbacks: CliteOverlayCallbacks;
  #host: HTMLDivElement | undefined;
  #shadow: ShadowRoot | undefined;
  #panel: HTMLElement | undefined;
  #button: HTMLButtonElement | undefined;
  #status: HTMLElement | undefined;
  #note: HTMLTextAreaElement | undefined;
  #target: HTMLElement | undefined;
  #timeline: HTMLElement | undefined;
  #network: HTMLElement | undefined;
  #console: HTMLElement | undefined;
  #packet: HTMLElement | undefined;
  #open = false;

  constructor(options: RequiredCliteOptions, callbacks: CliteOverlayCallbacks) {
    this.#options = options;
    this.#callbacks = callbacks;
  }

  mount(): void {
    if (this.#host) {
      return;
    }

    const host = document.createElement("div");
    host.setAttribute("data-clite-root", "true");
    Object.assign(host.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "0",
      height: "0",
      zIndex: String(this.#options.ui.zIndex ?? 2147483000),
      pointerEvents: "none"
    });
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CLITE_STYLES;
    shadow.append(style);

    const root = document.createElement("div");
    root.className = "clite-root";
    root.style.setProperty("--clite-z-index", String(this.#options.ui.zIndex));
    shadow.append(root);

    const button = document.createElement("button");
    button.className = "clite-button";
    button.type = "button";
    button.textContent = "CLITE";
    button.dataset.position = this.#options.ui.position;
    button.addEventListener("click", () => this.toggle());
    root.append(button);

    const panel = this.#buildPanel();
    root.append(panel);

    document.body.append(host);

    this.#host = host;
    this.#shadow = shadow;
    this.#panel = panel;
    this.#button = button;

    if (this.#options.ui.startOpen) {
      this.open();
    }

    this.render();
  }

  destroy(): void {
    this.#host?.remove();
    this.#host = undefined;
    this.#shadow = undefined;
  }

  open(): void {
    this.#open = true;
    if (this.#panel) {
      this.#panel.dataset.open = "true";
    }
    this.render();
  }

  close(): void {
    this.#open = false;
    if (this.#panel) {
      this.#panel.dataset.open = "false";
    }
  }

  toggle(): void {
    if (this.#open) {
      this.close();
    } else {
      this.open();
    }
  }

  setStatus(message: string): void {
    if (this.#status) {
      this.#status.textContent = message;
    }
  }

  setInspecting(active: boolean): void {
    const inspectButton = this.#shadow?.querySelector<HTMLButtonElement>('[data-clite-action="inspect"]');
    if (inspectButton) {
      inspectButton.dataset.active = String(active);
    }
    this.setStatus(active ? "Click a UI element. Escape cancels." : "Ready.");
  }

  render(selectedTarget?: CliteTargetContext): void {
    if (!this.#host) {
      return;
    }

    const packet = this.#callbacks.capturePacket();
    if (this.#target) {
      this.#target.textContent = selectedTarget || packet.selectedTarget ? safeJson(selectedTarget ?? packet.selectedTarget) : "No selected element. Click Inspect, then click the UI.";
    }

    if (this.#timeline) {
      this.#timeline.replaceChildren(...renderEvents(packet.events.slice(-12)));
    }

    if (this.#network) {
      this.#network.replaceChildren(...renderNetwork(packet.recentNetwork.slice(-10)));
    }

    if (this.#console) {
      this.#console.replaceChildren(...renderEvents([...packet.recentConsole, ...packet.recentErrors].slice(-10)));
    }

    if (this.#packet) {
      this.#packet.textContent = packetToJson({
        ...packet,
        events: packet.events.slice(-8),
        recentNetwork: packet.recentNetwork.slice(-5),
        recentConsole: packet.recentConsole.slice(-5),
        recentErrors: packet.recentErrors.slice(-5)
      });
    }
  }

  #buildPanel(): HTMLElement {
    const panel = document.createElement("section");
    panel.className = "clite-panel";
    panel.dataset.open = "false";

    const header = document.createElement("header");
    header.className = "clite-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("span");
    title.className = "clite-title";
    title.textContent = "Clite";
    const subtitle = document.createElement("span");
    subtitle.className = "clite-subtitle";
    subtitle.textContent = "AI context capture";
    titleWrap.append(title, subtitle);

    const close = actionButton("Close");
    close.dataset.danger = "true";
    close.addEventListener("click", () => this.close());
    header.append(titleWrap, close);
    panel.append(header);

    const toolbar = document.createElement("div");
    toolbar.className = "clite-toolbar";
    const inspect = actionButton("Inspect");
    inspect.dataset.cliteAction = "inspect";
    inspect.addEventListener("click", () => this.#callbacks.inspect());
    const markdown = actionButton("Copy Markdown");
    markdown.addEventListener("click", () => this.#callbacks.copyMarkdown());
    const json = actionButton("Copy JSON");
    json.addEventListener("click", () => this.#callbacks.copyJson());
    const download = actionButton("Download JSON");
    download.addEventListener("click", () => this.#callbacks.downloadJson());
    toolbar.append(inspect, markdown, json, download);
    panel.append(toolbar);

    const main = document.createElement("main");
    main.className = "clite-main";
    const left = document.createElement("div");
    left.className = "clite-column";
    const right = document.createElement("div");
    right.className = "clite-column";

    const noteSection = section("Context input");
    const note = document.createElement("textarea");
    note.className = "clite-textarea";
    note.placeholder = "What should the AI know about the bug, task, or expected behavior?";
    note.addEventListener("input", () => this.#callbacks.setDeveloperNote(note.value));
    noteSection.append(note);
    this.#note = note;

    const targetSection = section("Selected UI");
    const target = pre();
    targetSection.append(target);
    this.#target = target;

    const timelineSection = section("Recent timeline");
    const timeline = document.createElement("ul");
    timeline.className = "clite-list";
    timelineSection.append(timeline);
    this.#timeline = timeline;

    const networkSection = section("Network");
    const network = document.createElement("ul");
    network.className = "clite-list";
    networkSection.append(network);
    this.#network = network;

    const consoleSection = section("Console and errors");
    const consoleOutput = document.createElement("ul");
    consoleOutput.className = "clite-list";
    consoleSection.append(consoleOutput);
    this.#console = consoleOutput;

    const packetSection = section("Packet preview");
    const packet = pre();
    packetSection.append(packet);
    this.#packet = packet;

    left.append(noteSection, targetSection, timelineSection);
    right.append(networkSection, consoleSection, packetSection);
    main.append(left, right);
    panel.append(main);

    const footer = document.createElement("footer");
    footer.className = "clite-footer";
    const status = document.createElement("span");
    status.className = "clite-status";
    status.textContent = "Ready.";
    const destroy = actionButton("Destroy");
    destroy.dataset.danger = "true";
    destroy.addEventListener("click", () => this.#callbacks.destroy());
    footer.append(status, destroy);
    this.#status = status;
    panel.append(footer);

    return panel;
  }
}

function section(titleText: string): HTMLElement {
  const sectionElement = document.createElement("section");
  sectionElement.className = "clite-section";
  const title = document.createElement("h2");
  title.className = "clite-section-title";
  title.textContent = titleText;
  sectionElement.append(title);
  return sectionElement;
}

function pre(): HTMLElement {
  const element = document.createElement("pre");
  element.className = "clite-pre";
  return element;
}

function actionButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "clite-action";
  button.type = "button";
  button.textContent = label;
  return button;
}

function renderEvents(events: Array<{ type: string; severity?: string | undefined; timestamp: string; summary: string }>): HTMLElement[] {
  if (events.length === 0) {
    return [emptyItem("No captured entries.")];
  }

  return events.map((event) => {
    const item = document.createElement("li");
    item.className = "clite-list-item";
    item.dataset.severity = event.severity ?? "info";
    const strong = document.createElement("strong");
    strong.textContent = event.type;
    const text = document.createElement("span");
    text.textContent = ` ${new Date(event.timestamp).toLocaleTimeString()} ${event.summary}`;
    item.append(strong, text);
    return item;
  });
}

function renderNetwork(entries: Array<{ method: string; url: string; status?: number | undefined; error?: string | undefined; durationMs: number }>): HTMLElement[] {
  if (entries.length === 0) {
    return [emptyItem("No captured requests.")];
  }

  return entries.map((entry) => {
    const item = document.createElement("li");
    item.className = "clite-list-item";
    item.dataset.severity = entry.error || (entry.status && entry.status >= 400) ? "error" : "info";
    const strong = document.createElement("strong");
    strong.textContent = entry.method;
    const text = document.createElement("span");
    text.textContent = ` ${entry.url} -> ${entry.status ?? entry.error ?? "pending"} (${Math.round(entry.durationMs)}ms)`;
    item.append(strong, text);
    return item;
  });
}

function emptyItem(message: string): HTMLElement {
  const item = document.createElement("li");
  item.className = "clite-empty";
  item.textContent = message;
  return item;
}
