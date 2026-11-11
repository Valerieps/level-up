import { useEffect, useState } from 'react';
import { dayOf, DEFAULT_DAY_TURNOVER, deviceTimeZone, type Day } from '../domain/day';
import { useServices } from './backend-context';
import { useQuery } from './use-query';

const RECHECK_MS = 60_000;

/**
 * The member's "hoje" (ADR-009): the device's zone and the member's turnover. It changes on its
 * own when the day turns, while the app stays open, and when the turnover setting changes.
 */
export function useToday(): Day {
  const settings = useQuery('settings', {}, ['settings']);
  const turnover = settings.data?.dayTurnover ?? DEFAULT_DAY_TURNOVER;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), RECHECK_MS);
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return dayOf(now, deviceTimeZone(), turnover);
}

/**
 * Tells the server the device's zone when it differs from the stored one: the zone travels with
 * every command, and this sends an empty one when the member has not acted yet (a trip, a new
 * phone), so the server's day turnover runs at the right local hour.
 */
export function useTimeZoneSync(): void {
  const { backend } = useServices();
  const settings = useQuery('settings', {}, ['settings']);
  const stored = settings.data?.timeZone;

  useEffect(() => {
    if (stored !== undefined && stored !== deviceTimeZone()) void backend.command('settings.update', {});
  }, [backend, stored]);
}
