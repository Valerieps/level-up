# ADR-009: The day follows each member's device time zone

**Status:** Accepted
**Date:** 2026-11-11
**Decision:** Each member has a `day_turnover` (minutes after midnight, default 0) and a `time_zone`
(IANA name, such as `America/Sao_Paulo`). The app reads the device's zone with
`Intl.DateTimeFormat().resolvedOptions().timeZone` and sends it in the body of every command; the
server stores it on the member when it changes. A pure domain function,
`dayOf(instant, timeZone, turnoverMinutes)` in `src/domain/`, turns an instant into the member's
day (`YYYY-MM-DD`); every rule that says "hoje" uses it, on the app and on the server. The cron
(ADR-004, every 5 minutes) runs the day turnover (UC-80) for each member whose current day differs
from the last day closed for them, in their stored zone.
**Why:** The owner wants "hoje" to follow the device, including when she travels
(`docs/spec/registrar-o-dia.md`). Cron runs in UTC and members may be in different zones, so the
day must be computed per member, from data the server keeps. Sending the zone with each command
keeps it current without a separate setting.
**Alternatives:** A fixed zone for the whole app (`America/Sao_Paulo`): simpler, but a trip abroad
would close the day at the wrong local hour. A zone chosen in Configurações: one more setting the
owner did not ask for.
