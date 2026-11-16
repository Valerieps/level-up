# ADR-013: The cron runs in the central `cron-central` Worker

**Status:** Accepted
**Date:** 2026-11-16
**Decision:** `level-up` has no `triggers.crons` and no `scheduled()` handler. The Worker `cron-central`
(shared by all of the owner's apps) holds the only cron trigger and, every 15 minutes, calls
`Cron.tick()` on this Worker through a service binding (`entrypoint: "Cron"`).
`Cron` and `runCron` live in `server/entry/worker.ts`; `tick()` runs `Group.tick()`, where each job
decides whether it is due.
**Why:** Workers Free limits the account's cron triggers, and one trigger per app does not fit. One
central cron frees the slots. The 15-minute cadence is enough: the day turnover (ADR-009) and the
session cleanup do not need 5-minute precision.
**Alternatives:** Keep a cron per app (runs out of slots on the Free plan); Workers Paid (cost for a
limit a shared Worker removes).
**Update of:** ADR-004 (time-based jobs).
