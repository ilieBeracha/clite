import type { CliteRect, CliteSourceLocation, CliteTargetContext, RequiredCliteOptions } from "./types";
import { isSensitiveKey, redactValue, truncate } from "./redact";

const STYLE_PROPERTIES = [
  "display",
  "position",
  "z-index",
  "box-sizing",
  "width",
  "height",
  "margin",
  "padding",
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "overflow",
  "opacity",
  "transform",
  "visibility",
  "pointer-events"
];

const SOURCE_KEYS = ["component", "source", "file", "line", "column", "owner"] as const;

export function getElementContext(element: Element, options: RequiredCliteOptions): CliteTargetContext {
  const htmlElement = element as HTMLElement;
  const rect = toRect(htmlElement.getBoundingClientRect());
  const attributes = getAttributes(element, options);
  const source = findNearestSource(element, options);
  const ancestorSources = findAncestorSources(element, options);
  const textPreview = normalizeText(element.textContent ?? "");

  return {
    tagName: element.tagName.toLowerCase(),
    selector: getCssSelector(element),
    role: getRole(element),
    accessibleName: getAccessibleName(element),
    id: htmlElement.id || undefined,
    classList: Array.from(element.classList),
    textPreview: textPreview ? truncate(textPreview, 400) : undefined,
    attributes,
    rect,
    computedStyle: getComputedStyleSnapshot(htmlElement),
    source,
    ancestorSources,
    outerHTMLPreview: truncate(redactValue(element.outerHTML, options.redaction), options.maxBodyBytes)
  };
}

export function getCssSelector(element: Element): string {
  const segments: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE && segments.length < 6) {
    const tag = current.tagName.toLowerCase();
    const id = current.getAttribute("id");
    if (id) {
      segments.unshift(`${tag}#${cssEscape(id)}`);
      break;
    }

    const testId = current.getAttribute("data-testid") ?? current.getAttribute("data-test") ?? current.getAttribute("data-cy");
    if (testId) {
      segments.unshift(`${tag}[data-testid="${escapeAttribute(testId)}"]`);
      current = current.parentElement;
      continue;
    }

    const classes = Array.from(current.classList)
      .filter(Boolean)
      .slice(0, 3)
      .map((className) => `.${cssEscape(className)}`)
      .join("");
    const siblingIndex = getSiblingIndex(current);
    segments.unshift(`${tag}${classes}${siblingIndex > 1 ? `:nth-of-type(${siblingIndex})` : ""}`);
    current = current.parentElement;
  }

  return segments.join(" > ");
}

export function getSourceFromElement(element: Element, options: RequiredCliteOptions): CliteSourceLocation | undefined {
  const prefix = options.source.attributePrefix;
  const read = (name: string) => element.getAttribute(`data-${prefix}-${name}`);
  const component = read("component");
  const file = read("source") ?? read("file");
  const line = toOptionalNumber(read("line"));
  const column = toOptionalNumber(read("column"));
  const owner = read("owner");

  if (!component && !file && !owner) {
    return undefined;
  }

  return {
    component: component || undefined,
    file: file || undefined,
    line,
    column,
    owner: owner || undefined
  };
}

export function formatSource(source: CliteSourceLocation | undefined): string {
  if (!source) {
    return "unknown";
  }

  const file = source.file ?? "unknown-file";
  const location = source.line ? `:${source.line}${source.column ? `:${source.column}` : ""}` : "";
  return `${source.component ? `${source.component} ` : ""}${file}${location}`;
}

function findNearestSource(element: Element, options: RequiredCliteOptions): CliteSourceLocation | undefined {
  let current: Element | null = element;
  while (current) {
    const source = getSourceFromElement(current, options);
    if (source) {
      return source;
    }
    current = current.parentElement;
  }

  return undefined;
}

