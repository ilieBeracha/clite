# Privacy

Clite is intended for local development and staging environments. Do not enable it in production bundles.

## Default Redaction

Clite redacts:

- `Authorization`, `Cookie`, `Set-Cookie`, `x-api-key`, and similar headers.
- Keys containing `password`, `secret`, `token`, `session`, `csrf`, `api_key`, and related names.
- URL parameters such as `token`, `access_token`, `refresh_token`, `id_token`, `api_key`, `password`, `secret`, `code`, and `state`.
- Bearer and Basic auth strings.

## Project Rules

Add domain-specific rules:

```ts
createClite({
  redaction: {
    keys: ["tenantSigningSecret", "stripeSecret"],
    urlParams: ["signed_url"],
    patterns: [/customer-private-[a-z0-9]+/gi]
  }
});
```

## Boundaries

Clite can redact known fields and patterns, but it cannot infer every possible secret embedded inside free-form text. Review packets before pasting them into external tools.

Clite does not upload data. Packet movement happens only through user-triggered copy or download actions.
