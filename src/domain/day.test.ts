import { describe, expect, it } from 'vitest';
import { addDays, dayOf, formatDayLong, isValidDayTurnover, isValidTimeZone } from './day';

const SP = 'America/Sao_Paulo';

describe('dayOf', () => {
  it('is the calendar day in the zone, with the default midnight turnover', () => {
    // 02:00 UTC is 23:00 of the day before in São Paulo (UTC-3).
    expect(dayOf(new Date('2026-11-12T02:00:00Z'), SP, 0)).toBe('2026-11-11');
    expect(dayOf(new Date('2026-11-12T03:00:00Z'), SP, 0)).toBe('2026-11-12');
  });

  it('keeps the small hours in the day before until the turnover', () => {
    // 03:59 local, turnover at 4h: still the 11th. 04:00 local: the 12th.
    expect(dayOf(new Date('2026-11-12T06:59:00Z'), SP, 240)).toBe('2026-11-11');
    expect(dayOf(new Date('2026-11-12T07:00:00Z'), SP, 240)).toBe('2026-11-12');
  });

  it('follows the zone of the device when the member travels', () => {
    const instant = new Date('2026-11-12T01:00:00Z');
    expect(dayOf(instant, SP, 0)).toBe('2026-11-11');
    expect(dayOf(instant, 'Europe/Lisbon', 0)).toBe('2026-11-12');
    expect(dayOf(instant, 'Asia/Tokyo', 0)).toBe('2026-11-12');
  });

  it('turns over across daylight-saving changes', () => {
    // New York leaves daylight saving on 2026-11-01 at 2:00 local.
    expect(dayOf(new Date('2026-11-01T03:30:00Z'), 'America/New_York', 0)).toBe('2026-10-31');
    expect(dayOf(new Date('2026-11-01T04:30:00Z'), 'America/New_York', 0)).toBe('2026-11-01');
  });
});

describe('addDays', () => {
  it('crosses months and years', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('validation', () => {
  it('accepts IANA zones only', () => {
    expect(isValidTimeZone(SP)).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone(42)).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });

  it('accepts a turnover in whole minutes within the day', () => {
    expect(isValidDayTurnover(0)).toBe(true);
    expect(isValidDayTurnover(240)).toBe(true);
    expect(isValidDayTurnover(1440)).toBe(false);
    expect(isValidDayTurnover(-1)).toBe(false);
    expect(isValidDayTurnover(1.5)).toBe(false);
    expect(isValidDayTurnover('240')).toBe(false);
  });
});

describe('formatDayLong', () => {
  it('says the weekday, day and month in Portuguese', () => {
    expect(formatDayLong('2026-11-11')).toBe('quarta-feira, 11 de novembro');
  });
});