function findAncestorSources(element: Element, options: RequiredCliteOptions): CliteSourceLocation[] {
  const sources: CliteSourceLocation[] = [];
  const seen = new Set<string>();
  let current: Element | null = element;

  while (current && sources.length < 8) {
    const source = getSourceFromElement(current, options);
    if (source) {
      const key = `${source.component ?? ""}|${source.file ?? ""}|${source.line ?? ""}|${source.column ?? ""}`;
      if (!seen.has(key)) {
        sources.push(source);
        seen.add(key);
      }
    }
    current = current.parentElement;
  }

  return sources;
}

function getAttributes(element: Element, options: RequiredCliteOptions): Record<string, string> {
  const output: Record<string, string> = {};
  for (const attribute of Array.from(element.attributes)) {
    const keyHint = getAttributeRedactionKey(element, attribute.name);
    const redacted = redactValue(attribute.value, options.redaction, keyHint);
    output[attribute.name] = truncate(redacted, 500);
  }
  return output;
}

function getAttributeRedactionKey(element: Element, attributeName: string): string {
  if (attributeName !== "value") {
    return attributeName;
  }

  const type = element.getAttribute("type");
  const name = element.getAttribute("name");
  if (type && isSensitiveKey(type, { replacement: "", keys: ["password", "secret", "token"], patterns: [], urlParams: [] })) {
    return type;
  }

  return name ?? attributeName;
}

function getComputedStyleSnapshot(element: HTMLElement): Record<string, string> {
  if (!element.ownerDocument.defaultView) {
    return {};
  }

  const style = element.ownerDocument.defaultView.getComputedStyle(element);
  const output: Record<string, string> = {};
  for (const property of STYLE_PROPERTIES) {
    output[property] = style.getPropertyValue(property);
  }
  return output;
}

function getRole(element: Element): string | undefined {
  const explicit = element.getAttribute("role");
  if (explicit) {
    return explicit;
  }

  const tag = element.tagName.toLowerCase();
  const inputType = element.getAttribute("type")?.toLowerCase();
  if (tag === "button") return "button";
  if (tag === "a" && element.hasAttribute("href")) return "link";
  if (tag === "input" && inputType === "checkbox") return "checkbox";
  if (tag === "input" && inputType === "radio") return "radio";
  if (tag === "input" || tag === "textarea") return "textbox";
  if (tag === "select") return "combobox";
  if (tag === "img") return "img";
  if (/^h[1-6]$/.test(tag)) return "heading";
  return undefined;
}

function getAccessibleName(element: Element): string | undefined {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    return normalizeText(ariaLabel);
  }

  const ariaLabelledBy = element.getAttribute("aria-labelledby");
  if (ariaLabelledBy && element.ownerDocument) {
    const label = ariaLabelledBy
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? "")
      .join(" ");
    const normalized = normalizeText(label);
    if (normalized) {
      return normalized;
    }
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    const id = element.id;
    if (id) {
      const label = element.ownerDocument.querySelector(`label[for="${escapeAttribute(id)}"]`);
      const normalized = normalizeText(label?.textContent ?? "");
      if (normalized) {
        return normalized;
      }
    }
  }

  const text = normalizeText(element.textContent ?? "");
  return text ? truncate(text, 120) : undefined;
}

function toRect(rect: DOMRect): CliteRect {
  return {
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
    top: round(rect.top),
    right: round(rect.right),
    bottom: round(rect.bottom),
    left: round(rect.left)
  };
}

function getSiblingIndex(element: Element): number {
  const tag = element.tagName;
  let index = 1;
  let sibling = element.previousElementSibling;
  while (sibling) {
    if (sibling.tagName === tag) {
      index += 1;
    }
    sibling = sibling.previousElementSibling;
  }
  return index;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toOptionalNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function cssEscape(value: string): string {
  if (globalThis.CSS?.escape) {
    return globalThis.CSS.escape(value);
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function escapeAttribute(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function sourceAttributeNames(prefix: string): string[] {
  return SOURCE_KEYS.map((key) => `data-${prefix}-${key}`);
}
