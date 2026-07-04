# Skill: demo-runbook

## Purpose
Manage checkpoint branches, rehearsal steps, and live-demo operational safety for the WarungKit webinar.

## When to Use
- Setting up or updating checkpoint branches (`demo-start`, `demo-payment`, `demo-final`, `demo-backup`).
- Preparing for or running a rehearsal.
- Preparing the live webinar session itself.

## Required Inputs
- Current state of the four checkpoint branches and what each is expected to demonstrate.
- Rehearsal timeline and live run sheet (see `docs/PROJECT_CHECKLIST.md`).
- Backup materials (screenshots/recordings) from the most recent successful rehearsal.

## Implementation Workflow
1. Confirm `demo-start` shows a working catalog and checkout form (dummy/controlled state acceptable).
2. Confirm `demo-payment` shows a real sandbox Mayar invoice created and a valid redirect.
3. Confirm `demo-final` shows the full webhook → server-side verification → paid transition, visible on the status page and in the Supabase dashboard.
4. Record or update `demo-backup` material only after a successful `demo-final` run.
5. Run a full dry run against the live run sheet timing before the actual session.
6. Immediately before the live session, re-verify the security checklist and confirm no unrehearsed code changes are pending.

## Non-Negotiable Rules
- No code changes or deployments during the live webinar unless already rehearsed beforehand.
- Each checkpoint branch must build and run without error before being relied upon live.
- Backup material must reflect an actually successful run, not a hypothetical one.
- The presenter's browser profile must be free of personal credentials, notifications, or bookmarks before going live.
- Supabase dashboard shown live is for presenter observability only — never framed as a WarungKit product feature.

## Completion Checklist
- [ ] `demo-start`, `demo-payment`, `demo-final` branches build and run cleanly.
- [ ] `demo-backup` material captured from a real successful run.
- [ ] Full-length dry run completed against the run sheet timing.
- [ ] Security checklist re-verified immediately before the live session.
- [ ] Dedicated demo browser profile prepared with tabs pre-loaded and no personal data exposed.

## Expected Verification
- Each checkpoint branch: `pnpm build` succeeds after checkout.
- Dry run log noting actual time spent per segment vs. planned run sheet.
- Confirmation checklist completed within the hour before the live session.
