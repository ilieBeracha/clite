import { describe, expect, it } from "vitest";
import { createRedactionOptions, redactHeaders, redactValue, safeJson, truncate } from "../src/redact";

describe("redaction", () => {
  it("redacts sensitive nested fields and bearer tokens", () => {
    const options = createRedactionOptions(undefined);
    const value = redactValue(
      {
        user: "maya",
        password: "secret",
        nested: {
          token: "abc",
          header: "Bearer verysecretvalue"
        }
      },
      options
    );

    expect(value).toEqual({
      user: "maya",
      password: "[REDACTED]",
      nested: {
        token: "[REDACTED]",
        header: "[REDACTED]"
      }
    });
  });

  it("redacts url parameters and sensitive headers", () => {
    const options = createRedactionOptions(undefined);

    expect(redactValue("/callback?code=123&name=ok", options)).toBe("/callback?code=%5BREDACTED%5D&name=ok");
    expect(redactHeaders({ Authorization: "Bearer abc", Accept: "application/json" }, options)).toEqual({
      Authorization: "[REDACTED]",
      Accept: "application/json"
    });
  });

  it("truncates by encoded byte size", () => {
    expect(truncate("abcdef", 3)).toBe("abc... [truncated]");
  });

  it("serializes repeated references without labeling them circular", () => {
    const shared = { id: "shared" };
    const actualCircular: { child?: unknown } = {};
    actualCircular.child = actualCircular;

    const json = safeJson({ first: shared, second: shared, actualCircular });

    expect(json).toContain('"second": {\n    "id": "shared"\n  }');
    expect(json).toContain('"child": "[Circular]"');
  });
});
