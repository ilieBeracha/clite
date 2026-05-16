import { describe, expect, it } from "vitest";
import { getCssSelector, getElementContext, getSourceFromElement } from "../src/dom";
import { testOptions } from "./test-options";

describe("DOM context", () => {
  it("builds stable selectors and source metadata", () => {
    document.body.innerHTML = `
      <main>
        <section data-clite-component="Panel" data-clite-source="/src/Panel.tsx" data-clite-line="12">
          <button id="save" class="primary action" aria-label="Save changes">Save</button>
        </section>
      </main>
    `;
    const button = document.querySelector("button");
    expect(button).toBeTruthy();

    const context = getElementContext(button!, testOptions());

    expect(getCssSelector(button!)).toBe("button#save");
    expect(context.accessibleName).toBe("Save changes");
    expect(context.source).toEqual({
      component: "Panel",
      file: "/src/Panel.tsx",
      line: 12,
      column: undefined,
      owner: undefined
    });
    expect(getSourceFromElement(button!.parentElement!, testOptions())?.component).toBe("Panel");
  });

  it("redacts sensitive attributes", () => {
    document.body.innerHTML = `<input name="password" value="secret" data-testid="password-input" />`;
    const input = document.querySelector("input");

    const context = getElementContext(input!, testOptions());

    expect(context.attributes.value).toBe("[REDACTED]");
  });
});
