import { createRequire } from "node:module";
import { transformSync } from "@babel/core";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const cliteBabelPlugin = require("../babel/index.cjs");

describe("clite babel plugin", () => {
  it("adds source attributes to JSX elements", () => {
    const result = transformSync("export function App(){ return <Button>Save</Button>; }", {
      filename: "/repo/src/App.tsx",
      parserOpts: {
        plugins: ["jsx", "typescript"]
      },
      plugins: [cliteBabelPlugin],
      configFile: false,
      babelrc: false
    });

    expect(result?.code).toContain('data-clite-component="Button"');
    expect(result?.code).toContain('data-clite-source="/repo/src/App.tsx"');
    expect(result?.code).toContain("data-clite-line");
  });
});
