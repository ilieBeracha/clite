import type { RequiredCliteOptions } from "./types";

export class ElementInspector {
  #options: RequiredCliteOptions;
  #onSelect: (element: Element) => void;
  #active = false;
  #highlight: HTMLDivElement | undefined;

  constructor(options: RequiredCliteOptions, onSelect: (element: Element) => void) {
    this.#options = options;
    this.#onSelect = onSelect;
  }

  get active(): boolean {
    return this.#active;
  }

  start(): void {
    if (this.#active) {
      return;
    }

    this.#active = true;
    const highlight = document.createElement("div");
    highlight.setAttribute("data-clite-highlight", "true");
    Object.assign(highlight.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: String((this.#options.ui.zIndex ?? 2147483000) + 1),
      border: "1px solid #00E676",
      background: "rgba(0, 230, 118, 0.12)",
      boxShadow: "0 0 0 99999px rgba(0, 0, 0, 0.12)",
      display: "none"
    });
    document.body.append(highlight);
    this.#highlight = highlight;

    document.addEventListener("mousemove", this.#onMouseMove, true);
    document.addEventListener("click", this.#onClick, true);
    document.addEventListener("keydown", this.#onKeyDown, true);
    document.body.style.cursor = "crosshair";
  }

  stop(): void {
    if (!this.#active) {
      return;
    }

    this.#active = false;
    document.removeEventListener("mousemove", this.#onMouseMove, true);
    document.removeEventListener("click", this.#onClick, true);
    document.removeEventListener("keydown", this.#onKeyDown, true);
    document.body.style.cursor = "";
    this.#highlight?.remove();
    this.#highlight = undefined;
  }

  destroy(): void {
    this.stop();
  }

  #onMouseMove = (event: MouseEvent): void => {
    const element = this.#findTarget(event);
    if (!element || !this.#highlight) {
      return;
    }

    const rect = element.getBoundingClientRect();
    Object.assign(this.#highlight.style, {
      display: "block",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
  };

  #onClick = (event: MouseEvent): void => {
    const element = this.#findTarget(event);
    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.#onSelect(element);
    this.stop();
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.stop();
    }
  };

  #findTarget(event: Event): Element | undefined {
    const path = event.composedPath();
    for (const item of path) {
      if (!(item instanceof Element)) {
        continue;
      }
      if (item.closest("[data-clite-root]") || item.hasAttribute("data-clite-highlight")) {
        continue;
      }
      return item;
    }
    return undefined;
  }
}
