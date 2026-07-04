# Skill: backend-api

## Purpose
Build and modify Hono routes in `apps/api` with strict layering, validation, and safe error handling.

## When to Use
- Creating or modifying any route, service, or repository in `apps/api`.
- Adding request validation, middleware, CORS rules, or error handling.

## Required Inputs
- Shared Zod schemas from `packages/contracts` for request/response shapes.
- Current `ALLOWED_ORIGINS` value and environment variable list.
- API contract for the endpoint being built (method, route, purpose, trust boundary).

## Implementation Workflow
1. Define or reuse a Zod schema in `packages/contracts` for the request body/response.
2. Add the route handler in a `routes/` module — handler only orchestrates, no business logic inline.
3. Put business logic in a `services/` module; put all database access in a `repositories/` module.
4. Validate all input with the Zod schema before touching the database or any external API.
5. Apply CORS middleware restricted to `ALLOWED_ORIGINS` — never a wildcard.
6. Generate a request ID at entry and include it in logs and error responses.
7. Return safe, generic error messages to the client; keep technical detail only in server-side logs.

## Non-Negotiable Rules
- Strict separation: route → service → repository. No direct database queries in route handlers.
- Every input is validated independently at the backend, regardless of frontend validation.
- Product prices are always resolved from the database — never accepted from the request body.
- CORS allowlist is explicit; no permissive/wildcard origin in any environment.
- Error responses never leak stack traces, internal paths, or raw database errors to the client.
- No secrets in code, logs, or committed configuration.
- Every new endpoint ships with tests before being considered complete.

## Completion Checklist
- [ ] Zod schema exists and is enforced for all input.
- [ ] Route/service/repository separation is respected.
- [ ] CORS restricted to configured allowlist.
- [ ] Request ID present in logs and error responses.
- [ ] Error responses are safe and generic; no internal detail leaked.
- [ ] Tests cover success and at least one validation-failure case.

## Expected Verification
- `pnpm --filter api lint`
- `pnpm --filter api typecheck`
- `pnpm --filter api test`
- `pnpm --filter api build`
