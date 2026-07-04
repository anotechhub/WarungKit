# Skill: security-review

## Purpose
Validate that WarungKit has no secret leakage, safe CORS/RLS configuration, and masked logging before any public deployment or demo rehearsal.

## When to Use
- Before every public deployment.
- Before every rehearsal and before the live webinar session.
- After any change touching secrets, CORS, RLS policies, or logging.

## Required Inputs
- Full environment variable list, split into secrets vs. backend config vs. frontend-public config.
- Current CORS `ALLOWED_ORIGINS` value.
- Current RLS policies for all Supabase tables.
- Recent git history (to scan for accidentally committed secrets).

## Implementation Workflow
1. Scan git history and working tree for committed secrets or credential-shaped strings.
2. Confirm `.gitignore` excludes `.env*`, `.dev.vars`, `.wrangler`, `.supabase`, and any local credential files.
3. Review CORS configuration — confirm it is an explicit allowlist with no wildcard.
4. Review RLS policies on every table — confirm no permissive anonymous policy exists on `orders`, `payment_events`, or `checkout_idempotency`.
5. Review logs (sample requests) — confirm PII is masked and no full payment payloads or secrets appear.
6. Run a dependency audit and note any high/critical vulnerabilities.
7. Walk through the live-demo security checklist immediately before rehearsal and before the live session.

## Non-Negotiable Rules
- No secret ever appears in code, logs, screenshots, documentation, or git history.
- CORS allowlist is explicit — no wildcard origin in any environment used for the demo.
- RLS is reviewed and confirmed active on every table before each deployment.
- Logs never contain secrets, full payment payloads, or unmasked PII.
- Any finding blocking the non-negotiable rules above must be fixed before proceeding to rehearsal or live demo.

## Completion Checklist
- [ ] Secret scan of git history and working tree is clean.
- [ ] `.gitignore` confirmed to exclude all sensitive file patterns.
- [ ] CORS allowlist reviewed — no wildcard.
- [ ] RLS reviewed on all tables — no permissive anonymous access to sensitive data.
- [ ] Sample logs reviewed — PII masked, no secrets or raw payment payloads present.
- [ ] Dependency audit run with no unresolved critical vulnerabilities.

## Expected Verification
- `git log -p | grep`-style scan (or equivalent secret-scanning tool) — no matches.
- `pnpm audit` (or equivalent) — no unresolved critical/high vulnerabilities.
- Manual RLS test: anonymous client denied access to sensitive tables.
- Manual log sample review confirming masking behavior.
