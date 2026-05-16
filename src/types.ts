export type CliteEventType =
  | "console"
  | "error"
  | "network"
  | "route"
  | "click"
  | "input"
  | "mark"
  | "context";

export type CliteSeverity = "debug" | "info" | "warn" | "error";

export interface CliteEvent<TData = unknown> {
  id: string;
  type: CliteEventType;
  timestamp: string;
  summary: string;
  severity?: CliteSeverity | undefined;
  data?: TData | undefined;
}

export interface CliteRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CliteSourceLocation {
  component?: string | undefined;
  file?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
  owner?: string | undefined;
}

export interface CliteTargetContext {
  tagName: string;
  selector: string;
  role?: string | undefined;
  accessibleName?: string | undefined;
  id?: string | undefined;
  classList: string[];
  textPreview?: string | undefined;
  attributes: Record<string, string>;
  rect: CliteRect;
  computedStyle: Record<string, string>;
  source?: CliteSourceLocation | undefined;
  ancestorSources: CliteSourceLocation[];
  outerHTMLPreview: string;
}

export interface CliteNetworkEntry {
  kind: "fetch" | "xhr";
  method: string;
  url: string;
  status?: number | undefined;
  statusText?: string | undefined;
  ok?: boolean | undefined;
  durationMs: number;
  startedAt: string;
  endedAt?: string | undefined;
  requestHeaders?: Record<string, string> | undefined;
  responseHeaders?: Record<string, string> | undefined;
  requestBodyPreview?: string | undefined;
  responseBodyPreview?: string | undefined;
  error?: string | undefined;
}

export interface CliteStorageSnapshot {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export interface ClitePerformanceSnapshot {
  navigation?: Record<string, number | string> | undefined;
  resources: Array<{
    name: string;
    initiatorType: string;
    duration: number;
    transferSize?: number;
    encodedBodySize?: number;
    decodedBodySize?: number;
  }>;
}

export interface ClitePacket {
  schemaVersion: 1;
  generatedAt: string;
  app?: CliteAppInfo | undefined;
  page: {
    url: string;
    title: string;
    referrer: string;
    viewport: {
      width: number;
      height: number;
      devicePixelRatio: number;
    };
    userAgent: string;
    language: string;
    timezone: string;
  };
  developerNote?: string | undefined;
  selectedTarget?: CliteTargetContext | undefined;
  events: CliteEvent[];
  recentNetwork: CliteNetworkEntry[];
  recentConsole: CliteEvent[];
  recentErrors: CliteEvent[];
  storage?: CliteStorageSnapshot | undefined;
  performance?: ClitePerformanceSnapshot | undefined;
  customContext: Record<string, unknown>;
}

export interface CliteAppInfo {
  name?: string | undefined;
  version?: string | undefined;
  environment?: string | undefined;
  commit?: string | undefined;
}

export interface CliteRedactionOptions {
  replacement?: string | undefined;
  keys?: string[] | undefined;
  patterns?: RegExp[] | undefined;
  urlParams?: string[] | undefined;
}

export interface CliteResolvedRedactionOptions {
  replacement: string;
  keys: string[];
  patterns: RegExp[];
  urlParams: string[];
}

export interface CliteCaptureOptions {
  fetch?: boolean | undefined;
  xhr?: boolean | undefined;
  console?: boolean | undefined;
  errors?: boolean | undefined;
  clicks?: boolean | undefined;
  inputs?: boolean | undefined;
  route?: boolean | undefined;
  storage?: boolean | undefined;
  performance?: boolean | undefined;
}

export interface CliteUiOptions {
  zIndex?: number | undefined;
  startOpen?: boolean | undefined;
  shortcuts?: boolean | undefined;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | undefined;
}

export interface CliteSourceOptions {
  attributePrefix?: string | undefined;
  openInEditorUrl?: ((source: CliteSourceLocation) => string | undefined) | undefined;
}

export interface CliteOptions {
  enabled?: boolean | undefined;
  app?: CliteAppInfo | undefined;
  maxEvents?: number | undefined;
  maxNetworkEntries?: number | undefined;
  maxConsoleEntries?: number | undefined;
  maxBodyBytes?: number | undefined;
  redaction?: CliteRedactionOptions | undefined;
  capture?: CliteCaptureOptions | undefined;
  ui?: CliteUiOptions | undefined;
  source?: CliteSourceOptions | undefined;
  target?: Document | ShadowRoot | undefined;
}

export interface CliteController {
  start(): void;
  stop(): void;
  destroy(): void;
  open(): void;
  close(): void;
  inspect(): void;
  setDeveloperNote(note: string): void;
  selectElement(element: Element): CliteTargetContext;
  capturePacket(note?: string): ClitePacket;
  copyMarkdown(note?: string): Promise<void>;
  copyJson(note?: string): Promise<void>;
  downloadJson(note?: string): void;
  addContext(key: string, value: unknown): void;
  mark(name: string, data?: unknown): void;
  getEvents(): CliteEvent[];
}

export interface CliteInternals {
  options: RequiredCliteOptions;
  emit<TData = unknown>(event: Omit<CliteEvent<TData>, "id" | "timestamp"> & { timestamp?: string }): CliteEvent<TData>;
  updateEvent(id: string, patch: Partial<CliteEvent>): void;
  getEvents(): CliteEvent[];
  getNetworkEvents(): CliteEvent<CliteNetworkEntry>[];
}

export interface RequiredCliteOptions {
  enabled: boolean;
  app: CliteAppInfo;
  maxEvents: number;
  maxNetworkEntries: number;
  maxConsoleEntries: number;
  maxBodyBytes: number;
  redaction: CliteResolvedRedactionOptions;
  capture: Required<CliteCaptureOptions>;
  ui: Required<CliteUiOptions>;
  source: Required<CliteSourceOptions>;
  target: Document | ShadowRoot;
}

export type StopCapture = () => void;
