import type { PluginObj } from "@babel/core";

export interface CliteBabelPluginOptions {
  enabled?: boolean;
  includeNodeModules?: boolean;
  componentAttribute?: string;
  sourceAttribute?: string;
  lineAttribute?: string;
  columnAttribute?: string;
}

export default function cliteBabelPlugin(api: unknown, options?: CliteBabelPluginOptions): PluginObj;
