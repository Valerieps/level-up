# ADR-011: Pauses and archived stretches freeze a computed streak

**Status:** Accepted
**Date:** 2026-11-11
**Decision:** The streak, Ritmo, Última vez and "Faz tempo" are never stored: pure functions in
`src/domain/habits/consistency.ts` compute them from the done days in `completions`, the periods
in `pauses` and two columns of `habits`. One table, `pauses`, holds both a pause (`kind = 'pause'`,
`habit_id` null for the whole app) and the time a habit spent archived (`kind = 'archive'`), because
the spec freezes the streak the same way in both. A period covers from `from_day` up to the day
before `until_day` (the return date) or up to `ended_on` inclusive (the day of "Voltar" or of
reactivating), as `src/domain/habits/pause.ts` says; a pause that reached its return date needs no
write. The streak counts back from today to `tier_started_on`; a change of régua resets that window,
so before the change `resizeHabit` stores the streak reached up to yesterday in
`habits.streak_carry`, and the count adds it back when the new window is unbroken. A new time rule
sets the carry to 0, which restarts the streak.
**Why:** `docs/ARQUITETURA.md` keeps derived numbers derived, so undoing a completion or ending a
pause early needs no repair. The history keeps only the current size of a habit, so without the
carry a régua change of the weekdays would judge old days by the new days; the owner decided the
streak goes on through a régua change (`docs/spec/streak-e-dominio.md`).
**Alternatives:** A stored streak updated by every mark, unmark and day turnover: one more number
to keep right in every command and in the cron. A history of every size the habit had
(`habit_tiers`, phase 1c), to judge each old day by its own size: more than the streak needs, and
`habit_tiers` arrives with domínio anyway. A separate table for archived stretches: the same rule
twice.
