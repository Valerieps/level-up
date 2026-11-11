# ADR-008: Each member's data is private, in the one Group object

**Status:** Accepted
**Date:** 2026-11-11
**Decision:** LevelUp keeps the template's single `Group` Durable Object (ADR-004) for members,
invites and sessions, and adds every habit, completion, progress, achievement, reward and pause
table to the same object, each row carrying `member_id`. Every query and command on that data takes
the member from the session (`actor.id`) and filters by it; no input field ever names a member.
Topics for live updates are scoped to the member: the object sends a change only to that member's
own sockets. Only admins may read the member list (`listMembers` returns `null` for a member).
**Why:** The owner chose an invite-only app where each person keeps private habits and nobody sees
anybody else's data (`docs/spec/acesso-e-membros.md`). The group is small (a handful of invited
people), so one object holds everyone comfortably, keeps one migration path and keeps the
invite logic the template already tests. Scoping by the session's member is a rule the tests can
check on every use case.
**Alternatives:** One Durable Object per member (`idFromName(memberId)`): stronger isolation, but
sign-in, invites and the cron would have to fan out across objects, and the future social features
(posts between members) would need cross-object calls. Worth revisiting if the group grows past a
few dozen people or if one object nears the Workers Free CPU limit.
